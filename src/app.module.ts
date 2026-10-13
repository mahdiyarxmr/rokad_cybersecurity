import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { TenantBindingGuard } from './common/guards/tenant-binding.guard';

import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { StorageModule } from './common/storage/storage.module';
import { EncryptionModule } from './common/crypto/encryption.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthModule } from './modules/health/health.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AcademicModule } from './modules/academic/academic.module';
import { ClassesModule } from './modules/classes/classes.module';
import { MembersModule } from './modules/members/members.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { PollsModule } from './modules/polls/polls.module';
import { ParentVisitsModule } from './modules/parent-visits/parent-visits.module';
import { MattersModule } from './modules/matters/matters.module';
import { LessonPlansModule } from './modules/lesson-plans/lesson-plans.module';
import { QuestionBankModule } from './modules/question-bank/question-bank.module';
import { ExamsModule } from './modules/exams/exams.module';
import { GradebookModule } from './modules/gradebook/gradebook.module';
import { LearningMaterialsModule } from './modules/learning-materials/learning-materials.module';
import { ChatModule } from './modules/chat/chat.module';
import { FinanceModule } from './modules/finance/finance.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { SaasAdminModule } from './modules/saas-admin/saas-admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CoachingModule } from './modules/coaching/coaching.module';
import { MessagesModule } from './modules/messages/messages.module';
import { AppController } from './app.controller';
import { KaModule } from './modules/ka/ka.module';
import { SmsModule } from './modules/sms/sms.module';
import { ClubModule } from './modules/club/club.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    PrismaModule,
    RedisModule,
    EncryptionModule,
    StorageModule,
    AuditLogModule,
    FeatureFlagsModule,
    TenantsModule,
    AuthModule,
    HealthModule,
    RbacModule,
    AcademicModule,
    ClassesModule,
    MembersModule,
    ProfilesModule,
    AttendanceModule,
    HomeworkModule,
    CalendarModule,
    PollsModule,
    ParentVisitsModule,
    MattersModule,
    LessonPlansModule,
    QuestionBankModule,
    ExamsModule,
    GradebookModule,
    LearningMaterialsModule,
    ChatModule,
    FinanceModule,
    PayrollModule,
    SaasAdminModule,
    NotificationsModule,
    CoachingModule,
    MessagesModule,
    KaModule,
    SmsModule,
    ClubModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantBindingGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
