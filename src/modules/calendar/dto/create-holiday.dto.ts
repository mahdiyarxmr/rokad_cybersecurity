import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsJalaliDate } from '../../../common/decorators/is-jalali-date.decorator';

export class CreateTenantHolidayDto {
  @ApiProperty({ description: 'تاریخ تعطیلی (شمسی یا میلادی استاندارد)', example: '1404-08-15' })
  @IsNotEmpty({ message: 'تاریخ تعطیلی الزامی است' })
  @IsJalaliDate({ message: 'فرمت تاریخ شمسی معتبر نیست (مثال: ۱۴۰۴-۰۸-۱۵)' })
  date: string;

  @ApiProperty({ description: 'عنوان یا دلیل تعطیلی', example: 'روز اردو و بازدید استانی' })
  @IsNotEmpty({ message: 'عنوان تعطیلی الزامی است' })
  @IsString()
  titleFa: string;
}

export class CreateOfficialHolidayDto {
  @ApiProperty({ description: 'تاریخ تعطیل رسمی کشور (شمسی یا میلادی)', example: '1404-01-01' })
  @IsNotEmpty({ message: 'تاریخ تعطیلی الزامی است' })
  @IsJalaliDate({ message: 'فرمت تاریخ شمسی معتبر نیست (مثال: ۱۴۰۴-۰۱-۰۱)' })
  date: string;

  @ApiProperty({ description: 'عنوان مناسبت ملی یا مذهبی', example: 'جشن نوروز / سال نو' })
  @IsNotEmpty({ message: 'عنوان تعطیلی الزامی است' })
  @IsString()
  titleFa: string;
}
