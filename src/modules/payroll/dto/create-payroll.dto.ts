import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContractType, PayrollItemType } from '@prisma/client';

export class UpdateStaffPayrollProfileDto {
  @ApiProperty({
    description: 'نوع قرارداد (FULL_TIME_SALARY, HOURLY_TEACHER, CONTRACTUAL)',
    enum: ContractType,
    default: ContractType.FULL_TIME_SALARY,
  })
  @IsEnum(ContractType)
  contractType: ContractType;

  @ApiProperty({ description: 'حقوق ثابت ماهیانه (تومان)', example: 18000000 })
  @IsNumber()
  @Min(0)
  baseMonthlySalary: number;

  @ApiPropertyOptional({ description: 'نرخ هر ساعت تدریس برای معلمان ساعتی (تومان)', example: 250000 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'شماره حساب بانکی' })
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'شماره شبا (با IR یا بدون آن)' })
  @IsString()
  @IsOptional()
  bankShebaNumber?: string;

  @ApiPropertyOptional({ description: 'نام بانک' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ description: 'شماره بیمه تامین اجتماعی' })
  @IsString()
  @IsOptional()
  insuranceNumber?: string;

  @ApiPropertyOptional({ description: 'وضعیت فعال بودن پروفایل', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreatePayrollItemDto {
  @ApiProperty({
    description: 'نوع ردیف حقوق (BASE_SALARY, HOURLY_TEACHING, BONUS, OVERTIME, INSURANCE_DEDUCTION, TAX_DEDUCTION, ADVANCE_DEDUCTION, OTHER)',
    enum: PayrollItemType,
  })
  @IsEnum(PayrollItemType)
  type: PayrollItemType;

  @ApiProperty({ description: 'عنوان ردیف', example: 'حقوق پایه آبان‌ماه' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'مبلغ (مثبت برای دریافتی‌ها، منفی برای کسورات)', example: 18000000 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'تعداد ساعت یا ضریب', example: 40 })
  @IsNumber()
  @IsOptional()
  multiplierOrHours?: number;

  @ApiPropertyOptional({ description: 'توضیحات' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class GeneratePayrollSlipDto {
  @ApiProperty({ description: 'شناسه کاربری پرسنل / معلم' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'سال فیش حقوقی', example: 1404 })
  @IsInt()
  @Min(1400)
  @Max(1450)
  year: number;

  @ApiProperty({ description: 'ماه فیش حقوقی (۱ تا ۱۲)', example: 8 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({
    description: 'آیتم‌ها و ردیف‌های سفارشی فیش (در صورت خالی بودن خودکار از روی پروفایل محاسبه می‌شود)',
    type: [CreatePayrollItemDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePayrollItemDto)
  customItems?: CreatePayrollItemDto[];
}

export class ApproveAndPaySlipDto {
  @ApiProperty({ description: 'شماره پیگیری پرداخت بانکی / پایا' })
  @IsString()
  @IsNotEmpty()
  paymentRefNumber: string;
}

export class CreateTeacherContractDto {
  @ApiProperty({ description: 'شناسه کاربری مدرس (User ID)' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ description: 'شناسه سال تحصیلی' })
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @ApiProperty({
    description: 'نوع نرخ پرداخت (HOURLY یا PER_SESSION)',
    enum: ['HOURLY', 'PER_SESSION'],
    default: 'HOURLY',
  })
  @IsEnum(['HOURLY', 'PER_SESSION'])
  rateType: 'HOURLY' | 'PER_SESSION';

  @ApiProperty({ description: 'مبلغ نرخ هر ساعت یا هر جلسه به تومان (عدد صحیح)', example: 350000 })
  @IsInt()
  @Min(0)
  rateAmount: number;

  @ApiPropertyOptional({ description: 'سقف ساعت تدریس ماهانه جهت هشدار', example: 120 })
  @IsInt()
  @IsOptional()
  @Min(1)
  monthlyHourCap?: number;

  @ApiPropertyOptional({ description: 'حقوق ثابت پایه ماهانه (تومان)', example: 5000000 })
  @IsInt()
  @IsOptional()
  @Min(0)
  baseSalary?: number;

  @ApiProperty({ description: 'تاریخ شروع اعتبار قرارداد (فرمت YYYY-MM-DD یا ISO)' })
  @IsString()
  @IsNotEmpty()
  effectiveFrom: string;

  @ApiPropertyOptional({ description: 'تاریخ پایان اعتبار قرارداد (اختیاری)' })
  @IsString()
  @IsOptional()
  effectiveTo?: string;
}

export class CalculateMonthlyPayrollDto {
  @ApiProperty({ description: 'سال شمسی مورد نظر', example: 1404 })
  @IsInt()
  @Min(1400)
  @Max(1450)
  year: number;

  @ApiProperty({ description: 'ماه شمسی مورد نظر (۱ تا ۱۲)', example: 8 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({ description: 'شناسه سال تحصیلی (اختیاری؛ پیش‌فرض سال تحصیلی جاری)' })
  @IsString()
  @IsOptional()
  academicYearId?: string;
}

export class ReviewPayrollSlipDto {
  @ApiProperty({ description: 'مبلغ نهایی پرداختی تصویب‌شده به تومان (عدد صحیح)', example: 24500000 })
  @IsInt()
  @Min(0)
  finalAmount: number;

  @ApiProperty({ description: 'دلیل ویرایش عدد نهایی (الزامی جهت شفافیت و ممیزی)', example: 'اضافه تدریس کارگاه حل تمرین' })
  @IsString()
  @IsNotEmpty()
  editReason: string;
}

export class CancelPayrollSlipDto {
  @ApiProperty({ description: 'دلیل ابطال فیش حقوقی', example: 'اشتباه در تخصیص ساعت و نیاز به محاسبه مجدد' })
  @IsString()
  @IsNotEmpty()
  cancelReason: string;
}

export class FinalizeMonthlyPayrollDto {
  @ApiProperty({ description: 'سال شمسی مورد نظر', example: 1404 })
  @IsInt()
  @Min(1400)
  @Max(1450)
  year: number;

  @ApiProperty({ description: 'ماه شمسی مورد نظر (۱ تا ۱۲)', example: 8 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}

export class CreatePayrollAdjustmentDto {
  @ApiProperty({ description: 'شناسه کاربری مدرس' })
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiPropertyOptional({ description: 'شناسه فیش حقوقی مبدأ (در صورت وجود)' })
  @IsString()
  @IsOptional()
  originalSlipId?: string;

  @ApiProperty({ description: 'مبلغ تعدیل به تومان (مثبت برای بستانکاری/طلب، منفی برای کسورات/بدهی)', example: 500000 })
  @IsInt()
  amount: number;

  @ApiProperty({ description: 'دلیل اصلاحیه و تعدیل حقوق', example: 'اصلاح عدم ثبت یک جلسه تدریس در ماه گذشته' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
