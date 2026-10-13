import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RevealPasswordDto {
  @ApiProperty({ description: 'شناسه کاربری که رمز عبور او بازیابی می‌شود' })
  @IsUUID('4', { message: 'شناسه کاربر نامعتبر است' })
  @IsNotEmpty({ message: 'شناسه کاربر الزامی است' })
  targetUserId: string;

  @ApiProperty({ description: 'کلید امنیتی مستر مدیر مدرسه جهت رمزگشایی' })
  @IsString({ message: 'کلید امنیتی باید یک رشته متنی باشد' })
  @IsNotEmpty({ message: 'کلید امنیتی الزامی است' })
  @MinLength(6, { message: 'کلید امنیتی باید حداقل ۶ کاراکتر باشد' })
  masterKey: string;

  @ApiPropertyOptional({ description: 'دلیل مشاهده رمز عبور جهت درج در لاگ حسابرسی' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SetupVaultKeyDto {
  @ApiProperty({ description: 'کلید مستر جدید برای گاوصندوق رمزهای مدرسه' })
  @IsString()
  @IsNotEmpty({ message: 'کلید مستر جدید الزامی است' })
  @MinLength(8, { message: 'کلید مستر باید حداقل ۸ کاراکتر باشد' })
  newMasterKey: string;

  @ApiPropertyOptional({ description: 'کلید مستر قبلی (در صورت تغییر کلید)' })
  @IsOptional()
  @IsString()
  currentMasterKey?: string;
}

export class BackfillVaultDto {
  @ApiPropertyOptional({ description: 'شناسه مدرسه (اختیاری، برای ادمین کل سامانه)' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
