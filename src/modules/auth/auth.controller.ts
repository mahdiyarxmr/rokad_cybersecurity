import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { SessionService } from './session.service';
import { RegisterSchoolDto } from './dto/register-school.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  ChangePasswordDto,
  DisableTwoFactorDto,
  EnableTwoFactorDto,
  StepUpVerifyDto,
  VerifyTwoFactorDto,
} from './dto/security.dto';
import {
  RevealPasswordDto,
  SetupVaultKeyDto,
  BackfillVaultDto,
} from './dto/password-vault.dto';
import { PasswordVaultService } from './password-vault.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { StepUpGuard } from '../../common/guards/step-up.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Role } from '../../common/constants';
import { UseInterceptors } from '@nestjs/common';
import { AuthCookieInterceptor } from '../../common/interceptors/auth-cookie.interceptor';

@ApiTags('Authentication')
@UseInterceptors(AuthCookieInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly sessionService: SessionService,
    private readonly passwordVaultService: PasswordVaultService,
  ) {}

  @Public()
  @Post('register-school')
  @ApiOperation({ summary: 'ثبت‌نام مدرسه جدید و ساخت مدیر اولیه (Onboarding)' })
  async registerSchool(
    @Body() dto: RegisterSchoolDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.registerSchool(dto, ip, userAgent);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'ورود چندمستأجری کاربران (مدیر، معلم، دانش‌آموز، والدین)' })
  async login(
    @Body() dto: LoginDto,
    @CurrentTenant('id') tenantId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(dto, tenantId, ip, userAgent);
  }

  @Public()
  @Post('2fa/verify-login')
  @ApiOperation({ summary: 'تکمیل ورود دو مرحله‌ای با کد ۶ رقمی TOTP یا کد بازیابی' })
  async verifyTwoFactorLogin(
    @Body() dto: VerifyTwoFactorDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.verifyTwoFactorLogin(dto, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'نوسازی توکن با مکانیزم Token Family Rotation' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.refreshToken(dto, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('download-ticket')
  @ApiOperation({ summary: 'بلیت ۶۰ثانیه‌ای دانلود، بدون قرار دادن توکن دسترسی در URL' })
  async downloadTicket(@CurrentUser() user: any) {
    return this.authService.issueDownloadTicket({
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      isPlatformAdmin: !!user.isPlatformAdmin,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'خروج از حساب و باطل‌سازی سشن امنیتی' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.authService.logout(dto?.refreshToken, userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'دریافت مشخصات کاربر لاگین‌شده و مدرسه جاری' })
  async getProfile(
    @CurrentUser() user: any,
    @CurrentTenant() tenant: any,
  ) {
    return {
      user,
      tenant,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my-schools')
  @ApiOperation({ summary: 'لیست مدارسی که کاربر جاری در آن‌ها حساب کاربری دارد' })
  async getMySchools(@CurrentUser('phone') phone: string) {
    return this.authService.getUserSchools(phone);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('switch-school')
  @ApiOperation({ summary: 'تغییر شعبه/مدرسه برای راهبرانی که به چند مرکز دسترسی دارند' })
  async switchSchool(
    @CurrentUser('id') userId: string,
    @Body('targetTenantSlug') targetTenantSlug: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.switchSchool(userId, targetTenantSlug, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('profile')
  @ApiOperation({ summary: 'ویرایش اطلاعات نمایه کاربر (تصویر، نام و ...)' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: { avatarUrl?: string; firstName?: string; lastName?: string },
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  // ==========================================
  // TWO-FACTOR AUTHENTICATION (TOTP RFC 6238)
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/setup')
  @ApiOperation({ summary: 'تولید کلید مخفی و تصویر QR Code جهت راه‌اندازی 2FA' })
  async setup2FA(@CurrentUser('id') userId: string) {
    return this.twoFactorService.generateSetup(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/enable')
  @ApiOperation({ summary: 'تأیید و فعال‌سازی احراز هویت دومرحله‌ای با کد آزمایشی' })
  async enable2FA(
    @CurrentUser('id') userId: string,
    @Body() dto: EnableTwoFactorDto,
  ) {
    return this.twoFactorService.enable2FA(userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/disable')
  @ApiOperation({ summary: 'غیرفعال‌سازی احراز هویت دومرحله‌ای با رمز عبور' })
  async disable2FA(
    @CurrentUser('id') userId: string,
    @Body() dto: DisableTwoFactorDto,
  ) {
    return this.twoFactorService.disable2FA(userId, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('2fa/step-up')
  @ApiOperation({ summary: 'تأیید مجدد هویت امنیتی (Step-up Auth) برای ورود به مود حساس' })
  async verifyStepUp(
    @CurrentUser('id') userId: string,
    @Body() dto: StepUpVerifyDto,
    @Ip() ip: string,
  ) {
    return this.twoFactorService.verifyStepUp(userId, dto.code, ip);
  }

  // ==========================================
  // PASSWORD MANAGEMENT & SESSION REVOCATION
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  @ApiOperation({ summary: 'تغییر رمز عبور با ابطال خودکار کلیه سشن‌های دیگر' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @Headers('x-refresh-token') currentRefreshToken?: string,
  ) {
    return this.authService.changePassword(userId, dto, currentRefreshToken);
  }

  // ==========================================
  // ACTIVE SESSIONS & DEVICE MANAGEMENT
  // ==========================================

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'مشاهده لیست نشست‌ها و دستگاه‌های فعال کاربر جاری' })
  async getSessions(
    @CurrentUser('id') userId: string,
    @Headers('x-refresh-token') currentRefreshToken?: string,
  ) {
    return this.sessionService.getUserSessions(userId, currentRefreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('sessions/:id')
  @ApiOperation({ summary: 'خاتمه دادن به یک نشست مشخص' })
  async revokeSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    return this.sessionService.revokeSession(userId, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('sessions/revoke-others')
  @ApiOperation({ summary: 'خروج اضطراری از تمام دستگاه‌های دیگر' })
  async revokeAllOtherSessions(
    @CurrentUser('id') userId: string,
    @Headers('x-refresh-token') currentRefreshToken?: string,
  ) {
    return this.sessionService.revokeAllOtherSessions(userId, currentRefreshToken);
  }

  // ==========================================
  // SUPER-ADMIN SESSIONS MANAGEMENT (STEP-UP PROTECTED!)
  // Requirement 5: Step-Up Authentication Required
  // ==========================================

  @UseGuards(JwtAuthGuard, RolesGuard, StepUpGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiBearerAuth()
  @Get('admin/users/:userId/sessions')
  @ApiOperation({ summary: 'مشاهده نشست‌های کاربر دیگر توسط ادمین (نیازمند Step-up 2FA)' })
  async adminGetUserSessions(
    @CurrentUser() actor: any,
    @Param('userId') targetUserId: string,
  ) {
    await this.sessionService.assertSameTenant(actor, targetUserId);
    return this.sessionService.getUserSessions(targetUserId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, StepUpGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiBearerAuth()
  @Delete('admin/users/:userId/sessions/:sessionId')
  @ApiOperation({ summary: 'ابطال نشست کاربر دیگر توسط ادمین (نیازمند Step-up 2FA)' })
  async adminRevokeUserSession(
    @CurrentUser() actor: any,
    @Param('userId') targetUserId: string,
    @Param('sessionId') sessionId: string,
  ) {
    await this.sessionService.assertSameTenant(actor, targetUserId);
    return this.sessionService.revokeSession(targetUserId, sessionId);
  }

  // ==========================================
  // PASSWORD VAULT (ZERO-KNOWLEDGE ENVELOPE ENCRYPTION)
  // ==========================================

  @UseGuards(JwtAuthGuard, RolesGuard, StepUpGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiBearerAuth()
  @Post('vault/reveal-password')
  @ApiOperation({ summary: 'بازیابی و مشاهده رمز عبور کاربر با استفاده از کلید مستر مدیر' })
  async revealPassword(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: RevealPasswordDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.passwordVaultService.revealPassword(
      adminUserId,
      dto.targetUserId,
      dto.masterKey,
      ip,
      userAgent,
      dto.reason,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiBearerAuth()
  @Post('vault/setup-key')
  @ApiOperation({ summary: 'تنظیم یا تغییر کلید مستر گاوصندوق رمزهای مدرسه' })
  async setupMasterKey(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('isPlatformAdmin') isPlatformAdmin: boolean,
    @Body() dto: SetupVaultKeyDto,
  ) {
    return this.passwordVaultService.setupMasterKey(
      tenantId,
      dto.newMasterKey,
      dto.currentMasterKey,
      isPlatformAdmin,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiBearerAuth()
  @Post('vault/backfill')
  @ApiOperation({ summary: 'رمزنگاری و ثبت رمزهای اعضای قبلی در گاوصندوق' })
  async backfillPasswords(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser('isPlatformAdmin') isPlatformAdmin: boolean,
    @Body() dto: BackfillVaultDto,
  ) {
    const targetTenantId = (isPlatformAdmin && dto.tenantId) ? dto.tenantId : tenantId;
    return this.passwordVaultService.backfillTenantPasswords(targetTenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiBearerAuth()
  @Get('vault/status')
  @ApiOperation({ summary: 'استعلام وضعیت گاوصندوق رمزها و درصد پوشش اعضا' })
  async getVaultStatus(
    @CurrentTenant('id') tenantId: string,
  ) {
    return this.passwordVaultService.getVaultStatus(tenantId);
  }
}
