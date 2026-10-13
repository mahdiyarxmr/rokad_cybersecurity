import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import * as jalaali from 'jalaali-js';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateStudentDto,
  CreateTeacherDto,
  UpdateTeacherDto,
  CreateCoachDto,
  CreateStaffDto,
  CreateParentDto,
  LinkParentStudentDto,
} from './dto/create-student.dto';
import { Role } from '../../common/constants';
import {
  generateUnifiedCredentials,
  generateParentCredentials,
  normalizeNationalCode,
  deriveStudentCode,
} from '../../common/utils/credential.util';
import { normalizePersianDigits } from '../../common/utils/jalali.util';
import { PasswordVaultService } from '../auth/password-vault.service';

/**
 * تبدیل تاریخ تولد شمسی یا میلادی به شیء معتبر Date
 */
export function parseBirthDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  const str = normalizePersianDigits(String(val).trim());
  if (!str) return undefined;

  // الگوی تاریخ شمسی: 1388/05/12 یا 1388-5-12 یا 1388.05.12
  const jMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (jMatch) {
    const jy = parseInt(jMatch[1], 10);
    const jm = parseInt(jMatch[2], 10);
    const jd = parseInt(jMatch[3], 10);
    if (jy >= 1300 && jy <= 1450 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      const g = jalaali.toGregorian(jy, jm, jd);
      return new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
    }
  }

  // تاریخ میلادی استاندارد
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return undefined;
}

/**
 * استخراج هوشمند مقدار از ستون‌های اکسل بدون حساسیت به دونقطه (:)، فاصله‌های اضافی و نیم‌فاصله
 */
export function extractField(row: Record<string, any>, ...keys: string[]): string | undefined {
  if (!row || typeof row !== 'object') return undefined;

  // 1. جستجوی مستقیم
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }

  // 2. جستجوی نرمال‌شده (حذف دونقطه، فاصله‌ها، نیم‌فاصله‌ها و تبدیل به حروف کوچک)
  const cleanStr = (s: string) =>
    s
      .replace(/[:：]/g, '')
      .replace(/[\u200c\u200b]/g, '')
      .replace(/\s+/g, '')
      .trim()
      .toLowerCase();

  const targetCleanKeys = keys.map(cleanStr);

  for (const [rowKey, rowVal] of Object.entries(row)) {
    if (rowVal === undefined || rowVal === null || String(rowVal).trim() === '') continue;
    const cleanRowKey = cleanStr(rowKey);
    if (targetCleanKeys.includes(cleanRowKey)) {
      return String(rowVal).trim();
    }
  }

  return undefined;
}

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly passwordVaultService: PasswordVaultService,
  ) {}

  // 1. Students
  async bulkImportStudents(tenantId: string, items: any[]): Promise<any> {
    const results = {
      total: items.length,
      success: 0,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // --- ۱. استخراج اطلاعات شناسنامه‌ای و هویتی (مطابق ۲۸ ستون SAMPLE.xlsx) ---
        const firstName =
          extractField(item, 'نام', 'نام کوچک', 'نام دانش آموز', 'نام دانش‌آموز', 'firstName') ||
          'دانش‌آموز';
        const lastName =
          extractField(item, 'نام خانوادگی', 'نام‌خانوادگی', 'فامیل', 'lastName') ||
          'بدون فامیل';
        const fatherName = extractField(item, 'نام پدر', 'fatherName') || undefined;
        const gradeLevel =
          extractField(item, 'پایه تحصیلی', 'پایه', 'gradeLevel', 'مقطع') || undefined;

        const rawBirthDate = extractField(item, 'تاریخ تولد', 'تاریخ_تولد', 'birthDate');
        const birthDate = parseBirthDate(rawBirthDate);

        const birthPlace = extractField(item, 'محل تولد', 'شهر تولد', 'birthPlace') || undefined;
        const rawNationalCode = extractField(
          item,
          'کد ملی',
          'کدملی',
          'کد_ملی',
          'کد ملی دانش آموز',
          'کد ملی دانش‌آموز',
          'nationalCode',
        );

        const certificateNumber =
          extractField(item, 'سریال شناسنامه', 'شماره شناسنامه', 'certificateNumber') || undefined;
        const certificateSeriesLetter =
          extractField(item, 'سری حرفی', 'سری حرفی شناسنامه', 'certificateSeriesLetter') || undefined;
        const certificateSeriesNumber =
          extractField(item, 'سری عددی', 'سری عددی شناسنامه', 'certificateSeriesNumber') || undefined;
        const issuePlace =
          extractField(item, 'محل صدور', 'محل صدور شناسنامه', 'صادره', 'issuePlace') || undefined;
        const physicalCondition =
          extractField(item, 'وضعیت جسمانی', 'وضعیت جسمی', 'سلامت', 'physicalCondition') || undefined;

        // --- ۲. مشخصات پدر ---
        const fatherFullName =
          extractField(item, 'نام و نام‌خانوادگی پدر', 'نام و نام خانوادگی پدر', 'fatherFullName') ||
          undefined;
        const fatherNationalId =
          extractField(item, 'کد ملی پدر', 'کدملی پدر', 'fatherNationalId') || undefined;
        const fatherEducation =
          extractField(item, 'تحصیلات پدر', 'مدرک پدر', 'fatherEducation') || undefined;
        const fatherOccupation =
          extractField(item, 'شغل پدر', 'fatherOccupation') || undefined;
        const fatherPhone =
          extractField(item, 'شماره همراه پدر', 'موبایل پدر', 'تلفن پدر', 'fatherPhone') || undefined;
        const fatherWorkAddress =
          extractField(item, 'آدرس محل کار پدر', 'محل کار پدر', 'fatherWorkAddress') || undefined;

        // --- ۳. مشخصات مادر ---
        const motherFullName =
          extractField(item, 'نام و نام‌خانوادگی مادر', 'نام و نام خانوادگی مادر', 'motherFullName') ||
          undefined;
        const motherNationalId =
          extractField(item, 'کد ملی مادر', 'کدملی مادر', 'motherNationalId') || undefined;
        const motherEducation =
          extractField(item, 'تحصیلات مادر', 'مدرک مادر', 'motherEducation') || undefined;
        const motherOccupation =
          extractField(item, 'شغل مادر', 'motherOccupation') || undefined;
        const motherPhone =
          extractField(item, 'شماره همراه مادر', 'موبایل مادر', 'تلفن مادر', 'motherPhone') || undefined;
        const motherWorkAddress =
          extractField(item, 'آدرس محل کار مادر', 'محل کار مادر', 'motherWorkAddress') || undefined;

        // --- ۴. سکونت و ارتباطات ---
        const homeAddress =
          extractField(item, 'آدرس منزل', 'آدرس', 'نشانی', 'homeAddress', 'address') || undefined;
        const landlinePhone =
          extractField(item, 'شماره ثابت', 'تلفن ثابت', 'تلفن منزل', 'landlinePhone') || undefined;
        const studentMobile =
          extractField(
            item,
            'شماره همراه دانش‌آموز',
            'شماره همراه دانش آموز',
            'موبایل دانش آموز',
            'موبایل دانش‌آموز',
            'شماره همراه',
            'studentMobile',
          ) || undefined;
        const avatarUrl =
          extractField(item, 'عکس پرسنلی', 'عکس', 'تصویر', 'avatarUrl') || undefined;

        // تلفن لاگین کاربر: اولویت با شماره همراه دانش‌آموز، سپس پدر یا مادر
        const phone =
          studentMobile ||
          fatherPhone ||
          motherPhone ||
          `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`;

        const creds = generateUnifiedCredentials({
          tenant,
          nationalCode: rawNationalCode,
          fallbackPhone: phone,
        });

        const studentCode =
          extractField(item, 'شماره دانش آموزی', 'شماره دانش‌آموزی', 'studentCode') ||
          deriveStudentCode(rawNationalCode || creds.nationalId, phone);

        const nationalCode = creds.nationalId || undefined;
        const className =
          extractField(item, 'شماره کلاس', 'کلاس', 'className') || gradeLevel || undefined;
        const rawGender = extractField(item, 'جنسیت', 'gender');
        const gender =
          rawGender === 'دختر' || rawGender === 'FEMALE'
            ? 'FEMALE'
            : rawGender === 'پسر' || rawGender === 'MALE'
              ? 'MALE'
              : tenant?.theme === 'FEMALE'
                ? 'FEMALE'
                : 'MALE';

        // جستجوی کلاس متناظر در صورت وجود با پشتیبانی از ارقام فارسی و انگلیسی
        let classroomId: string | undefined = undefined;
        if (className) {
          const cleanClassName = className.trim();
          const englishClassName = normalizePersianDigits(cleanClassName);
          const classroom = await this.prisma.classroom.findFirst({
            where: {
              tenantId,
              OR: [
                { name: cleanClassName },
                { name: { contains: cleanClassName } },
                { name: englishClassName },
                { name: { contains: englishClassName } },
                { code: cleanClassName },
                { code: englishClassName },
              ],
            },
          });
          if (classroom) classroomId = classroom.id;
        }

        const passwordHash = await argon2.hash(creds.finalPassword);
        const encryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
          tenantId,
          creds.finalPassword,
        );

        let isNewStudent = false;

        await this.prisma.$transaction(async (tx) => {
          // ۱. جستجوی هوشمند دانش‌آموز بر اساس کد ملی، نام کاربری یا کد دانش‌آموزی
          let existingProfile = await tx.studentProfile.findFirst({
            where: {
              tenantId,
              OR: [
                ...(nationalCode ? [{ nationalCode }] : []),
                ...(studentCode ? [{ studentCode }] : []),
                ...(creds.nationalId ? [{ nationalCode: creds.nationalId }] : []),
              ],
            },
            include: {
              user: true,
              enrollments: {
                include: {
                  classroom: true,
                },
              },
            },
          });

          if (!existingProfile && (creds.nationalId || creds.username)) {
            const matchedUser = await tx.user.findFirst({
              where: {
                tenantId,
                role: Role.STUDENT as any,
                OR: [
                  ...(creds.nationalId ? [{ nationalId: creds.nationalId }] : []),
                  ...(creds.username ? [{ username: creds.username }] : []),
                ],
              },
              include: {
                studentProfile: {
                  include: {
                    enrollments: {
                      include: {
                        classroom: true,
                      },
                    },
                  },
                },
              },
            });

            if (matchedUser?.studentProfile) {
              existingProfile = {
                ...matchedUser.studentProfile,
                user: matchedUser,
              };
            }
          }

          if (existingProfile) {
            // به‌روزرسانی مشخصات دانش‌آموز موجود (Smart Upsert - بدون خطا)
            await tx.user.update({
              where: { id: existingProfile.user.id },
              data: {
                ...(firstName && firstName !== 'دانش‌آموز' ? { firstName } : {}),
                ...(lastName && lastName !== 'بدون فامیل' ? { lastName } : {}),
                ...(phone && !phone.startsWith('0900000000') ? { phone } : {}),
                ...(gender ? { gender } : {}),
                ...(avatarUrl ? { avatarUrl } : {}),
                ...(nationalCode ? { nationalId: nationalCode } : {}),
              },
            });

            await tx.studentProfile.update({
              where: { id: existingProfile.id },
              data: {
                ...(nationalCode ? { nationalCode } : {}),
                ...(studentCode ? { studentCode } : {}),
                ...(fatherName ? { fatherName } : {}),
                ...(birthDate ? { birthDate } : {}),
                ...(homeAddress ? { address: homeAddress, homeAddress } : {}),
                ...(physicalCondition ? { medicalNotes: physicalCondition, physicalCondition } : {}),
                ...(gradeLevel ? { gradeLevel } : {}),
                ...(birthPlace ? { birthPlace } : {}),
                ...(certificateNumber ? { certificateNumber } : {}),
                ...(certificateSeriesLetter ? { certificateSeriesLetter } : {}),
                ...(certificateSeriesNumber ? { certificateSeriesNumber } : {}),
                ...(issuePlace ? { issuePlace } : {}),
                ...(fatherFullName ? { fatherFullName } : {}),
                ...(fatherNationalId ? { fatherNationalId } : {}),
                ...(fatherEducation ? { fatherEducation } : {}),
                ...(fatherOccupation ? { fatherOccupation } : {}),
                ...(fatherPhone ? { fatherPhone } : {}),
                ...(fatherWorkAddress ? { fatherWorkAddress } : {}),
                ...(motherFullName ? { motherFullName } : {}),
                ...(motherNationalId ? { motherNationalId } : {}),
                ...(motherEducation ? { motherEducation } : {}),
                ...(motherOccupation ? { motherOccupation } : {}),
                ...(motherPhone ? { motherPhone } : {}),
                ...(motherWorkAddress ? { motherWorkAddress } : {}),
                ...(landlinePhone ? { landlinePhone } : {}),
                ...(studentMobile ? { studentMobile } : {}),
              },
            });

            // مدیریت تغییر کلاس یا انتساب به کلاس جدید
            if (classroomId) {
              const classroom = await tx.classroom.findUnique({ where: { id: classroomId } });
              if (classroom) {
                const activeEnrollment = existingProfile.enrollments?.find(
                  (e: any) => e.status === 'ACTIVE',
                ) || existingProfile.enrollments?.[0];

                if (activeEnrollment) {
                  if (activeEnrollment.classroomId !== classroom.id) {
                    await tx.classEnrollment.update({
                      where: { id: activeEnrollment.id },
                      data: {
                        classroomId: classroom.id,
                        academicYearId: classroom.academicYearId,
                      },
                    });
                  }
                } else {
                  await tx.classEnrollment.create({
                    data: {
                      tenantId,
                      studentId: existingProfile.id,
                      classroomId: classroom.id,
                      academicYearId: classroom.academicYearId,
                    },
                  });
                }
              }
            }

            // همگام‌سازی اطلاعات اولیاء
            await this.syncParentForStudent(tx, tenantId, existingProfile, {
              studentNationalCode: nationalCode || existingProfile.nationalCode,
              fatherFullName: fatherFullName || existingProfile.fatherFullName,
              motherFullName: motherFullName || existingProfile.motherFullName,
              fatherPhone: fatherPhone || existingProfile.fatherPhone,
              motherPhone: motherPhone || existingProfile.motherPhone,
              phone: phone || existingProfile.user.phone,
              studentFirstName: firstName || existingProfile.user.firstName,
              studentLastName: lastName || existingProfile.user.lastName,
              occupation: fatherOccupation || motherOccupation || existingProfile.fatherOccupation,
              education: fatherEducation || motherEducation || existingProfile.fatherEducation,
            });

            results.updated++;
            results.success++;
          } else {
            isNewStudent = true;

            // بررسی عدم تکراری بودن شماره همراه برای جلوگیری از خطای یونیک
            const phoneConflict = await tx.user.findFirst({
              where: {
                tenantId,
                phone,
              },
            });

            const safePhone = phoneConflict
              ? `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`
              : phone;

            const user = await tx.user.create({
              data: {
                tenantId,
                firstName,
                lastName,
                phone: safePhone,
                username: creds.username,
                gender,
                nationalId: creds.nationalId || undefined,
                avatarUrl: avatarUrl || undefined,
                passwordHash,
                encryptedPassword: encryptedPassword || undefined,
                role: Role.STUDENT as any,
                status: 'ACTIVE',
              },
            });

            const profile = await tx.studentProfile.create({
              data: {
                tenantId,
                userId: user.id,
                studentCode,
                nationalCode,
                fatherName: fatherName || (fatherFullName ? fatherFullName.split(' ')[0] : undefined),
                birthDate,
                address: homeAddress,
                medicalNotes: physicalCondition,
                gradeLevel,
                birthPlace,
                certificateNumber,
                certificateSeriesLetter,
                certificateSeriesNumber,
                issuePlace,
                physicalCondition,
                fatherFullName,
                fatherNationalId,
                fatherEducation,
                fatherOccupation,
                fatherPhone,
                fatherWorkAddress,
                motherFullName,
                motherNationalId,
                motherEducation,
                motherOccupation,
                motherPhone,
                motherWorkAddress,
                homeAddress,
                landlinePhone,
                studentMobile: studentMobile || (phone !== safePhone ? phone : undefined),
              },
            });

            if (classroomId) {
              const classroom = await tx.classroom.findUnique({ where: { id: classroomId } });
              if (classroom) {
                await tx.classEnrollment.create({
                  data: {
                    tenantId,
                    studentId: profile.id,
                    classroomId: classroom.id,
                    academicYearId: classroom.academicYearId,
                  },
                });
              }
            }

            await this.syncParentForStudent(tx, tenantId, profile, {
              studentNationalCode: nationalCode,
              fatherFullName,
              motherFullName,
              fatherPhone,
              motherPhone,
              phone,
              studentFirstName: firstName,
              studentLastName: lastName,
              occupation: fatherOccupation || motherOccupation,
              education: fatherEducation || motherEducation,
            });

            results.created++;
            results.success++;
          }
        });

        // ارسال پیامک خوش‌آمد و رمز عبور فقط برای دانش‌آموزان جدید
        if (isNewStudent) {
          const notificationPhone = fatherPhone || motherPhone || (phone && !phone.startsWith('0900000000') ? phone : undefined);
          if (notificationPhone && notificationPhone.length >= 10) {
            this.eventEmitter.emit('member.credentials_generated', {
              tenantId,
              name: `${firstName} ${lastName}`,
              phone: notificationPhone,
              username: creds.username,
              password: creds.finalPassword,
              role: 'دانش‌آموز',
            });
          }
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`ردیف ${i + 1} (${item['نام'] || item['نام:'] || ''} ${item['نام خانوادگی'] || item['نام خانوادگی:'] || ''}): ${err.message}`);
      }
    }

    return results;
  }

  async listStudents(tenantId: string, search?: string): Promise<any> {
    const where: any = { tenantId };
    if (search) {
      where.OR = [
        { studentCode: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { nationalCode: { contains: search } },
      ];
    }

    return this.prisma.studentProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
        enrollments: {
          include: {
            classroom: {
              include: {
                level: true,
                field: true,
              },
            },
          },
        },
        parentLinks: {
          include: {
            parent: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStudent(tenantId: string, dto: CreateStudentDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const studentCode =
      dto.studentCode?.trim() ||
      dto.studentNumber?.trim() ||
      deriveStudentCode(dto.nationalCode || creds.nationalId, dto.phone);

    const existingCode = await this.prisma.studentProfile.findFirst({
      where: {
        tenantId,
        OR: [
          { studentCode },
          ...(creds.nationalId ? [{ nationalCode: creds.nationalId }] : []),
        ],
      },
    });
    if (existingCode) {
      throw new ConflictException(`شماره دانش‌آموزی یا کد ملی '${studentCode}' قبلاً ثبت شده است`);
    }

    if (creds.username) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          tenantId,
          OR: [
            { username: creds.username },
            ...(creds.nationalId ? [{ nationalId: creds.nationalId }] : []),
          ],
        },
      });
      if (existingUser) {
        throw new ConflictException(`کاربر با کد ملی / نام کاربری '${creds.username}' قبلاً در این مرکز ثبت شده است`);
      }
    }

    const passwordHash = await argon2.hash(creds.finalPassword);
    const encryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
      tenantId,
      creds.finalPassword,
    );

    const createdResult = await this.prisma.$transaction(async (tx) => {
      // 1. Create base User
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.studentMobile || dto.phone,
          username: creds.username,
          gender: dto.gender,
          nationalId: creds.nationalId,
          avatarUrl: dto.avatarUrl || undefined,
          passwordHash,
          encryptedPassword: encryptedPassword || undefined,
          role: Role.STUDENT as any,
          status: 'ACTIVE',
        },
      });

      // 2. Create StudentProfile
      const profile = await tx.studentProfile.create({
        data: {
          tenantId,
          userId: user.id,
          studentCode,
          nationalCode: dto.nationalCode,
          fatherName: dto.fatherName || (dto.fatherFullName ? dto.fatherFullName.split(' ')[0] : undefined),
          birthDate: parseBirthDate(dto.birthDate),
          address: dto.homeAddress || dto.address,
          medicalNotes: dto.physicalCondition || dto.medicalNotes,
          gradeLevel: dto.gradeLevel,
          birthPlace: dto.birthPlace,
          certificateNumber: dto.certificateNumber,
          certificateSeriesLetter: dto.certificateSeriesLetter,
          certificateSeriesNumber: dto.certificateSeriesNumber,
          issuePlace: dto.issuePlace,
          physicalCondition: dto.physicalCondition,
          fatherFullName: dto.fatherFullName,
          fatherNationalId: dto.fatherNationalId,
          fatherEducation: dto.fatherEducation,
          fatherOccupation: dto.fatherOccupation,
          fatherPhone: dto.fatherPhone,
          fatherWorkAddress: dto.fatherWorkAddress,
          motherFullName: dto.motherFullName,
          motherNationalId: dto.motherNationalId,
          motherEducation: dto.motherEducation,
          motherOccupation: dto.motherOccupation,
          motherPhone: dto.motherPhone,
          motherWorkAddress: dto.motherWorkAddress,
          homeAddress: dto.homeAddress || dto.address,
          landlinePhone: dto.landlinePhone,
          studentMobile: dto.studentMobile || dto.phone,
        },
        include: {
          user: true,
        },
      });

      // 3. Optional Auto-Enrollment into Classroom
      if (dto.classroomId) {
        const classroom = await tx.classroom.findFirst({
          where: { id: dto.classroomId, tenantId },
        });
        if (classroom) {
          await tx.classEnrollment.create({
            data: {
              tenantId,
              studentId: profile.id,
              classroomId: classroom.id,
              academicYearId: classroom.academicYearId,
            },
          });
        }
      }

      // 4. Automatically sync unified single parent account for student
      await this.syncParentForStudent(tx, tenantId, profile, {
        studentNationalCode: creds.nationalId || dto.nationalCode,
        fatherFullName: dto.fatherFullName,
        motherFullName: dto.motherFullName,
        fatherPhone: dto.fatherPhone,
        motherPhone: dto.motherPhone,
        phone: dto.phone,
        studentFirstName: dto.firstName,
        studentLastName: dto.lastName,
        occupation: dto.fatherOccupation || dto.motherOccupation,
        education: dto.fatherEducation || dto.motherEducation,
      });

      return profile;
    });

    // Dispatch Login Credentials SMS to student or parent
    const recipientPhone = dto.studentMobile || dto.phone || dto.fatherPhone || dto.motherPhone;
    if (recipientPhone) {
      this.eventEmitter.emit('member.credentials_generated', {
        tenantId,
        fullName: `${dto.firstName} ${dto.lastName}`.trim(),
        phone: recipientPhone,
        username: creds.username || creds.nationalId || recipientPhone,
        password: creds.finalPassword,
        role: 'STUDENT',
      });
    }

    return createdResult;
  }

  async updateStudent(tenantId: string, id: string, dto: Partial<CreateStudentDto>): Promise<any> {
    const profile = await this.prisma.studentProfile.findFirst({
      where: { id, tenantId },
      include: { user: true },
    });
    if (!profile) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update user fields
      const userUpdate: any = {};
      if (dto.firstName) userUpdate.firstName = dto.firstName;
      if (dto.lastName) userUpdate.lastName = dto.lastName;
      if (dto.studentMobile || dto.phone) userUpdate.phone = dto.studentMobile || dto.phone;
      if (dto.avatarUrl !== undefined) userUpdate.avatarUrl = dto.avatarUrl;
      if (dto.gender) userUpdate.gender = dto.gender;
      if (dto.nationalCode) userUpdate.nationalId = dto.nationalCode;

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: profile.userId },
          data: userUpdate,
        });
      }

      // 2. Update studentProfile fields
      const profileUpdate: any = {};
      if (dto.studentCode) profileUpdate.studentCode = dto.studentCode;
      if (dto.nationalCode !== undefined) profileUpdate.nationalCode = dto.nationalCode;
      if (dto.fatherName !== undefined) profileUpdate.fatherName = dto.fatherName;
      if (dto.birthDate !== undefined) profileUpdate.birthDate = parseBirthDate(dto.birthDate);
      if (dto.address !== undefined) profileUpdate.address = dto.address;
      if (dto.homeAddress !== undefined) {
        profileUpdate.homeAddress = dto.homeAddress;
        profileUpdate.address = dto.homeAddress;
      }
      if (dto.medicalNotes !== undefined) profileUpdate.medicalNotes = dto.medicalNotes;
      if (dto.gradeLevel !== undefined) profileUpdate.gradeLevel = dto.gradeLevel;
      if (dto.birthPlace !== undefined) profileUpdate.birthPlace = dto.birthPlace;
      if (dto.certificateNumber !== undefined) profileUpdate.certificateNumber = dto.certificateNumber;
      if (dto.certificateSeriesLetter !== undefined) profileUpdate.certificateSeriesLetter = dto.certificateSeriesLetter;
      if (dto.certificateSeriesNumber !== undefined) profileUpdate.certificateSeriesNumber = dto.certificateSeriesNumber;
      if (dto.issuePlace !== undefined) profileUpdate.issuePlace = dto.issuePlace;
      if (dto.physicalCondition !== undefined) {
        profileUpdate.physicalCondition = dto.physicalCondition;
        profileUpdate.medicalNotes = dto.physicalCondition;
      }
      if (dto.fatherFullName !== undefined) profileUpdate.fatherFullName = dto.fatherFullName;
      if (dto.fatherNationalId !== undefined) profileUpdate.fatherNationalId = dto.fatherNationalId;
      if (dto.fatherEducation !== undefined) profileUpdate.fatherEducation = dto.fatherEducation;
      if (dto.fatherOccupation !== undefined) profileUpdate.fatherOccupation = dto.fatherOccupation;
      if (dto.fatherPhone !== undefined) profileUpdate.fatherPhone = dto.fatherPhone;
      if (dto.fatherWorkAddress !== undefined) profileUpdate.fatherWorkAddress = dto.fatherWorkAddress;
      if (dto.motherFullName !== undefined) profileUpdate.motherFullName = dto.motherFullName;
      if (dto.motherNationalId !== undefined) profileUpdate.motherNationalId = dto.motherNationalId;
      if (dto.motherEducation !== undefined) profileUpdate.motherEducation = dto.motherEducation;
      if (dto.motherOccupation !== undefined) profileUpdate.motherOccupation = dto.motherOccupation;
      if (dto.motherPhone !== undefined) profileUpdate.motherPhone = dto.motherPhone;
      if (dto.motherWorkAddress !== undefined) profileUpdate.motherWorkAddress = dto.motherWorkAddress;
      if (dto.landlinePhone !== undefined) profileUpdate.landlinePhone = dto.landlinePhone;
      if (dto.studentMobile !== undefined) profileUpdate.studentMobile = dto.studentMobile;

      const updated = await tx.studentProfile.update({
        where: { id: profile.id },
        data: profileUpdate,
        include: {
          user: true,
          enrollments: {
            include: {
              classroom: {
                include: {
                  level: true,
                  field: true,
                },
              },
            },
          },
        },
      });

      // 3. Update classroom enrollment if classroomId provided
      if (dto.classroomId) {
        const classroom = await tx.classroom.findFirst({
          where: { id: dto.classroomId, tenantId },
        });
        if (classroom) {
          await tx.classEnrollment.deleteMany({
            where: { studentId: profile.id, tenantId },
          });
          await tx.classEnrollment.create({
            data: {
              tenantId,
              studentId: profile.id,
              classroomId: classroom.id,
              academicYearId: classroom.academicYearId,
            },
          });
        }
      }

      // 4. Automatically sync unified parent account if student credentials or info changed
      await this.syncParentForStudent(tx, tenantId, updated, {
        studentNationalCode: updated.nationalCode,
        fatherFullName: updated.fatherFullName,
        motherFullName: updated.motherFullName,
        fatherPhone: updated.fatherPhone,
        motherPhone: updated.motherPhone,
        phone: updated.user?.phone,
        studentFirstName: updated.user?.firstName,
        studentLastName: updated.user?.lastName,
        occupation: updated.fatherOccupation || updated.motherOccupation,
        education: updated.fatherEducation || updated.motherEducation,
      });

      return tx.studentProfile.findUnique({
        where: { id: profile.id },
        include: {
          user: true,
          enrollments: {
            include: {
              classroom: {
                include: {
                  level: true,
                  field: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async deleteStudent(tenantId: string, studentId: string): Promise<any> {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, tenantId },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundException('دانش‌آموز مورد نظر در این مدرسه یافت نشد');
    }

    const userId = student.userId;

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete student profile (Cascade takes care of enrollments, attendances, matters, homeworks, etc.)
      await tx.studentProfile.delete({
        where: { id: student.id },
      });

      // 2. If user has no other profiles in the system, clean up user account
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          teacherProfile: true,
          staffProfile: true,
          coachProfile: true,
          parentProfile: true,
        },
      });

      if (
        user &&
        !user.teacherProfile &&
        !user.staffProfile &&
        !user.coachProfile &&
        !user.parentProfile
      ) {
        try {
          await tx.user.delete({
            where: { id: userId },
          });
        } catch {
          await tx.user.update({
            where: { id: userId },
            data: { status: 'SUSPENDED' },
          });
        }
      }

      return { success: true, message: 'دانش‌آموز با موفقیت حذف گردید' };
    });
  }

  // 2. Teachers
  async listTeachers(tenantId: string): Promise<any> {
    return this.prisma.teacherProfile.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            nationalId: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
        teacherLessons: {
          include: {
            lesson: {
              include: {
                level: true,
                field: true,
              },
            },
          },
        },
        schedules: {
          include: {
            classroom: true,
            lesson: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTeacher(tenantId: string, dto: CreateTeacherDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const passwordHash = await argon2.hash(creds.finalPassword);
    const encryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
      tenantId,
      creds.finalPassword,
    );

    const createdTeacherResult = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          username: creds.username !== dto.phone ? creds.username : undefined,
          nationalId: creds.nationalId,
          email: dto.email,
          passwordHash,
          encryptedPassword: encryptedPassword || undefined,
          role: Role.TEACHER as any,
          status: 'ACTIVE',
        },
      });

      const teacher = await tx.teacherProfile.create({
        data: {
          tenantId,
          userId: user.id,
          personnelCode: dto.personnelCode,
          speciality: dto.speciality || dto.specialization,
          degree: dto.degree,
          studyField: dto.studyField,
          homeAddress: dto.homeAddress,
          landlinePhone: dto.landlinePhone,
          employmentType: dto.employmentType || 'FULL_TIME',
          bio: dto.bio,
        },
        include: {
          user: true,
        },
      });

      if (dto.lessonIds && Array.isArray(dto.lessonIds) && dto.lessonIds.length > 0) {
        const uniqueLessonIds = Array.from(new Set(dto.lessonIds.filter(Boolean)));
        for (const lessonId of uniqueLessonIds) {
          await tx.teacherLesson.create({
            data: {
              tenantId,
              teacherId: teacher.id,
              lessonId,
            },
          });
        }
      }

      return tx.teacherProfile.findUnique({
        where: { id: teacher.id },
        include: {
          user: true,
          teacherLessons: {
            include: {
              lesson: {
                include: {
                  level: true,
                  field: true,
                },
              },
            },
          },
        },
      });
    });

    // Dispatch Login Credentials SMS to teacher
    if (dto.phone) {
      this.eventEmitter.emit('member.credentials_generated', {
        tenantId,
        fullName: `${dto.firstName} ${dto.lastName}`.trim(),
        phone: dto.phone,
        username: creds.username || creds.nationalId || dto.phone,
        password: creds.finalPassword,
        role: 'TEACHER',
      });
    }

    return createdTeacherResult;
  }

  async assignLessonsToTeacher(tenantId: string, teacherId: string, lessonIds: string[]): Promise<any> {
    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id: teacherId, tenantId },
    });
    if (!teacher) {
      throw new NotFoundException('دبیر مورد نظر در این مدرسه یافت نشد');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.teacherLesson.deleteMany({
        where: { teacherId, tenantId },
      });

      const uniqueLessonIds = Array.from(new Set(lessonIds.filter(Boolean)));
      for (const lessonId of uniqueLessonIds) {
        await tx.teacherLesson.create({
          data: {
            tenantId,
            teacherId,
            lessonId,
          },
        });
      }

      return tx.teacherProfile.findUnique({
        where: { id: teacherId },
        include: {
          user: true,
          teacherLessons: {
            include: {
              lesson: {
                include: {
                  level: true,
                  field: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async updateTeacher(tenantId: string, teacherId: string, dto: UpdateTeacherDto): Promise<any> {
    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id: teacherId, tenantId },
      include: { user: true, teacherLessons: true },
    });
    if (!teacher) {
      throw new NotFoundException('دبیر مورد نظر در این مدرسه یافت نشد');
    }

    if (dto.phone && dto.phone !== teacher.user.phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          tenantId,
          phone: dto.phone,
          id: { not: teacher.userId },
        },
      });
      if (existingPhone) {
        throw new BadRequestException('شماره همراه وارد شده قبلاً برای کاربر دیگری در این مدرسه ثبت شده است');
      }
    }

    if (dto.username && dto.username !== teacher.user.username) {
      const existingUsername = await this.prisma.user.findFirst({
        where: {
          tenantId,
          username: dto.username,
          id: { not: teacher.userId },
        },
      });
      if (existingUsername) {
        throw new BadRequestException('نام کاربری وارد شده قبلاً برای کاربر دیگری در این مدرسه ثبت شده است');
      }
    }

    let passwordHash: string | undefined;
    let encryptedPassword: string | null | undefined;
    if (dto.password && dto.password.trim()) {
      passwordHash = await argon2.hash(dto.password.trim());
      encryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
        tenantId,
        dto.password.trim(),
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update user fields
      const userUpdate: any = {};
      if (dto.firstName !== undefined) userUpdate.firstName = dto.firstName;
      if (dto.lastName !== undefined) userUpdate.lastName = dto.lastName;
      if (dto.phone !== undefined) {
        userUpdate.phone = dto.phone;
        // Keep username synced if username wasn't explicitly changed or was identical to previous phone
        if (!dto.username && teacher.user.username === teacher.user.phone) {
          userUpdate.username = dto.phone;
        }
      }
      if (dto.username !== undefined) userUpdate.username = dto.username;
      if (dto.nationalCode !== undefined) userUpdate.nationalId = dto.nationalCode;
      if (dto.email !== undefined) userUpdate.email = dto.email || null;
      if (dto.status !== undefined) userUpdate.status = dto.status;
      if (passwordHash) {
        userUpdate.passwordHash = passwordHash;
        if (encryptedPassword) {
          userUpdate.encryptedPassword = encryptedPassword;
        }
      }

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: userUpdate,
        });
      }

      // 2. Update teacherProfile fields
      const profileUpdate: any = {};
      if (dto.personnelCode !== undefined) profileUpdate.personnelCode = dto.personnelCode;
      if (dto.degree !== undefined) profileUpdate.degree = dto.degree;
      if (dto.studyField !== undefined) profileUpdate.studyField = dto.studyField;
      if (dto.homeAddress !== undefined) profileUpdate.homeAddress = dto.homeAddress;
      if (dto.landlinePhone !== undefined) profileUpdate.landlinePhone = dto.landlinePhone;
      if (dto.employmentType !== undefined) profileUpdate.employmentType = dto.employmentType;
      if (dto.bio !== undefined) profileUpdate.bio = dto.bio;
      if (dto.speciality !== undefined || dto.specialization !== undefined) {
        profileUpdate.speciality = dto.speciality || dto.specialization;
      }

      if (Object.keys(profileUpdate).length > 0) {
        await tx.teacherProfile.update({
          where: { id: teacher.id },
          data: profileUpdate,
        });
      }

      // 3. Update assigned lessons if lessonIds provided
      if (dto.lessonIds !== undefined && Array.isArray(dto.lessonIds)) {
        await tx.teacherLesson.deleteMany({
          where: { teacherId: teacher.id, tenantId },
        });
        const uniqueLessonIds = Array.from(new Set(dto.lessonIds.filter(Boolean)));
        for (const lessonId of uniqueLessonIds) {
          await tx.teacherLesson.create({
            data: {
              tenantId,
              teacherId: teacher.id,
              lessonId,
            },
          });
        }
      }

      return tx.teacherProfile.findUnique({
        where: { id: teacher.id },
        include: {
          user: true,
          teacherLessons: {
            include: {
              lesson: {
                include: {
                  level: true,
                  field: true,
                },
              },
            },
          },
          schedules: {
            include: {
              classroom: true,
              lesson: true,
            },
          },
        },
      });
    });
  }

  async deleteTeacher(tenantId: string, teacherId: string): Promise<any> {
    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id: teacherId, tenantId },
      include: { user: true },
    });
    if (!teacher) {
      throw new NotFoundException('دبیر مورد نظر در این مدرسه یافت نشد');
    }

    const userId = teacher.userId;

    return this.prisma.$transaction(async (tx) => {
      // 1. Unlink from any split-period / secondTeacher schedules
      await tx.classSchedule.updateMany({
        where: { secondTeacherId: teacher.id },
        data: { secondTeacherId: null, isSplitPeriod: false },
      });

      // 2. Cascade delete teacher relations
      await tx.teacherLesson.deleteMany({
        where: { teacherId: teacher.id },
      });
      await tx.teacherAttendance.deleteMany({
        where: { teacherId: teacher.id },
      });
      await tx.parentVisitSlot.deleteMany({
        where: { teacherId: teacher.id },
      });

      // 3. Delete teacher profile
      await tx.teacherProfile.delete({
        where: { id: teacher.id },
      });

      // 4. If user has no other profiles in the system, clean up user account
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          studentProfile: true,
          staffProfile: true,
          coachProfile: true,
          parentProfile: true,
        },
      });

      if (
        user &&
        !user.studentProfile &&
        !user.staffProfile &&
        !user.coachProfile &&
        !user.parentProfile
      ) {
        try {
          await tx.user.delete({
            where: { id: userId },
          });
        } catch {
          // If foreign keys (e.g. audit logs) prevent hard delete, mark SUSPENDED
          await tx.user.update({
            where: { id: userId },
            data: { status: 'SUSPENDED' },
          });
        }
      }

      return { success: true, message: 'دبیر با موفقیت حذف گردید' };
    });
  }

  // 3. Coaches & Counselors
  async listCoaches(tenantId: string): Promise<any> {
    return this.prisma.coachProfile.findMany({
      where: { tenantId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCoach(tenantId: string, dto: CreateCoachDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const passwordHash = await argon2.hash(creds.finalPassword);
    const encryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
      tenantId,
      creds.finalPassword,
    );

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          username: creds.username !== dto.phone ? creds.username : undefined,
          nationalId: creds.nationalId,
          passwordHash,
          encryptedPassword: encryptedPassword || undefined,
          role: Role.STAFF as any,
          status: 'ACTIVE',
        },
      });

      return tx.coachProfile.create({
        data: {
          tenantId,
          userId: user.id,
          coachType: dto.coachType || 'ACADEMIC_COUNSELOR',
          bio: dto.bio,
        },
        include: {
          user: true,
        },
      });
    });
  }

  // 4. Staff
  async listStaff(tenantId: string): Promise<any> {
    return this.prisma.staffProfile.findMany({
      where: { tenantId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaff(tenantId: string, dto: CreateStaffDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const passwordHash = await argon2.hash(creds.finalPassword);
    const encryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
      tenantId,
      creds.finalPassword,
    );

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          username: creds.username !== dto.phone ? creds.username : undefined,
          nationalId: creds.nationalId,
          passwordHash,
          encryptedPassword: encryptedPassword || undefined,
          role: Role.STAFF as any,
          status: 'ACTIVE',
        },
      });

      return tx.staffProfile.create({
        data: {
          tenantId,
          userId: user.id,
          department: dto.department,
          jobTitle: dto.jobTitle,
        },
        include: {
          user: true,
        },
      });
    });
  }

  // 5. Parents
  async listParents(tenantId: string): Promise<any> {
    return this.prisma.parentProfile.findMany({
      where: { tenantId },
      include: {
        user: true,
        studentLinks: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createParent(tenantId: string, dto: CreateParentDto): Promise<any> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, theme: true, type: true, name: true },
    });

    const creds = generateUnifiedCredentials({
      tenant,
      nationalCode: dto.nationalCode,
      fallbackPhone: dto.phone,
      customPassword: dto.password,
    });

    const passwordHash = await argon2.hash(creds.finalPassword);
    const encryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
      tenantId,
      creds.finalPassword,
    );

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          username: creds.username !== dto.phone ? creds.username : undefined,
          nationalId: creds.nationalId,
          passwordHash,
          encryptedPassword: encryptedPassword || undefined,
          role: Role.PARENT as any,
          status: 'ACTIVE',
        },
      });

      return tx.parentProfile.create({
        data: {
          tenantId,
          userId: user.id,
          occupation: dto.occupation,
          education: dto.education,
          workPhone: dto.workPhone,
          homeAddress: dto.homeAddress,
        },
        include: {
          user: true,
        },
      });
    });
  }

  // 6. Parent-Student Linking
  async linkParentStudent(tenantId: string, dto: LinkParentStudentDto): Promise<any> {
    const parent = await this.prisma.parentProfile.findFirst({
      where: { id: dto.parentId, tenantId },
    });
    if (!parent) {
      throw new NotFoundException('پروفایل والد یافت نشد');
    }

    const student = await this.prisma.studentProfile.findFirst({
      where: { id: dto.studentId, tenantId },
    });
    if (!student) {
      throw new NotFoundException('پروفایل دانش‌آموز یافت نشد');
    }

    const existing = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId: dto.parentId,
        studentId: dto.studentId,
      },
    });
    if (existing) {
      throw new ConflictException('این والد قبلاً به این دانش‌آموز متصل شده است');
    }

    return this.prisma.parentStudentLink.create({
      data: {
        tenantId,
        parentId: dto.parentId,
        studentId: dto.studentId,
        relationType: dto.relationType || 'FATHER',
        isPrimaryContact: dto.isPrimaryContact !== undefined ? dto.isPrimaryContact : false,
      },
      include: {
        parent: { include: { user: true } },
        student: { include: { user: true } },
      },
    });
  }

  async getParentStudents(tenantId: string, parentUserId: string): Promise<any> {
    const parent = await this.prisma.parentProfile.findFirst({
      where: { tenantId, userId: parentUserId },
    });
    if (!parent) {
      throw new NotFoundException('پروفایل والد یافت نشد');
    }

    return this.prisma.parentStudentLink.findMany({
      where: { tenantId, parentId: parent.id },
      include: {
        student: {
          include: {
            user: true,
            enrollments: {
              include: { classroom: true },
            },
          },
        },
      },
    });
  }

  /**
   * همگام‌سازی و ایجاد/به‌روزرسانی خودکار اکانت واحد والد برای یک دانش‌آموز:
   * طبق استاندارد جدید:
   * - به ازای هر دانش‌آموز دقیقاً ۱ اکانت والد وجود دارد (حذف تفکیک پدر و مادر).
   * - نام کاربری سیستمی: p + کد ملی فرزند (ورود با کد ملی فرزند نیز پشتیبانی می‌شود).
   * - رمز عبور: پیش‌وند 'p' + کد ملی فرزند (مثال: p0012345678).
   */
  async syncParentForStudent(
    tx: any,
    tenantId: string,
    studentProfile: any,
    dto: {
      studentNationalCode?: string | null;
      fatherFullName?: string | null;
      motherFullName?: string | null;
      fatherPhone?: string | null;
      motherPhone?: string | null;
      phone?: string | null;
      studentFirstName?: string | null;
      studentLastName?: string | null;
      occupation?: string | null;
      education?: string | null;
    },
  ) {
    const nationalCode = dto.studentNationalCode || studentProfile.nationalCode;
    const rawParentPhone =
      dto.fatherPhone ||
      dto.motherPhone ||
      studentProfile.fatherPhone ||
      studentProfile.motherPhone ||
      null;

    const studentUserPhone = studentProfile.user?.phone || dto.phone || null;
    let parentPhone: string | null = null;
    if (rawParentPhone && rawParentPhone !== studentUserPhone) {
      parentPhone = rawParentPhone;
    }

    const parentCreds = generateParentCredentials({
      studentNationalCode: nationalCode,
      fallbackPhone: parentPhone || undefined,
    });

    const parentPasswordHash = await argon2.hash(parentCreds.finalPassword);
    const parentEncryptedPassword = await this.passwordVaultService.encryptPasswordForTenant(
      tenantId,
      parentCreds.finalPassword,
    );

    // نام والد: ترجیحاً نام پدر یا مادر، در غیر این صورت «ولی دانش‌آموز (نام فرزند)»
    const rawFullName = (dto.fatherFullName || dto.motherFullName || studentProfile.fatherFullName || studentProfile.motherFullName || '').trim();
    let pFirstName = 'ولی دانش‌آموز';
    let pLastName = (dto.studentLastName || studentProfile.user?.lastName || '').trim() || 'صادقی';
    if (rawFullName) {
      const parts = rawFullName.split(' ');
      pFirstName = parts[0];
      pLastName = parts.slice(1).join(' ') || pLastName;
    }

    // بررسی آیا قبلاً والدی به این دانش‌آموز متصل است
    const existingLink = await tx.parentStudentLink.findFirst({
      where: {
        tenantId,
        studentId: studentProfile.id,
      },
      include: {
        parent: {
          include: {
            user: true,
          },
        },
      },
    });

    if (existingLink && existingLink.parent) {
      // به‌روزرسانی اکانت والد موجود
      let updatePhone: string | undefined = undefined;
      if (parentPhone) {
        const phoneOwner = await tx.user.findFirst({
          where: { tenantId, phone: parentPhone, NOT: { id: existingLink.parent.userId } },
        });
        if (!phoneOwner) {
          updatePhone = parentPhone;
        }
      }

      await tx.user.update({
        where: { id: existingLink.parent.userId },
        data: {
          username: parentCreds.username,
          passwordHash: parentPasswordHash,
          encryptedPassword: parentEncryptedPassword || undefined,
          ...(updatePhone ? { phone: updatePhone } : {}),
          ...(rawFullName ? { firstName: pFirstName, lastName: pLastName } : {}),
        },
      });

      return existingLink.parent;
    }

    // اگر وجود نداشت: بررسی آیا کاربری با این username یا phone قبلاً ثبت شده
    let parentUser = await tx.user.findFirst({
      where: {
        tenantId,
        OR: [
          { username: parentCreds.username },
          ...(parentPhone ? [{ phone: parentPhone }] : []),
        ],
      },
      include: { parentProfile: true },
    });

    // اگر کاربر پیدا شد اما والد نبود (مثلا شماره به کاربر دیگری تخصیص داده شده)، نباید از آن شماره استفاده شود
    if (parentUser && parentUser.role !== Role.PARENT) {
      parentUser = await tx.user.findFirst({
        where: {
          tenantId,
          username: parentCreds.username,
        },
        include: { parentProfile: true },
      });
      parentPhone = null;
    }

    if (parentUser) {
      if (!parentUser.parentProfile) {
        const pProfile = await tx.parentProfile.create({
          data: {
            tenantId,
            userId: parentUser.id,
            occupation: dto.occupation || undefined,
            education: dto.education || undefined,
          },
        });
        parentUser.parentProfile = pProfile;
      }
      await tx.user.update({
        where: { id: parentUser.id },
        data: {
          passwordHash: parentPasswordHash,
          encryptedPassword: parentEncryptedPassword || undefined,
        },
      });
    } else {
      let createPhone = parentPhone;
      if (createPhone) {
        const phoneOwner = await tx.user.findFirst({
          where: { tenantId, phone: createPhone },
        });
        if (phoneOwner) {
          createPhone = null;
        }
      }

      parentUser = await tx.user.create({
        data: {
          tenantId,
          firstName: pFirstName,
          lastName: pLastName,
          phone: createPhone,
          username: parentCreds.username,
          passwordHash: parentPasswordHash,
          encryptedPassword: parentEncryptedPassword || undefined,
          role: Role.PARENT as any,
          status: 'ACTIVE',
        },
      });

      const pProfile = await tx.parentProfile.create({
        data: {
          tenantId,
          userId: parentUser.id,
          occupation: dto.occupation || undefined,
          education: dto.education || undefined,
        },
      });
      parentUser.parentProfile = pProfile;
    }

    // اتصال والد به دانش‌آموز
    await tx.parentStudentLink.create({
      data: {
        tenantId,
        parentId: parentUser.parentProfile.id,
        studentId: studentProfile.id,
        relationType: 'LEGAL_GUARDIAN',
        isPrimaryContact: true,
      },
    });

    return parentUser.parentProfile;
  }
}
