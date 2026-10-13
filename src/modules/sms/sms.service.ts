import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as jalaali from 'jalaali-js';
import { PrismaService } from '../../prisma/prisma.service';
import { ISmsProvider, SmsSendResult } from './interfaces/sms-provider.interface';
import { SandboxSmsProvider } from './providers/sandbox-sms.provider';
import { KavenegarSmsProvider } from './providers/kavenegar-sms.provider';
import { AmootSmsProvider } from './providers/amoot-sms.provider';
import {
  SendManualSmsDto,
  ManualSmsTargetType,
  TargetRoleAudience,
  ClassAudienceType,
  UpsertSmsTemplateDto,
  CreateSmsQuickTemplateDto,
  UpdateSmsQuickTemplateDto,
} from './dto/send-manual-sms.dto';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private primaryProvider: ISmsProvider;
  private readonly fallbackProvider: ISmsProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly sandboxProvider: SandboxSmsProvider,
    private readonly kavenegarProvider: KavenegarSmsProvider,
    private readonly amootProvider: AmootSmsProvider,
  ) {
    const activeProviderName = (this.configService.get<string>('SMS_PROVIDER') || 'SANDBOX').toUpperCase();
    if (activeProviderName === 'AMOOT') {
      this.primaryProvider = this.amootProvider;
    } else if (activeProviderName === 'KAVENEGAR') {
      this.primaryProvider = this.kavenegarProvider;
    } else {
      this.primaryProvider = this.sandboxProvider;
    }
    this.fallbackProvider = this.sandboxProvider;
  }

  /**
   * Helper to normalize Iranian Sender Lines with +98 format
   * Examples:
   *   "09121234567" -> "+989121234567"
   *   "9121234567"  -> "+989121234567"
   *   "50001234"    -> "+9850001234"
   *   "02188889999" -> "+982188889999"
   *   "+9850001234" -> "+9850001234"
   */
  private normalizeIranianSenderLine(rawLine?: string): string {
    if (!rawLine) return '';
    let cleaned = rawLine.trim().replace(/[\s\-\(\)]/g, '');
    
    // Convert Persian / Arabic digits to English
    cleaned = cleaned.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
    cleaned = cleaned.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

    if (cleaned === '98' || cleaned === '+98' || cleaned === 'Public' || cleaned === 'Service') {
      return '98';
    }

    if (cleaned.startsWith('+98')) {
      return cleaned;
    }
    if (cleaned.startsWith('0098')) {
      return '+98' + cleaned.substring(4);
    }
    if (cleaned.startsWith('98') && cleaned.length > 8) {
      return '+' + cleaned;
    }
    if (cleaned.startsWith('0')) {
      return '+98' + cleaned.substring(1);
    }
    return '+98' + cleaned;
  }

  async getGatewayConfig(tenantId?: string) {
    let providerName = this.primaryProvider.name;
    let amootCreds = this.amootProvider.getCredentials();
    let kavenegarCreds = this.kavenegarProvider.getCredentials();

    if (tenantId) {
      const dbConfig = await this.prisma.smsGatewayConfig.findUnique({
        where: { tenantId },
      });
      if (dbConfig) {
        providerName = dbConfig.provider;
        amootCreds = {
          apiKey: dbConfig.amootApiKey || '',
          senderLine: dbConfig.amootSenderLine || '',
        };
        kavenegarCreds = {
          apiKey: dbConfig.kavenegarApiKey || '',
          senderLine: dbConfig.kavenegarSenderLine || '',
        };
      }
    }

    // Attempt to query live balance from Amoot if token is present
    let liveAccount: any = null;
    if (amootCreds.apiKey) {
      try {
        const liveStatus = await this.amootProvider.getAccountStatus();
        if (liveStatus.success) {
          liveAccount = liveStatus;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to fetch Amoot account status: ${err.message}`);
      }
    }

    return {
      provider: providerName,
      amoot: amootCreds,
      kavenegar: kavenegarCreds,
      liveAccount,
    };
  }

  async updateGatewayConfig(
    dto: {
      provider: 'AMOOT' | 'KAVENEGAR' | 'SANDBOX';
      amootApiKey?: string;
      amootSenderLine?: string;
      kavenegarApiKey?: string;
      kavenegarSenderLine?: string;
    },
    tenantId?: string,
  ) {
    const formattedAmootLine = dto.amootSenderLine !== undefined ? this.normalizeIranianSenderLine(dto.amootSenderLine) : undefined;
    const formattedKavenegarLine = dto.kavenegarSenderLine !== undefined ? this.normalizeIranianSenderLine(dto.kavenegarSenderLine) : undefined;

    if (dto.amootApiKey !== undefined) {
      this.amootProvider.updateCredentials(dto.amootApiKey, formattedAmootLine);
    }
    if (dto.kavenegarApiKey !== undefined) {
      this.kavenegarProvider.updateCredentials(dto.kavenegarApiKey, formattedKavenegarLine);
    }

    if (dto.provider === 'AMOOT') {
      this.primaryProvider = this.amootProvider;
    } else if (dto.provider === 'KAVENEGAR') {
      this.primaryProvider = this.kavenegarProvider;
    } else {
      this.primaryProvider = this.sandboxProvider;
    }

    // Persist permanently in Database with normalized +98 line
    if (tenantId) {
      await this.prisma.smsGatewayConfig.upsert({
        where: { tenantId },
        update: {
          provider: dto.provider,
          amootApiKey: dto.amootApiKey,
          amootSenderLine: formattedAmootLine,
          kavenegarApiKey: dto.kavenegarApiKey,
          kavenegarSenderLine: formattedKavenegarLine,
        },
        create: {
          tenantId,
          provider: dto.provider,
          amootApiKey: dto.amootApiKey,
          amootSenderLine: formattedAmootLine,
          kavenegarApiKey: dto.kavenegarApiKey,
          kavenegarSenderLine: formattedKavenegarLine,
        },
      });
    }

    this.logger.log(`Active SMS Provider updated & saved permanently: ${this.primaryProvider.name} (SenderLine: ${formattedAmootLine || 'N/A'})`);
    return {
      message: 'کلید وب‌سرویس و شماره خط فرستنده با پیش‌شماره ایران (۹۸+) با موفقیت در پایگاه‌داده ذخیره شد',
      activeProvider: this.primaryProvider.name,
      formattedSenderLine: formattedAmootLine,
    };
  }

  // ==========================================
  // Core Dispatcher
  // ==========================================
  async dispatchSms(to: string, message: string, tenantId?: string): Promise<SmsSendResult> {
    try {
      let activeProvider: ISmsProvider = this.primaryProvider;

      // If tenantId provided, check DB for tenant specific config & active provider
      if (tenantId) {
        const tenantConfig = await this.prisma.smsGatewayConfig.findUnique({
          where: { tenantId },
        });

        if (tenantConfig) {
          if (tenantConfig.provider === 'AMOOT') {
            if (tenantConfig.amootApiKey) {
              this.amootProvider.updateCredentials(
                tenantConfig.amootApiKey,
                tenantConfig.amootSenderLine || undefined,
              );
            }
            activeProvider = this.amootProvider;
          } else if (tenantConfig.provider === 'KAVENEGAR') {
            if (tenantConfig.kavenegarApiKey) {
              this.kavenegarProvider.updateCredentials(
                tenantConfig.kavenegarApiKey,
                tenantConfig.kavenegarSenderLine || undefined,
              );
            }
            activeProvider = this.kavenegarProvider;
          } else {
            activeProvider = this.sandboxProvider;
          }
        }
      }

      return await activeProvider.sendSingle({ to, message, tenantId });
    } catch (err: any) {
      this.logger.error(`Error in dispatchSms (${this.primaryProvider.name}): ${err.message}`);
      return {
        success: false,
        provider: this.primaryProvider.name,
        errorMessage: err.message || 'خطای غیرمنتظره در ارسال پیامک',
      };
    }
  }

  // Helper to record SMS Log
  private async recordLog(data: {
    tenantId: string;
    recipientPhone: string;
    recipientName?: string;
    recipientUserId?: string;
    type: any;
    message: string;
    provider: string;
    status: 'SENT' | 'FAILED' | 'DELIVERED' | 'QUEUED';
    errorMessage?: string;
    metadata?: any;
    senderId?: string;
  }) {
    try {
      let validSenderId: string | undefined = undefined;
      if (data.senderId) {
        const userExists = await this.prisma.user.findUnique({
          where: { id: data.senderId },
          select: { id: true },
        });
        if (userExists) {
          validSenderId = data.senderId;
        }
      }

      return await this.prisma.smsLog.create({
        data: {
          tenantId: data.tenantId,
          recipientPhone: data.recipientPhone,
          recipientName: data.recipientName,
          recipientUserId: data.recipientUserId,
          type: data.type,
          message: data.message,
          provider: data.provider,
          status: data.status,
          errorMessage: data.errorMessage,
          metadata: data.metadata || {},
          senderId: validSenderId,
        },
      });
    } catch (e: any) {
      this.logger.error(`Failed to save SMS log: ${e.message}`);
    }
  }

  /**
   * Helper to resolve all parent phone numbers for a student
   * Checks fatherPhone, motherPhone, and any ParentProfile links
   */
  resolveParentPhonesForStudent(studentProfile: any): Array<{ phone: string; name: string; userId?: string }> {
    const phones: Array<{ phone: string; name: string; userId?: string }> = [];
    const seen = new Set<string>();

    const addPhone = (rawPhone?: string | null, name?: string, userId?: string) => {
      if (!rawPhone) return;
      const cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '');
      if (cleaned.length >= 10 && !seen.has(cleaned)) {
        seen.add(cleaned);
        phones.push({ phone: cleaned, name: name || 'ولی محترم', userId });
      }
    };

    // 1. Father Phone from StudentProfile
    if (studentProfile.fatherPhone) {
      addPhone(
        studentProfile.fatherPhone,
        studentProfile.fatherFullName || `پدر ${studentProfile.user?.firstName || ''} ${studentProfile.user?.lastName || ''}`.trim() || 'پدر دانش‌آموز',
      );
    }

    // 2. Mother Phone from StudentProfile
    if (studentProfile.motherPhone) {
      addPhone(
        studentProfile.motherPhone,
        studentProfile.motherFullName || `مادر ${studentProfile.user?.firstName || ''} ${studentProfile.user?.lastName || ''}`.trim() || 'مادر دانش‌آموز',
      );
    }

    // 3. ParentLinks (if any parent accounts are linked)
    if (studentProfile.parentLinks && Array.isArray(studentProfile.parentLinks)) {
      for (const link of studentProfile.parentLinks) {
        const pUser = link.parent?.user;
        const pPhone = pUser?.phone || link.parent?.workPhone;
        if (pPhone) {
          addPhone(
            pPhone,
            `${pUser?.firstName || ''} ${pUser?.lastName || ''}`.trim() || 'ولی محترم',
            pUser?.id,
          );
        }
      }
    }

    return phones;
  }

  // =========================================================================
  // 1. AUTOMATED: Student Absence / Tardy SMS to Parents
  // =========================================================================
  @OnEvent('attendance.student_absence', { async: true })
  async handleStudentAbsence(event: {
    tenantId: string;
    studentId: string;
    date: string;
    periodNumber?: number;
    status: string;
    delayMinutes?: number;
  }) {
    this.logger.log(
      `Received attendance.student_absence event for student ${event.studentId} (${event.status}) on ${event.date}`,
    );

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { id: event.studentId },
      include: {
        user: true,
        parentLinks: {
          include: {
            parent: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!studentProfile) {
      this.logger.warn(`Student profile not found for absence SMS: ${event.studentId}`);
      return;
    }

    const studentName = `${studentProfile.user?.firstName || ''} ${studentProfile.user?.lastName || ''}`.trim() || 'فرزند شما';

    // Get active template or default
    const template = await this.prisma.smsTemplate.findFirst({
      where: { tenantId: event.tenantId, type: 'AUTO_ABSENCE' },
    });

    if (template && !template.isEnabled) {
      this.logger.log(`Absence SMS is disabled by tenant template configuration.`);
      return;
    }

    const statusText = event.status === 'ABSENT' ? 'غیبت در کلاس' : `تأخیر ورود (${event.delayMinutes || 0} دقیقه)`;
    const periodText = event.periodNumber ? `زنگ ${event.periodNumber}` : 'کل روز';

    let messageText =
      template?.body ||
      `ولی محترم؛ به اطلاع می‌رساند {نام_دانش‌آموز} در تاریخ {تاریخ} در {زنگ}، وضعیت «{وضعیت}» برای ایشان ثبت گردیده است.\nمدرسه رکاد`;

    messageText = messageText
      .replace(/{نام_دانش‌آموز}/g, studentName)
      .replace(/{نام}/g, studentName)
      .replace(/{تاریخ}/g, event.date)
      .replace(/{زنگ}/g, periodText)
      .replace(/{وضعیت}/g, statusText)
      .replace(/{تاخیر}/g, String(event.delayMinutes || 0));

    // Collect parent phone numbers using comprehensive resolution
    const parentPhones = this.resolveParentPhonesForStudent(studentProfile);

    // Fallback: If no parent linked or recorded, send to student phone if available
    if (parentPhones.length === 0 && studentProfile.user?.phone) {
      parentPhones.push({
        phone: studentProfile.user.phone,
        name: studentName,
        userId: studentProfile.user.id,
      });
    }

    // Deduplication check: Check if SMS for this student, this date, and this period has already been sent today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Send SMS to all parent phones
    for (const recipient of parentPhones) {
      const existingLog = await this.prisma.smsLog.findFirst({
        where: {
          tenantId: event.tenantId,
          recipientPhone: recipient.phone,
          type: 'AUTO_ABSENCE',
          sentAt: { gte: startOfToday },
          metadata: {
            path: ['studentId'],
            equals: event.studentId,
          },
        },
      });

      if (existingLog) {
        this.logger.log(`Absence SMS already sent today to ${recipient.phone} for student ${event.studentId}. Skipping duplicate.`);
        continue;
      }

      const result = await this.dispatchSms(recipient.phone, messageText, event.tenantId);
      await this.recordLog({
        tenantId: event.tenantId,
        recipientPhone: recipient.phone,
        recipientName: recipient.name,
        recipientUserId: recipient.userId,
        type: 'AUTO_ABSENCE',
        message: messageText,
        provider: result.provider,
        status: result.success ? 'SENT' : 'FAILED',
        errorMessage: result.errorMessage,
        metadata: {
          studentId: event.studentId,
          studentName,
          date: event.date,
          periodNumber: event.periodNumber,
          attendanceStatus: event.status,
          delayMinutes: event.delayMinutes,
        },
      });
    }
  }

  // =========================================================================
  // 2. AUTOMATED: Cheque Maturity & Due Date Reminder
  // =========================================================================
  async processChequeDueReminders(tenantId?: string): Promise<{ checkedCount: number; sentCount: number }> {
    this.logger.log(`Executing Cheque Due Date Reminder Job (Tenant: ${tenantId || 'ALL'})...`);

    const now = new Date();
    // Query cheques due in the next 3 days or today
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 4);

    const whereClause: any = {
      method: 'CHEQUE',
      checkStatus: 'PENDING',
      checkDueDate: {
        lte: threeDaysLater,
      },
    };

    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const pendingCheques = await this.prisma.feePayment.findMany({
      where: whereClause,
      include: {
        feeContract: {
          include: {
            student: {
              include: {
                user: true,
                parentLinks: {
                  include: {
                    parent: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    let sentCount = 0;

    for (const cheque of pendingCheques) {
      if (!cheque.checkDueDate) continue;

      const dueDate = new Date(cheque.checkDueDate);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Remind at: 3 days before, 1 day before, and on the due date (0)
      if (diffDays !== 3 && diffDays !== 1 && diffDays !== 0) {
        continue;
      }

      const jalaliDue = jalaali.toJalaali(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDate.getDate());
      const jalaliDateStr = `${jalaliDue.jy}/${String(jalaliDue.jm).padStart(2, '0')}/${String(jalaliDue.jd).padStart(2, '0')}`;

      const timingTitle = diffDays === 0 ? 'امروز' : diffDays === 1 ? 'فردا' : '۳ روز آینده';
      const student = cheque.feeContract?.student;
      const studentName = student ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim() : '';

      const ownerName = cheque.checkOwnerName || 'صادرکننده محترم';
      const bankTitle = `${cheque.bankName || 'بانک'} ${cheque.branchName || ''}`.trim();
      const amountFormatted = Number(cheque.amount).toLocaleString('fa-IR');

      let messageText = `صادرکننده محترم (${ownerName})؛\nیادآوری سررسید چک صیادی:\nچک شماره: ${cheque.checkSayadId || cheque.checkNumber || '-'}\nمبلغ: ${amountFormatted} تومان\nبانک: ${bankTitle}\nموعد سررسید: ${timingTitle} (${jalaliDateStr})\nلطفاً جهت پاس شدن چک، نسبت به تأمین موجودی اقدام فرمایید.\nمدرسه رکاد`;

      // Find recipient phone: Prioritize father/mother phone from student, or parentLinks, or student user phone
      let targetPhone = '';
      let targetUserId: string | undefined;

      if (student) {
        const parents = this.resolveParentPhonesForStudent(student);
        if (parents.length > 0) {
          targetPhone = parents[0].phone;
          targetUserId = parents[0].userId;
        } else if (student.user?.phone) {
          targetPhone = student.user.phone;
          targetUserId = student.user.id;
        }
      }

      if (targetPhone) {
        // Deduplication: Has a reminder for this cheque been sent in the last 20 hours?
        const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000);
        const existingChequeLog = await this.prisma.smsLog.findFirst({
          where: {
            tenantId: cheque.tenantId,
            type: 'AUTO_CHEQUE_DUE',
            sentAt: { gte: twentyHoursAgo },
            metadata: {
              path: ['chequeId'],
              equals: cheque.id,
            },
          },
        });

        if (existingChequeLog) {
          this.logger.log(`Cheque reminder already sent recently for cheque ${cheque.id}. Skipping duplicate.`);
          continue;
        }

        const res = await this.dispatchSms(targetPhone, messageText, cheque.tenantId);
        await this.recordLog({
          tenantId: cheque.tenantId,
          recipientPhone: targetPhone,
          recipientName: ownerName,
          recipientUserId: targetUserId,
          type: 'AUTO_CHEQUE_DUE',
          message: messageText,
          provider: res.provider,
          status: res.success ? 'SENT' : 'FAILED',
          errorMessage: res.errorMessage,
          metadata: {
            chequeId: cheque.id,
            checkNumber: cheque.checkNumber,
            sayadId: cheque.checkSayadId,
            dueDays: diffDays,
            dueDate: jalaliDateStr,
            amount: cheque.amount,
            studentName,
          },
        });
        sentCount++;
      }
    }

    return { checkedCount: pendingCheques.length, sentCount };
  }

  // =========================================================================
  // 3. AUTOMATED: Birthday Greetings Job
  // =========================================================================
  async processBirthdayGreetings(tenantId?: string): Promise<{ matchedBirthdays: number; sentCount: number }> {
    this.logger.log(`Executing Birthday Greeting Dispatcher (Tenant: ${tenantId || 'ALL'})...`);

    const now = new Date();
    const currentJalali = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const whereClause: any = {
      status: 'ACTIVE',
    };
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    // Fetch active users with student, teacher, or staff profiles
    const users = await this.prisma.user.findMany({
      where: whereClause,
      include: {
        studentProfile: true,
        teacherProfile: true,
        staffProfile: true,
      },
    });

    let matchedCount = 0;
    let sentCount = 0;

    for (const user of users) {
      const birthDate = user.studentProfile?.birthDate;
      if (!birthDate) continue;

      const bDate = new Date(birthDate);
      const bJalali = jalaali.toJalaali(bDate.getFullYear(), bDate.getMonth() + 1, bDate.getDate());

      const isJalaliMatch = bJalali.jm === currentJalali.jm && bJalali.jd === currentJalali.jd;
      const isGregorianMatch = bDate.getMonth() + 1 === currentMonth && bDate.getDate() === currentDay;

      if (isJalaliMatch || isGregorianMatch) {
        matchedCount++;
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'عزیز';
        const phone = user.phone;

        const messageText = `${fullName} عزیز؛\nشکفتن گل وجودت و زادروز زیبایت را صمیمانه شادباش می‌گوییم. 🎉🎂\nامیدواریم در پناه ایزد یکتا سالی سرشار از نشاط، تندرستی و سربلندی داشته باشی.\nخانواده بزرگ رکاد`;

        if (phone) {
          // Deduplication: Check if birthday SMS was already sent today to this user
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);

          const existingBdayLog = await this.prisma.smsLog.findFirst({
            where: {
              tenantId: user.tenantId,
              recipientPhone: phone,
              type: 'AUTO_BIRTHDAY',
              sentAt: { gte: startOfToday },
            },
          });

          if (existingBdayLog) {
            this.logger.log(`Birthday SMS already sent today to ${phone}. Skipping duplicate.`);
            continue;
          }

          const res = await this.dispatchSms(phone, messageText, user.tenantId);
          await this.recordLog({
            tenantId: user.tenantId,
            recipientPhone: phone,
            recipientName: fullName,
            recipientUserId: user.id,
            type: 'AUTO_BIRTHDAY',
            message: messageText,
            provider: res.provider,
            status: res.success ? 'SENT' : 'FAILED',
            errorMessage: res.errorMessage,
            metadata: {
              role: user.role,
              birthDate: bDate.toISOString(),
            },
          });
          sentCount++;
        }
      }
    }

    return { matchedBirthdays: matchedCount, sentCount };
  }

  // =========================================================================
  // 4. MANUAL SMS DISPATCH (INDIVIDUAL, ROLE, CLASS, DIRECT PHONES)
  // =========================================================================
  async sendManualSms(tenantId: string, senderId: string, dto: SendManualSmsDto) {
    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException('متن پیامک نمی‌تواند خالی باشد');
    }

    const recipientsToDispatch: Array<{ phone: string; name?: string; userId?: string }> = [];

    // Mode A: DIRECT_PHONE / DIRECT_PHONES
    if (dto.targetType === ManualSmsTargetType.DIRECT_PHONE) {
      const extractedPhones = new Set<string>();

      const addPhone = (p?: string) => {
        if (!p) return;
        // Split by newline, comma, semicolon, space
        const lines = p.split(/[\r\n,;\s]+/);
        for (const line of lines) {
          const cleaned = line.trim();
          if (cleaned.length >= 8) {
            extractedPhones.add(cleaned);
          }
        }
      };

      addPhone(dto.directPhone);
      if (dto.directPhones?.length) {
        dto.directPhones.forEach(addPhone);
      }

      extractedPhones.forEach((phone) => {
        recipientsToDispatch.push({ phone });
      });

      if (recipientsToDispatch.length === 0) {
        throw new BadRequestException('حداقل یک شماره تلفن مستقیم معتبر الزامی است');
      }
    }

    // Mode B: INDIVIDUAL (User by ID or Multiple Users by IDs)
    else if (dto.targetType === ManualSmsTargetType.INDIVIDUAL) {
      const userIds: string[] = [];
      if (dto.targetUserIds && Array.isArray(dto.targetUserIds) && dto.targetUserIds.length > 0) {
        userIds.push(...dto.targetUserIds.filter(Boolean));
      } else if (dto.targetUserId) {
        userIds.push(dto.targetUserId);
      }

      if (userIds.length === 0) {
        throw new BadRequestException('حداقل یک کاربر گیرنده باید انتخاب شود');
      }

      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds }, tenantId },
        select: { id: true, firstName: true, lastName: true, phone: true },
      });

      if (users.length === 0) {
        throw new NotFoundException('هیچ کاربری با شناسه‌های ارسالی یافت نشد');
      }

      let validPhoneCount = 0;
      users.forEach((u) => {
        if (u.phone && u.phone.trim()) {
          validPhoneCount++;
          recipientsToDispatch.push({
            phone: u.phone.trim(),
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            userId: u.id,
          });
        }
      });

      if (validPhoneCount === 0) {
        throw new BadRequestException('کاربران انتخاب‌شده فاقد شماره موبایل ثبت‌شده هستند');
      }
    }

    // Mode C: ROLE / GROUP
    else if (dto.targetType === ManualSmsTargetType.ROLE) {
      if (dto.targetRole === TargetRoleAudience.PARENTS) {
        // 1. Fetch any accounts with PARENT role
        const parentUsers = await this.prisma.user.findMany({
          where: { tenantId, role: 'PARENT', status: 'ACTIVE', phone: { not: null } },
          select: { id: true, firstName: true, lastName: true, phone: true },
        });
        parentUsers.forEach((u) => {
          if (u.phone) {
            recipientsToDispatch.push({
              phone: u.phone.trim(),
              name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'ولی محترم',
              userId: u.id,
            });
          }
        });

        // 2. Fetch all student profiles and resolve father/mother phone numbers!
        const studentProfiles = await this.prisma.studentProfile.findMany({
          where: { tenantId },
          include: {
            user: { select: { firstName: true, lastName: true } },
            parentLinks: {
              include: {
                parent: {
                  include: {
                    user: { select: { id: true, firstName: true, lastName: true, phone: true } },
                  },
                },
              },
            },
          },
        });

        for (const sp of studentProfiles) {
          const resolved = this.resolveParentPhonesForStudent(sp);
          recipientsToDispatch.push(...resolved);
        }
      } else {
        const roleFilter: any = { tenantId, status: 'ACTIVE', phone: { not: null } };

        if (dto.targetRole === TargetRoleAudience.STUDENTS) {
          roleFilter.role = 'STUDENT';
        } else if (dto.targetRole === TargetRoleAudience.TEACHERS) {
          roleFilter.role = 'TEACHER';
        } else if (dto.targetRole === TargetRoleAudience.STAFF) {
          roleFilter.role = { in: ['STAFF', 'SCHOOL_ADMIN', 'COACH'] };
        } else if (dto.targetRole === TargetRoleAudience.ALL) {
          // Send to everyone (students, teachers, staff, and parents!)
          const allStudentProfiles = await this.prisma.studentProfile.findMany({
            where: { tenantId },
            include: {
              user: { select: { firstName: true, lastName: true } },
              parentLinks: {
                include: {
                  parent: {
                    include: {
                      user: { select: { id: true, firstName: true, lastName: true, phone: true } },
                    },
                  },
                },
              },
            },
          });
          for (const sp of allStudentProfiles) {
            const resolved = this.resolveParentPhonesForStudent(sp);
            recipientsToDispatch.push(...resolved);
          }
        }

        const users = await this.prisma.user.findMany({
          where: roleFilter,
          select: { id: true, firstName: true, lastName: true, phone: true },
        });

        users.forEach((u) => {
          if (u.phone) {
            recipientsToDispatch.push({
              phone: u.phone.trim(),
              name: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
              userId: u.id,
            });
          }
        });
      }
    }

    // Mode D: CLASS
    else if (dto.targetType === ManualSmsTargetType.CLASS) {
      if (!dto.classroomId) {
        throw new BadRequestException('انتخاب شناسه کلاس الزامی است');
      }

      const enrollments = await this.prisma.classEnrollment.findMany({
        where: {
          classroomId: dto.classroomId,
          tenantId,
          status: 'ACTIVE',
        },
        include: {
          student: {
            include: {
              user: true,
              parentLinks: {
                include: {
                  parent: {
                    include: {
                      user: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const audience = dto.classAudience || ClassAudienceType.STUDENTS;

      for (const enr of enrollments) {
        const studentUser = enr.student.user;

        // Add students
        if (audience === ClassAudienceType.STUDENTS || audience === ClassAudienceType.BOTH) {
          if (studentUser.phone) {
            recipientsToDispatch.push({
              phone: studentUser.phone.trim(),
              name: `${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim(),
              userId: studentUser.id,
            });
          }
        }

        // Add parents
        if (audience === ClassAudienceType.PARENTS || audience === ClassAudienceType.BOTH) {
          const resolvedParents = this.resolveParentPhonesForStudent(enr.student);
          recipientsToDispatch.push(...resolvedParents);
        }
      }
    }

      // Remove duplicate phones
      const uniqueRecipients = Array.from(
        new Map(recipientsToDispatch.map((r) => [r.phone, r])).values(),
      );

      if (uniqueRecipients.length === 0) {
        throw new BadRequestException('هیچ گیرنده معتبری با شماره تلفن همراه یافت نشد.');
      }

    // Dispatch & Log
    let sentCount = 0;
    let failedCount = 0;

    for (const rec of uniqueRecipients) {
      const res = await this.dispatchSms(rec.phone, dto.message, tenantId);
      const isOk = res.success;
      if (isOk) sentCount++;
      else failedCount++;

      await this.recordLog({
        tenantId,
        recipientPhone: rec.phone,
        recipientName: rec.name,
        recipientUserId: rec.userId,
        type:
          dto.targetType === ManualSmsTargetType.INDIVIDUAL
            ? 'MANUAL_INDIVIDUAL'
            : dto.targetType === ManualSmsTargetType.ROLE
              ? 'MANUAL_ROLE'
              : dto.targetType === ManualSmsTargetType.CLASS
                ? 'MANUAL_CLASS'
                : 'MANUAL_BULK',
        message: dto.message,
        provider: res.provider,
        status: isOk ? 'SENT' : 'FAILED',
        errorMessage: res.errorMessage,
        senderId,
        metadata: {
          targetType: dto.targetType,
          classroomId: dto.classroomId,
          targetRole: dto.targetRole,
        },
      });
    }

    return {
      message: `پیامک به ${sentCount} نفر با موفقیت ارسال شد.${failedCount > 0 ? ` (${failedCount} ارسال ناموفق)` : ''}`,
      totalRecipients: uniqueRecipients.length,
      sentCount,
      failedCount,
    };
  }

  // ==========================================
  // Logs, Stats & Templates
  // ==========================================
  async getSmsLogs(tenantId: string, page = 1, limit = 30, type?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { recipientPhone: { contains: search } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.smsLog.count({ where }),
      this.prisma.smsLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }

  async getSmsStats(tenantId: string) {
    const total = await this.prisma.smsLog.count({ where: { tenantId } });
    const sent = await this.prisma.smsLog.count({ where: { tenantId, status: 'SENT' } });
    const failed = await this.prisma.smsLog.count({ where: { tenantId, status: 'FAILED' } });

    const absenceCount = await this.prisma.smsLog.count({ where: { tenantId, type: 'AUTO_ABSENCE' } });
    const chequeCount = await this.prisma.smsLog.count({ where: { tenantId, type: 'AUTO_CHEQUE_DUE' } });
    const birthdayCount = await this.prisma.smsLog.count({ where: { tenantId, type: 'AUTO_BIRTHDAY' } });
    const manualCount = await this.prisma.smsLog.count({
      where: { tenantId, type: { in: ['MANUAL_INDIVIDUAL', 'MANUAL_ROLE', 'MANUAL_CLASS', 'MANUAL_BULK'] } },
    });

    return {
      total,
      sent,
      failed,
      breakdown: {
        autoAbsence: absenceCount,
        autoChequeDue: chequeCount,
        autoBirthday: birthdayCount,
        manual: manualCount,
      },
      activeProvider: this.primaryProvider.name,
    };
  }

  async getTemplates(tenantId: string) {
    const templates = await this.prisma.smsTemplate.findMany({
      where: { tenantId },
    });

    // Default templates definition if not stored in DB yet
    const defaults = [
      {
        type: 'AUTO_ABSENCE',
        title: 'اعلان غیبت و تأخیر به والدین',
        body: 'ولی محترم؛ به اطلاع می‌رساند {نام_دانش‌آموز} در تاریخ {تاریخ} در {زنگ}، وضعیت «{وضعیت}» برای ایشان ثبت گردیده است.\nمدرسه رکاد',
        isEnabled: true,
      },
      {
        type: 'AUTO_CHEQUE_DUE',
        title: 'یادآوری سررسید چک‌های صیادی',
        body: 'صادرکننده محترم ({نام})؛ یادآوری سررسید چک صیادی به مبلغ {مبلغ} ریال موعد {تاریخ_سررسید}. لطفاً نسبت به تأمین موجودی اقدام فرمایید.\nمدرسه رکاد',
        isEnabled: true,
      },
      {
        type: 'AUTO_BIRTHDAY',
        title: 'تبریک زادروز',
        body: '{نام} عزیز؛ شکفتن گل وجودت و زادروز زیبایت را صمیمانه شادباش می‌گوییم. 🎉🎂\nخانواده بزرگ رکاد',
        isEnabled: true,
      },
    ];

    return defaults.map((def) => {
      const found = templates.find((t) => t.type === def.type);
      return (
        found || {
          id: `default-${def.type}`,
          tenantId,
          ...def,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      );
    });
  }

  async upsertTemplate(tenantId: string, dto: UpsertSmsTemplateDto) {
    return this.prisma.smsTemplate.upsert({
      where: {
        tenantId_type: {
          tenantId,
          type: dto.type as any,
        },
      },
      update: {
        title: dto.title,
        body: dto.body,
        isEnabled: dto.isEnabled ?? true,
      },
      create: {
        tenantId,
        type: dto.type as any,
        title: dto.title,
        body: dto.body,
        isEnabled: dto.isEnabled ?? true,
      },
    });
  }

  // ==========================================
  // Quick Templates Management (الگوهای سریع)
  // ==========================================
  async getQuickTemplates(tenantId: string) {
    const list = await this.prisma.smsQuickTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (list.length === 0) {
      // Return predefined default quick templates if none created yet
      return [
        {
          id: 'def-1',
          title: 'کلاس‌های آنلاین',
          content: 'با سلام و احترام؛ پیرو تصمیم شورای مدرسه، کلیه کلاس‌های آموزشی فردا به صورت آنلاین برگزار خواهد شد.\nمدرسه رکاد',
          category: 'ANNOUNCEMENT',
          isDefault: true,
        },
        {
          id: 'def-2',
          title: 'انتشار کارنامه',
          content: 'ولی محترم؛ کارنامه نیم‌سال تحصیلی فرزند شما در سامانه هوشمند رکاد بارگذاری و قابل مشاهده است.\nمدرسه رکاد',
          category: 'ACADEMIC',
          isDefault: true,
        },
        {
          id: 'def-3',
          title: 'دعوت به جلسه اولیاء',
          content: 'با سلام؛ جلسه عمومی اولیاء و مربیان روز چهارشنبه ساعت ۱۵ در سالن همایش‌های مدرسه برگزار می‌گردد.\nحضور شما مایه افتخار است.',
          category: 'GENERAL',
          isDefault: true,
        },
        {
          id: 'def-4',
          title: 'تعطیلی اضطراری / آلودگی',
          content: 'با سلام؛ با توجه به اعلام مدیریت بحران، فعالیت حضوری مدرسه فردا تعطیل بوده و آموزش از طریق سامانه دنبال خواهد شد.\nمدیریت مدرسه رکاد',
          category: 'EMERGENCY',
          isDefault: true,
        },
      ];
    }

    return list;
  }

  async createQuickTemplate(tenantId: string, dto: CreateSmsQuickTemplateDto) {
    return this.prisma.smsQuickTemplate.create({
      data: {
        tenantId,
        title: dto.title.trim(),
        content: dto.content.trim(),
        category: dto.category || 'GENERAL',
      },
    });
  }

  async updateQuickTemplate(tenantId: string, id: string, dto: UpdateSmsQuickTemplateDto) {
    const existing = await this.prisma.smsQuickTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('الگوی پیامک مورد نظر یافت نشد');
    }

    return this.prisma.smsQuickTemplate.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.content ? { content: dto.content.trim() } : {}),
        ...(dto.category ? { category: dto.category } : {}),
      },
    });
  }

  async deleteQuickTemplate(tenantId: string, id: string) {
    const existing = await this.prisma.smsQuickTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('الگوی پیامک مورد نظر یافت نشد');
    }

    await this.prisma.smsQuickTemplate.delete({
      where: { id },
    });

    return { success: true, message: 'الگوی پیامک با موفقیت حذف گردید' };
  }

  // ==========================================
  // Directory & Recipients for SMS Panel
  // ==========================================
  // Directory & Recipients for SMS Panel
  // ==========================================
  async getDirectoryRecipients(tenantId: string, search?: string) {
    const where: any = {
      tenantId,
      status: 'ACTIVE',
    };

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s } },
        { nationalId: { contains: s } },
        { username: { contains: s, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        nationalId: true,
        username: true,
        avatarUrl: true,
      },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Also include student parents from StudentProfile (fatherPhone & motherPhone)
    const students = await this.prisma.studentProfile.findMany({
      where: {
        tenantId,
        OR: [{ fatherPhone: { not: null } }, { motherPhone: { not: null } }],
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const parentList: any[] = [];
    const seenPhones = new Set(users.map((u) => u.phone).filter(Boolean));

    for (const sp of students) {
      const studentName = `${sp.user?.firstName || ''} ${sp.user?.lastName || ''}`.trim();

      if (sp.fatherPhone && !seenPhones.has(sp.fatherPhone)) {
        seenPhones.add(sp.fatherPhone);
        const fatherName = sp.fatherFullName || `پدر ${studentName}`;
        if (!search || fatherName.includes(search) || sp.fatherPhone.includes(search) || studentName.includes(search)) {
          parentList.push({
            id: `parent-father-${sp.id}`,
            firstName: fatherName,
            lastName: `(ولی ${studentName})`,
            phone: sp.fatherPhone,
            role: 'PARENT',
            nationalId: sp.fatherNationalId || '—',
            username: `father-${sp.nationalCode || sp.id}`,
            avatarUrl: null,
          });
        }
      }

      if (sp.motherPhone && !seenPhones.has(sp.motherPhone)) {
        seenPhones.add(sp.motherPhone);
        const motherName = sp.motherFullName || `مادر ${studentName}`;
        if (!search || motherName.includes(search) || sp.motherPhone.includes(search) || studentName.includes(search)) {
          parentList.push({
            id: `parent-mother-${sp.id}`,
            firstName: motherName,
            lastName: `(ولی ${studentName})`,
            phone: sp.motherPhone,
            role: 'PARENT',
            nationalId: sp.motherNationalId || '—',
            username: `mother-${sp.nationalCode || sp.id}`,
            avatarUrl: null,
          });
        }
      }
    }

    return [...users, ...parentList];
  }

  // =========================================================================
  // 5. AUTOMATED: Login Credentials SMS for New Members
  // =========================================================================
  @OnEvent('member.credentials_generated', { async: true })
  async handleMemberCredentials(event: {
    tenantId: string;
    fullName: string;
    phone: string;
    username: string;
    password?: string;
    role: string;
  }) {
    if (!event.phone) return;

    this.logger.log(`Dispatching login credentials SMS to ${event.phone} (${event.fullName})...`);

    const roleTitle =
      event.role === 'TEACHER'
        ? 'دبیر گرامی'
        : event.role === 'STAFF'
        ? 'همکار گرامی'
        : event.role === 'PARENT'
        ? 'ولی محترم'
        : 'دانش‌آموز گرامی';

    const loginUrl = 'https://rokadschool.ir/login';
    const messageText = `${roleTitle} (${event.fullName})؛\nبه سامانه هوشمند مدیریت مدارس رکاد خوش آمدید.\nاطلاعات ورود به حساب کاربری:\nنام کاربری: ${event.username}\nرمز عبور: ${event.password || event.phone}\nآدرس سامانه: ${loginUrl}\nلطفاً پس از اولین ورود، رمز عبور خود را تغییر دهید.`;

    const res = await this.dispatchSms(event.phone, messageText, event.tenantId);
    await this.recordLog({
      tenantId: event.tenantId,
      recipientPhone: event.phone,
      recipientName: event.fullName,
      type: 'MANUAL_INDIVIDUAL',
      message: messageText,
      provider: res.provider,
      status: res.success ? 'SENT' : 'FAILED',
      errorMessage: res.errorMessage,
      metadata: {
        action: 'CREDENTIALS_DISPATCH',
        role: event.role,
        username: event.username,
      },
    });
  }

  // =========================================================================
  // 6. AUTOMATED: Urgent Message Broadcast SMS
  // =========================================================================
  @OnEvent('message.urgent_broadcast', { async: true })
  async handleUrgentMessageBroadcast(event: {
    tenantId: string;
    senderName: string;
    title: string;
    body: string;
    recipientPhones: Array<{ phone: string; name?: string; userId?: string }>;
  }) {
    if (!event.recipientPhones || event.recipientPhones.length === 0) return;

    this.logger.log(`Broadcasting urgent SMS to ${event.recipientPhones.length} recipients...`);
    const preview = event.body.length > 100 ? `${event.body.slice(0, 100)}...` : event.body;
    const messageText = `اطلاعیه فوری و مهم مدرسه:\n${event.title}\n${preview}\nفرستنده: ${event.senderName}\nسامانه مدارس رکاد`;

    for (const recipient of event.recipientPhones) {
      const res = await this.dispatchSms(recipient.phone, messageText, event.tenantId);
      await this.recordLog({
        tenantId: event.tenantId,
        recipientPhone: recipient.phone,
        recipientName: recipient.name,
        recipientUserId: recipient.userId,
        type: 'MANUAL_BULK',
        message: messageText,
        provider: res.provider,
        status: res.success ? 'SENT' : 'FAILED',
        errorMessage: res.errorMessage,
        metadata: {
          action: 'URGENT_MESSAGE_BROADCAST',
          title: event.title,
        },
      });
    }
  }
}


