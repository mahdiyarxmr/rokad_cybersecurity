import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { PERSIAN_MONTH_NAMES, toPersianDigits } from '../../common/utils/jalali.util';

@Injectable()
export class PayrollExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * تولید فایل اکسل جامع کارکرد و حقوق ماهانه مدرسین
   */
  async generateMonthlyExcel(tenantId: string, year: number, month: number): Promise<Buffer> {
    const slips = await this.prisma.payrollSlip.findMany({
      where: { tenantId, year, month },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            nationalId: true,
            phone: true,
            staffPayrollProfile: true,
          },
        },
        editedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const monthName = PERSIAN_MONTH_NAMES[month - 1] || `${month}`;

    const rows = slips.map((slip, index) => {
      const u = slip.user;
      const statusMap: Record<string, string> = {
        DRAFT: 'پیش‌نویس اولیه',
        REVIEWED: 'بازبینی‌شده',
        ISSUED: 'صادرشده (قطعی)',
        SETTLED: 'تسویه بانکی',
        PAID: 'پرداخت‌شده',
        CANCELLED: 'باطل‌شده',
      };

      return {
        'ردیف': index + 1,
        'شماره فیش': slip.slipNumber,
        'نام و نام خانوادگی': `${u.firstName} ${u.lastName}`.trim(),
        'کد ملی': u.nationalId || '-',
        'شماره تماس': u.phone || '-',
        'تعداد جلسات': slip.sourceSessionCount,
        'ساعت کارکرد': slip.sourceHours ? Number(slip.sourceHours) : '-',
        'محاسبه سیستم (تومان)': Number(slip.calculatedAmount),
        'مبلغ نهایی مصوب (تومان)': Number(slip.finalAmount),
        'تفاوت/تعدیل (تومان)': Number(slip.finalAmount) - Number(slip.calculatedAmount),
        'دلیل ویرایش نهایی': slip.editReason || '-',
        'ویرایش‌کننده': slip.editedBy ? `${slip.editedBy.firstName} ${slip.editedBy.lastName}` : '-',
        'هشدار سقف ساعت': slip.hasCapWarning ? (slip.capWarningDetails || 'بله') : 'خیر',
        'وضعیت': statusMap[slip.status] || slip.status,
        'شماره حساب/شبا': u.staffPayrollProfile?.bankShebaNumber || u.staffPayrollProfile?.bankAccountNumber || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `حقوق ${monthName} ${year}`);

    // تولید بافر
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * تولید قالب HTML پرینت رسمی فیش حقوقی تکی (Print to PDF)
   */
  async generateSingleSlipHtml(tenantId: string, slipId: string): Promise<string> {
    const slip = await this.prisma.payrollSlip.findFirst({
      where: { id: slipId, tenantId },
      include: {
        tenant: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            nationalId: true,
            phone: true,
            staffPayrollProfile: true,
          },
        },
        items: true,
        editedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!slip) {
      throw new NotFoundException('فیش حقوقی مورد نظر یافت نشد');
    }

    const schoolName = slip.tenant.name || 'مدرسه هوشمند رکاد';
    const monthName = PERSIAN_MONTH_NAMES[slip.month - 1];
    const u = slip.user;

    const itemsHtml = slip.items
      .map(
        (it, idx) => `
        <tr>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${it.title}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${it.multiplierOrHours || '-'}</td>
          <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-family: monospace; font-weight: bold;">
            ${Number(it.amount).toLocaleString('fa-IR')} تومان
          </td>
        </tr>
      `,
      )
      .join('');

    return `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <title>فیش حقوقی ${u.firstName} ${u.lastName} - ${monthName} ${slip.year}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; margin-bottom: 4px; }
    .subtitle { font-size: 14px; color: #64748b; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
    .table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; text-align: right; }
    .totals { margin-right: auto; width: 320px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 40px; font-size: 14px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 13px; }
    .sig-box { width: 200px; border-top: 1px dashed #94a3b8; padding-top: 8px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; text-align: left;">
    <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-family: inherit; font-weight: bold;">
      🖨️ چاپ فیش حقوقی (PDF)
    </button>
  </div>

  <div class="header">
    <div class="title">${schoolName}</div>
    <div class="subtitle">فیش حقوق و دستمزد ماهانه — ${monthName} ماه سال ${toPersianDigits(slip.year)}</div>
    <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">شماره فیش: ${slip.slipNumber}</div>
  </div>

  <div class="info-grid">
    <div><strong>نام و نام خانوادگی:</strong> ${u.firstName} ${u.lastName}</div>
    <div><strong>کد ملی:</strong> ${u.nationalId ? toPersianDigits(u.nationalId) : '-'}</div>
    <div><strong>شماره تماس:</strong> ${u.phone ? toPersianDigits(u.phone) : '-'}</div>
    <div><strong>شماره شبا:</strong> ${u.staffPayrollProfile?.bankShebaNumber || '-'}</div>
    <div><strong>تعداد جلسات حضور:</strong> ${toPersianDigits(slip.sourceSessionCount)} جلسه</div>
    <div><strong>ساعات کارکرد:</strong> ${slip.sourceHours ? toPersianDigits(Number(slip.sourceHours)) + ' ساعت' : '-'}</div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">ردیف</th>
        <th>شرح ردیف حقوقی / مزایا / کسورات</th>
        <th style="width: 100px; text-align: center;">ضریب / ساعت</th>
        <th style="width: 150px; text-align: left;">مبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || '<tr><td colspan="4" style="text-align: center; padding: 15px;">هیچ ردیف تفکیکی ثبت نشده است</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>محاسبه سیستم:</span>
      <span style="font-weight: bold;">${Number(slip.calculatedAmount).toLocaleString('fa-IR')} تومان</span>
    </div>
    ${
      slip.editReason
        ? `
      <div class="totals-row" style="color: #d97706; font-size: 12px;">
        <span>علت تعدیل/ویرایش:</span>
        <span>${slip.editReason}</span>
      </div>
    `
        : ''
    }
    <div class="totals-row" style="border-top: 1px solid #cbd5e1; margin-top: 6px; padding-top: 8px; font-size: 15px; color: #0f172a; font-weight: bold;">
      <span>خالص پرداختی:</span>
      <span style="color: #16a34a;">${Number(slip.finalAmount).toLocaleString('fa-IR')} تومان</span>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">امضا و تایید امور مالی</div>
    <div class="sig-box">امضای مدیر مدرسه</div>
    <div class="sig-box">امضای دریافت‌کننده (مدرس)</div>
  </div>
</body>
</html>
    `;
  }
}
