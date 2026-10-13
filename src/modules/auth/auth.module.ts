import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TwoFactorService } from './two-factor.service';
import { SessionService } from './session.service';
import { PasswordVaultService } from './password-vault.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { StepUpGuard } from '../../common/guards/step-up.guard';
import { AuthCookieInterceptor } from '../../common/interceptors/auth-cookie.interceptor';
import { resolveSecret } from '../../common/security/security-policy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: resolveSecret(
          'JWT_ACCESS_SECRET',
          configService.get<string>('JWT_ACCESS_SECRET'),
        ),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    SessionService,
    PasswordVaultService,
    JwtStrategy,
    JwtAuthGuard,
    StepUpGuard,
  ],
  exports: [
    AuthService,
    TwoFactorService,
    SessionService,
    PasswordVaultService,
    JwtAuthGuard,
    StepUpGuard,
    JwtModule,
  ],
})
export class AuthModule {}
