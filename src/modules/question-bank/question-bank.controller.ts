import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionBankService } from './question-bank.service';
import {
  CreateQuestionCategoryDto,
  CreateQuestionDto,
} from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('LMS — Question Bank (بانک سوالات)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('question-bank')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Post('categories')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'ایجاد سرفصل/فصل موضوعی جدید برای بانک سوالات' })
  async createCategory(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateQuestionCategoryDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.questionBankService.createCategory(effectiveTenantId, dto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'لیست سرفصل‌های موضوعی یک درس' })
  async listCategories(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('lessonId') lessonId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.questionBankService.listCategories(effectiveTenantId, lessonId);
  }

  @Post('questions')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'طراحی و ثبت سوال جدید در بانک سوالات' })
  async createQuestion(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.questionBankService.createQuestion(
      effectiveTenantId,
      userId,
      dto,
    );
  }

  @Get('questions')
  @ApiOperation({ summary: 'جستجو و استعلام سوالات بانک سوالات با فیلترهای تخصصی' })
  async listQuestions(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('lessonId') lessonId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.questionBankService.listQuestions(effectiveTenantId, {
      lessonId,
      categoryId,
      difficulty,
      type,
      search,
    });
  }

  @Get('questions/:id')
  @ApiOperation({ summary: 'مشاهده جزئیات کامل سوال، پاسخ تشریحی و گزینه‌ها' })
  async getQuestionDetails(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') questionId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.questionBankService.getQuestionDetails(
      effectiveTenantId,
      questionId,
    );
  }

  @Delete('questions/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'حذف سوال از بانک سوالات' })
  async deleteQuestion(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') questionId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.questionBankService.deleteQuestion(effectiveTenantId, questionId);
  }

  @Delete('categories/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'حذف سرفصل موضوعی' })
  async deleteCategory(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') categoryId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.questionBankService.deleteCategory(effectiveTenantId, categoryId);
  }
}
