import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, PaymentMethod, CheckStatus } from '@prisma/client';
import * as XLSX from 'xlsx';
import {
  ConfirmFeeAllocationImportDto,
  ConfirmFeePaymentImportDto,
} from './dto/fee-import.dto';

export interface ImportErrorDetail {
  rowIndex: number;
  identifier: string;
  field?: string;
  message: string;
  rawData?: any;
}

@Injectable()
export class FeeImportService {
  private readonly logger = new Logger(FeeImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. Generate Empty Excel Template for Fee Allocation
  generateAllocationTemplateBuffer(): Buffer {
    const wb = XLSX.utils.book_new();
    const headers = [
      ['کد ملی دانش‌آموز', 'مبلغ شهریه (تومان)', 'مبلغ تخفیف (تومان)', 'علت تخفیف یا توضیحات'],
      ['0012345678', 36000000, 5000000, 'تخفیف ثبت‌نام زودهنگام'],
      ['0087654321', 36000000, 0, ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [{ wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'الگوی_تخصیص_شهریه');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // 2. Generate Empty Excel Template for Payments (Cash / Cheque)
  generatePaymentTemplateBuffer(): Buffer {
    const wb = XLSX.utils.book_new();
    const headers = [
      [
        'کد ملی دانش‌آموز',
        'نوع پرداخت (نقدی یا چک)',
        'مبلغ (تومان)',
        'تاریخ (مثلاً 1404/08/15 یا 2026-11-06)',
        'شماره چک',
        'کد صیادی ۱۶ رقمی',
        'نام بانک',
        'توضیحات',
      ],
      ['0012345678', 'نقدی', 5000000, '1404/07/15', '', '', '', 'پیش‌پرداخت نقد'],
      ['0087654321', 'چک', 10000000, '1404/09/20', '881234/5', '1234567890123456', 'بانک ملی', 'قسط اول'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 22 },
      { wch: 18 },
      { wch: 25 },
      { wch: 18 },
      { wch: 24 },
      { wch: 20 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'الگوی_ثبت_پرداخت_ها');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // 3. Preview Excel for Fee Allocation (Server-Side Validation)
  async previewAllocationExcel(
    tenantId: string,
    academicYearId: string,
    fileBuffer: Buffer,
    feePlanId?: string,
  ) {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rawData.length < 2) {
      throw new BadRequestException('فایل اکسل ارسالی خالی است یا سطر داده ندارد');
    }

    const errors: ImportErrorDetail[] = [];
    const validRows: any[] = [];

    // Pre-fetch all students in tenant for fast batch lookup
    const students = await this.prisma.studentProfile.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, nationalId: true, firstName: true, lastName: true } },
      },
    });

    const studentMap = new Map<string, typeof students[0]>();
    students.forEach((s) => {
      if (s.user?.nationalId) studentMap.set(s.user.nationalId.trim(), s);
      if (s.studentCode) studentMap.set(s.studentCode.trim(), s);
      if (s.nationalCode) studentMap.set(s.nationalCode.trim(), s);
    });

    // Pre-fetch existing contracts in this academic year to avoid duplicates
    const existingContracts = await this.prisma.studentFeeContract.findMany({
      where: { tenantId, academicYearId },
      select: { studentId: true },
    });
    const contractedStudentIds = new Set(existingContracts.map((c) => c.studentId));

    // Process each row (skip header)
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === '')) {
        continue; // skip empty rows
      }

      const rowIndex = i + 1;
      const rawIdentifier = String(row[0] || '').trim();
      const rawAmount = parseFloat(String(row[1] || '0').replace(/,/g, ''));
      const rawDiscount = parseFloat(String(row[2] || '0').replace(/,/g, ''));
      const notes = String(row[3] || '').trim();

      if (!rawIdentifier) {
        errors.push({ rowIndex, identifier: '', field: 'کد ملی', message: 'کد ملی یا شماره دانش‌آموزی خالی است' });
        continue;
      }

      const student = studentMap.get(rawIdentifier);
      if (!student) {
        errors.push({
          rowIndex,
          identifier: rawIdentifier,
          field: 'کد ملی',
          message: `دانش‌آموزی با شناسه "${rawIdentifier}" در این مدرسه یافت نشد`,
        });
        continue;
      }

      if (contractedStudentIds.has(student.id)) {
        errors.push({
          rowIndex,
          identifier: rawIdentifier,
          field: 'قرارداد',
          message: `برای ${student.user.firstName} ${student.user.lastName} در این سال تحصیلی قبلاً قرارداد شهریه ثبت شده است`,
        });
        continue;
      }

      if (isNaN(rawAmount) || rawAmount <= 0) {
        errors.push({
          rowIndex,
          identifier: rawIdentifier,
          field: 'مبلغ شهریه',
          message: 'مبلغ شهریه نامعتبر است (باید عدد مثبت باشد)',
        });
        continue;
      }

      if (isNaN(rawDiscount) || rawDiscount < 0) {
        errors.push({
          rowIndex,
          identifier: rawIdentifier,
          field: 'مبلغ تخفیف',
          message: 'مبلغ تخفیف نمی‌تواند منفی باشد',
        });
        continue;
      }

      if (rawDiscount > rawAmount) {
        errors.push({
          rowIndex,
          identifier: rawIdentifier,
          field: 'مبلغ تخفیف',
          message: 'مبلغ تخفیف نمی‌تواند بیشتر از کل مبلغ شهریه باشد',
        });
        continue;
      }

      validRows.push({
        rowIndex,
        identifier: rawIdentifier,
        studentId: student.id,
        studentName: `${student.user.firstName} ${student.user.lastName}`,
        amount: rawAmount,
        discountAmount: rawDiscount,
        finalPayable: rawAmount - rawDiscount,
        notes: notes || undefined,
      });
    }

    return {
      totalRowsProcessed: rawData.length - 1,
      validCount: validRows.length,
      errorCount: errors.length,
      errors,
      validRows,
    };
  }

  // 4. Confirm Fee Allocation Import (Commit to DB)
  async confirmAllocationImport(
    tenantId: string,
    recordedById: string,
    dto: ConfirmFeeAllocationImportDto,
  ) {
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException('هیچ ردیف معتبری برای ثبت ارسال نشده است');
    }

    let planInstallments: any[] = [];
    if (dto.feePlanId) {
      const plan = await this.prisma.feePlan.findFirst({
        where: { id: dto.feePlanId, tenantId },
      });
      if (plan && Array.isArray(plan.installmentConfig)) {
        planInstallments = plan.installmentConfig;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let createdCount = 0;

      for (const row of dto.rows) {
        // Look up student
        const student = await tx.studentProfile.findFirst({
          where: {
            tenantId,
            OR: [
              { user: { nationalId: row.identifier } },
              { studentCode: row.identifier },
              { nationalCode: row.identifier },
            ],
          },
        });

        if (!student) continue;

        // Ensure unique per student/year
        const existing = await tx.studentFeeContract.findUnique({
          where: {
            tenantId_academicYearId_studentId: {
              tenantId,
              academicYearId: dto.academicYearId,
              studentId: student.id,
            },
          },
        });
        if (existing) continue;

        const totalAmt = new Prisma.Decimal(row.amount);
        const discountAmt = new Prisma.Decimal(row.discountAmount || 0);
        const finalAmt = totalAmt.minus(discountAmt);
        const contractNumber = `FEE-IMP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const contract = await tx.studentFeeContract.create({
          data: {
            tenantId,
            academicYearId: dto.academicYearId,
            studentId: student.id,
            contractNumber,
            totalAmount: totalAmt,
            discountAmount: discountAmt,
            finalPayableAmount: finalAmt,
            balanceRemaining: finalAmt,
            discountReason: row.notes,
            feePlanId: dto.feePlanId,
            isIndividual: !dto.feePlanId,
            status: 'ACTIVE',
          },
        });

        // Generate Installments
        if (planInstallments.length > 0) {
          for (const item of planInstallments) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + (item.dueMonthOffset || 0));
            const percent = (item.percentOrAmount || (100 / planInstallments.length)) / 100;
            const instAmt = finalAmt.times(percent);

            await tx.feeInstallment.create({
              data: {
                tenantId,
                contractId: contract.id,
                installmentNumber: item.number || 1,
                title: item.title || `قسط شماره ${item.number}`,
                dueDate,
                amount: instAmt,
                paidAmount: new Prisma.Decimal(0),
                status: 'UNPAID',
              },
            });
          }
        } else {
          // Default single lump sum installment
          await tx.feeInstallment.create({
            data: {
              tenantId,
              contractId: contract.id,
              installmentNumber: 1,
              title: 'کل مبلغ مصوب شهریه',
              dueDate: new Date(Date.now() + 30 * 86400000),
              amount: finalAmt,
              paidAmount: new Prisma.Decimal(0),
              status: 'UNPAID',
            },
          });
        }

        createdCount++;
      }

      return {
        success: true,
        message: `تعداد ${createdCount} قرارداد شهریه با موفقیت ایجاد شد`,
        createdCount,
      };
    });
  }

  // 5. Preview Excel for Payments (Cash / Cheque Validation & Double-Entry Check)
  async previewPaymentExcel(tenantId: string, fileBuffer: Buffer) {
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rawData.length < 2) {
      throw new BadRequestException('فایل اکسل ارسالی خالی است');
    }

    const errors: ImportErrorDetail[] = [];
    const validRows: any[] = [];

    // Pre-fetch active contracts with student details
    const contracts = await this.prisma.studentFeeContract.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        student: {
          include: {
            user: { select: { id: true, nationalId: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const contractMap = new Map<string, typeof contracts[0]>();
    contracts.forEach((c) => {
      if (c.student?.user?.nationalId) contractMap.set(c.student.user.nationalId.trim(), c);
      if (c.student?.studentCode) contractMap.set(c.student.studentCode.trim(), c);
      if (c.student?.nationalCode) contractMap.set(c.student.nationalCode.trim(), c);
    });

    // Pre-fetch existing cheques to prevent duplicates
    const existingCheques = await this.prisma.feePayment.findMany({
      where: { tenantId, method: PaymentMethod.CHEQUE },
      select: { checkSayadId: true, checkNumber: true },
    });
    const existingSayadSet = new Set(existingCheques.map((c) => c.checkSayadId).filter(Boolean));

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0 || row.every((c: any) => c === undefined || c === '')) {
        continue;
      }

      const rowIndex = i + 1;
      const rawIdentifier = String(row[0] || '').trim();
      const rawMethodStr = String(row[1] || '').trim().toLowerCase();
      const rawAmount = parseFloat(String(row[2] || '0').replace(/,/g, ''));
      const rawDate = String(row[3] || '').trim();
      const checkNumber = String(row[4] || '').trim();
      const checkSayadId = String(row[5] || '').trim().replace(/[^0-9]/g, '');
      const bankName = String(row[6] || '').trim();
      const notes = String(row[7] || '').trim();

      if (!rawIdentifier) {
        errors.push({ rowIndex, identifier: '', field: 'کد ملی', message: 'کد ملی الزامی است' });
        continue;
      }

      const contract = contractMap.get(rawIdentifier);
      if (!contract) {
        errors.push({
          rowIndex,
          identifier: rawIdentifier,
          field: 'قرارداد',
          message: `قرارداد شهریه فعالی برای شناسه "${rawIdentifier}" یافت نشد`,
        });
        continue;
      }

      if (isNaN(rawAmount) || rawAmount <= 0) {
        errors.push({ rowIndex, identifier: rawIdentifier, field: 'مبلغ', message: 'مبلغ پرداختی باید مثبت باشد' });
        continue;
      }

      const isCheque = rawMethodStr.includes('چک') || rawMethodStr === 'cheque' || rawMethodStr === 'check';
      const isCash = rawMethodStr.includes('نقد') || rawMethodStr === 'cash';

      if (!isCheque && !isCash) {
        errors.push({
          rowIndex,
          identifier: rawIdentifier,
          field: 'نوع پرداخت',
          message: 'نوع پرداخت باید "نقدی" یا "چک" باشد',
        });
        continue;
      }

      if (isCheque) {
        if (!checkSayadId || checkSayadId.length !== 16) {
          errors.push({
            rowIndex,
            identifier: rawIdentifier,
            field: 'کد صیادی',
            message: `کد صیادی چک باید دقیقاً ۱۶ رقم باشد (داده دریافتی: ${checkSayadId})`,
          });
          continue;
        }

        if (existingSayadSet.has(checkSayadId)) {
          errors.push({
            rowIndex,
            identifier: rawIdentifier,
            field: 'کد صیادی تکراری',
            message: `چک با کد صیادی ${checkSayadId} قبلاً در سامانه ثبت گردیده است (هشدار ثبت مضاعف)`,
          });
          continue;
        }
      }

      validRows.push({
        rowIndex,
        identifier: rawIdentifier,
        contractId: contract.id,
        studentName: `${contract.student?.user?.firstName || ''} ${contract.student?.user?.lastName || ''}`,
        method: isCheque ? PaymentMethod.CHEQUE : PaymentMethod.CASH,
        amount: rawAmount,
        date: rawDate,
        checkNumber: checkNumber || undefined,
        checkSayadId: checkSayadId || undefined,
        bankName: bankName || undefined,
        notes: notes || undefined,
      });
    }

    return {
      totalRowsProcessed: rawData.length - 1,
      validCount: validRows.length,
      errorCount: errors.length,
      errors,
      validRows,
    };
  }

  // 6. Confirm Payments Import
  async confirmPaymentImport(
    tenantId: string,
    recordedById: string,
    dto: ConfirmFeePaymentImportDto,
  ) {
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException('هیچ ردیف معتبری برای ثبت پرداخت ارسال نشده است');
    }

    return this.prisma.$transaction(async (tx) => {
      let registeredCount = 0;

      for (const row of dto.rows) {
        const student = await tx.studentProfile.findFirst({
          where: {
            tenantId,
            OR: [
              { user: { nationalId: row.identifier } },
              { studentCode: row.identifier },
              { nationalCode: row.identifier },
            ],
          },
          include: { user: true },
        });
        if (!student) continue;

        const contract = await tx.studentFeeContract.findFirst({
          where: { tenantId, studentId: student.id, status: 'ACTIVE' },
        });
        if (!contract) continue;

        const payAmt = new Prisma.Decimal(row.amount);

        if (row.method === PaymentMethod.CASH || row.method === 'نقدی') {
          // Cash reduces balance
          const payment = await tx.feePayment.create({
            data: {
              tenantId,
              feeContractId: contract.id,
              method: PaymentMethod.CASH,
              amount: payAmt,
              cashReceivedAt: new Date(),
              recordedById,
              note: row.notes,
            },
          });

          const currentBal = new Prisma.Decimal(contract.balanceRemaining);
          const newBal = currentBal.minus(payAmt);
          const finalBal = newBal.lessThan(0) ? new Prisma.Decimal(0) : newBal;

          await tx.studentFeeContract.update({
            where: { id: contract.id },
            data: {
              balanceRemaining: finalBal,
              status: finalBal.equals(0) ? 'COMPLETED' : contract.status,
            },
          });

          await tx.feeReceipt.create({
            data: {
              tenantId,
              contractId: contract.id,
              paymentId: payment.id,
              receiptNumber: `REC-CSH-IMP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
              amount: payAmt,
              payerName: student.user ? `${student.user.firstName} ${student.user.lastName}` : 'ولی دانش‌آموز',
              paymentMethod: PaymentMethod.CASH,
              issuedById: recordedById,
            },
          });
        } else {
          // Cheque stays PENDING, does NOT reduce balance
          await tx.feePayment.create({
            data: {
              tenantId,
              feeContractId: contract.id,
              method: PaymentMethod.CHEQUE,
              amount: payAmt,
              checkNumber: row.checkNumber || 'چک ایمپورت',
              checkSayadId: row.checkSayadId,
              bankName: row.bankName || 'بانک نامشخص',
              checkDueDate: new Date(Date.now() + 60 * 86400000), // default ~2 months or parsed
              checkStatus: CheckStatus.PENDING,
              recordedById,
              note: row.notes,
            },
          });
        }

        registeredCount++;
      }

      return {
        success: true,
        message: `تعداد ${registeredCount} پرداخت (نقدی/چک) با موفقیت در سیستم ثبت گردید`,
        registeredCount,
      };
    });
  }
}
