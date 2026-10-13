import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  Gender,
  CoachType,
  EmploymentType,
  ParentRelationType,
} from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ description: 'نام دانش‌آموز', example: 'امیرعلی' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی دانش‌آموز', example: 'صادقی' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه دانش‌آموز یا والد', example: '09123456780' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'شماره دانش‌آموزی یکتا (معادل کد ملی بدون صفر)', example: '12345678' })
  @IsString()
  @IsOptional()
  studentCode?: string;

  @ApiPropertyOptional({ description: 'شماره دانش‌آموزی (معادل کد ملی بدون صفر)' })
  @IsString()
  @IsOptional()
  studentNumber?: string;

  @ApiPropertyOptional({ description: 'شناسه کلاس جهت انتساب خودکار' })
  @IsString()
  @IsOptional()
  classroomId?: string;

  @ApiPropertyOptional({ description: 'کد ملی دانش‌آموز', example: '0012345678' })
  @IsString()
  @IsOptional()
  nationalCode?: string;

  @ApiPropertyOptional({ description: 'نام پدر', example: 'حسین' })
  @IsString()
  @IsOptional()
  fatherName?: string;

  @ApiPropertyOptional({ description: 'جنسیت (MALE, FEMALE, OTHER)', enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ description: 'تاریخ تولد', example: '2008-05-12T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'آدرس منزل' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'نکات پزشکی یا انضباطی' })
  @IsString()
  @IsOptional()
  medicalNotes?: string;

  // --- فیلدهای شناسنامه‌ای و هویتی (مطابق SAMPLE.xlsx) ---
  @ApiPropertyOptional({ description: 'پایه تحصیلی', example: 'دهم' })
  @IsString()
  @IsOptional()
  gradeLevel?: string;

  @ApiPropertyOptional({ description: 'محل تولد', example: 'تهران' })
  @IsString()
  @IsOptional()
  birthPlace?: string;

  @ApiPropertyOptional({ description: 'سریال شناسنامه', example: '123456' })
  @IsString()
  @IsOptional()
  certificateNumber?: string;

  @ApiPropertyOptional({ description: 'سری حرفی شناسنامه', example: 'الف' })
  @IsString()
  @IsOptional()
  certificateSeriesLetter?: string;

  @ApiPropertyOptional({ description: 'سری عددی شناسنامه', example: '12' })
  @IsString()
  @IsOptional()
  certificateSeriesNumber?: string;

  @ApiPropertyOptional({ description: 'محل صدور شناسنامه', example: 'تهران' })
  @IsString()
  @IsOptional()
  issuePlace?: string;

  @ApiPropertyOptional({ description: 'وضعیت جسمانی و سلامت', example: 'سالم' })
  @IsString()
  @IsOptional()
  physicalCondition?: string;

  // --- مشخصات پدر ---
  @ApiPropertyOptional({ description: 'نام و نام‌خانوادگی پدر', example: 'حسین صادقی' })
  @IsString()
  @IsOptional()
  fatherFullName?: string;

  @ApiPropertyOptional({ description: 'کد ملی پدر', example: '0054321987' })
  @IsString()
  @IsOptional()
  fatherNationalId?: string;

  @ApiPropertyOptional({ description: 'تحصیلات پدر', example: 'کارشناسی ارشد' })
  @IsString()
  @IsOptional()
  fatherEducation?: string;

  @ApiPropertyOptional({ description: 'شغل پدر', example: 'مهندس عمران' })
  @IsString()
  @IsOptional()
  fatherOccupation?: string;

  @ApiPropertyOptional({ description: 'شماره همراه پدر', example: '09121112233' })
  @IsString()
  @IsOptional()
  fatherPhone?: string;

  @ApiPropertyOptional({ description: 'آدرس محل کار پدر' })
  @IsString()
  @IsOptional()
  fatherWorkAddress?: string;

  // --- مشخصات مادر ---
  @ApiPropertyOptional({ description: 'نام و نام‌خانوادگی مادر', example: 'مریم حسینی' })
  @IsString()
  @IsOptional()
  motherFullName?: string;

  @ApiPropertyOptional({ description: 'کد ملی مادر', example: '0065432198' })
  @IsString()
  @IsOptional()
  motherNationalId?: string;

  @ApiPropertyOptional({ description: 'تحصیلات مادر', example: 'کارشناسی' })
  @IsString()
  @IsOptional()
  motherEducation?: string;

  @ApiPropertyOptional({ description: 'شغل مادر', example: 'معلم' })
  @IsString()
  @IsOptional()
  motherOccupation?: string;

  @ApiPropertyOptional({ description: 'شماره همراه مادر', example: '09124445566' })
  @IsString()
  @IsOptional()
  motherPhone?: string;

  @ApiPropertyOptional({ description: 'آدرس محل کار مادر' })
  @IsString()
  @IsOptional()
  motherWorkAddress?: string;

  // --- سکونت و ارتباطات ---
  @ApiPropertyOptional({ description: 'آدرس منزل' })
  @IsString()
  @IsOptional()
  homeAddress?: string;

  @ApiPropertyOptional({ description: 'شماره ثابت منزل', example: '02188776655' })
  @IsString()
  @IsOptional()
  landlinePhone?: string;

  @ApiPropertyOptional({ description: 'شماره همراه خود دانش‌آموز', example: '09351234567' })
  @IsString()
  @IsOptional()
  studentMobile?: string;

  @ApiPropertyOptional({ description: 'لینک یا نام عکس پرسنلی' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateTeacherDto {
  @ApiProperty({ description: 'نام دبیر', example: 'محسن' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی دبیر', example: 'رضایی' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه دبیر', example: '09123456781' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'کد ملی (نام کاربری ورود یکپارچه)', example: '0012345678' })
  @IsString()
  @IsOptional()
  nationalCode?: string;

  @ApiPropertyOptional({ description: 'کد پرسنلی' })
  @IsString()
  @IsOptional()
  personnelCode?: string;

  @ApiPropertyOptional({ description: 'ایمیل دبیر', example: 'rezaei@rokadschool.ir' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'تخصص تدریس', example: 'فیزیک کوانتوم و کنکور' })
  @IsString()
  @IsOptional()
  speciality?: string;

  @ApiPropertyOptional({ description: 'تخصص تدریس (نام دیگر)' })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiPropertyOptional({ description: 'مدرک تحصیلی', example: 'کارشناسی ارشد' })
  @IsString()
  @IsOptional()
  degree?: string;

  @ApiPropertyOptional({ description: 'رشته تحصیلی', example: 'آموزش ریاضی' })
  @IsString()
  @IsOptional()
  studyField?: string;

  @ApiPropertyOptional({ description: 'آدرس منزل', example: 'مشهد، بلوار سجاد' })
  @IsString()
  @IsOptional()
  homeAddress?: string;

  @ApiPropertyOptional({ description: 'شماره تلفن ثابت منزل', example: '05137654321' })
  @IsString()
  @IsOptional()
  landlinePhone?: string;

  @ApiPropertyOptional({
    description: 'نوع قرارداد (FULL_TIME, PART_TIME, HOURLY, CONTRACT)',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'رزومه یا بیوگرافی' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'شناسه‌های دروس تدریسی دبیر', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  lessonIds?: string[];
}

export class UpdateTeacherDto extends PartialType(CreateTeacherDto) {
  @ApiPropertyOptional({ description: 'وضعیت کاربر در سامانه', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'نام کاربری سامانه' })
  @IsString()
  @IsOptional()
  username?: string;
}

export class AssignTeacherLessonsDto {
  @ApiProperty({ description: 'لیست شناسه‌های دروس اختصاص‌یافته به دبیر', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  lessonIds: string[];
}

export class CreateCoachDto {
  @ApiProperty({ description: 'نام مربی / مشاور', example: 'سارا' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی مربی / مشاور', example: 'کریمی' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه', example: '09123456782' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'کد ملی (نام کاربری ورود یکپارچه)', example: '0012345678' })
  @IsString()
  @IsOptional()
  nationalCode?: string;

  @ApiPropertyOptional({
    description: 'نوع مربیگری (ACADEMIC_COUNSELOR, DISCIPLINARY, SPORTS, CULTURAL, HEALTH)',
    enum: CoachType,
    default: CoachType.ACADEMIC_COUNSELOR,
  })
  @IsEnum(CoachType)
  @IsOptional()
  coachType?: CoachType;

  @ApiPropertyOptional({ description: 'بیوگرافی یا زمینه مشاوره' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateStaffDto {
  @ApiProperty({ description: 'نام کارمند', example: 'رضا' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی کارمند', example: 'نوری' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه', example: '09123456783' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'کد ملی (نام کاربری ورود یکپارچه)', example: '0012345678' })
  @IsString()
  @IsOptional()
  nationalCode?: string;

  @ApiPropertyOptional({ description: 'دپارتمان یا واحد اداری', example: 'امور دفتری و ثبت‌نام' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'عنوان شغلی', example: 'مسئول بایگانی' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class CreateParentDto {
  @ApiProperty({ description: 'نام ولی دانش‌آموز', example: 'حسین' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'نام خانوادگی ولی', example: 'صادقی' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'شماره همراه ولی', example: '09123456784' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'کد ملی (نام کاربری ورود یکپارچه)', example: '0012345678' })
  @IsString()
  @IsOptional()
  nationalCode?: string;

  @ApiPropertyOptional({ description: 'شغل ولی', example: 'مهندس عمران' })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({ description: 'میزان تحصیلات', example: 'کارشناسی' })
  @IsString()
  @IsOptional()
  education?: string;

  @ApiPropertyOptional({ description: 'تلفن محل کار' })
  @IsString()
  @IsOptional()
  workPhone?: string;

  @ApiPropertyOptional({ description: 'آدرس منزل' })
  @IsString()
  @IsOptional()
  homeAddress?: string;

  @ApiPropertyOptional({ description: 'رمز عبور (پیش‌فرض: شماره همراه)' })
  @IsString()
  @IsOptional()
  password?: string;
}

export class LinkParentStudentDto {
  @ApiProperty({ description: 'شناسه پروفایل والد' })
  @IsString()
  @IsNotEmpty()
  parentId: string;

  @ApiProperty({ description: 'شناسه پروفایل دانش‌آموز' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({
    description: 'نوع نسبت (FATHER, MOTHER, LEGAL_GUARDIAN)',
    enum: ParentRelationType,
    default: ParentRelationType.FATHER,
  })
  @IsEnum(ParentRelationType)
  @IsOptional()
  relationType?: ParentRelationType;

  @ApiPropertyOptional({ description: 'آیا مخاطب اصلی برای پیامک و اعلان‌ها است؟', default: true })
  @IsBoolean()
  @IsOptional()
  isPrimaryContact?: boolean;
}
