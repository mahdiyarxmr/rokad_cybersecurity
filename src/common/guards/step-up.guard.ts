import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TwoFactorService } from '../../modules/auth/two-factor.service';

@Injectable()
export class StepUpGuard implements CanActivate {
  // 10 minutes grace period
  private readonly STEP_UP_WINDOW_MS = 10 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('ابتدا باید وارد سیستم شوید');
    }

    // Check if an immediate Step-Up code header is provided: 'x-step-up-code'
    const immediateCode = request.headers['x-step-up-code'] as string;
    if (immediateCode) {
      const isValid = await this.twoFactorService.verify2FAToken(user.id, immediateCode);
      if (isValid) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { twoFactorLastStepUpAt: new Date() },
        });
        return true;
      } else {
        throw new ForbiddenException({
          success: false,
          statusCode: 403,
          requiresStepUp: true,
          message: 'کد احراز هویت مرحله‌ای وارد شده نادرست است',
        });
      }
    }

    // Check last step-up verification timestamp from database
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorLastStepUpAt: true,
      },
    });

    if (!dbUser?.twoFactorEnabled) {
      // User must first enable 2FA to access sensitive functions
      throw new ForbiddenException({
        success: false,
        statusCode: 403,
        requiresTwoFactorSetup: true,
        message: 'برای دسترسی به این بخش حساس، فعال‌سازی احراز هویت دومرحله‌ای (2FA) در حساب شما الزامی است',
      });
    }

    const lastStepUp = dbUser.twoFactorLastStepUpAt ? new Date(dbUser.twoFactorLastStepUpAt).getTime() : 0;
    const isWithinWindow = Date.now() - lastStepUp < this.STEP_UP_WINDOW_MS;

    if (!isWithinWindow) {
      throw new ForbiddenException({
        success: false,
        statusCode: 403,
        requiresStepUp: true,
        message: 'این عملیات حساس نیازمند تأیید مجدد کد احراز هویت دو مرحله‌ای (Step-up Auth) می‌باشد',
      });
    }

    return true;
  }
}
