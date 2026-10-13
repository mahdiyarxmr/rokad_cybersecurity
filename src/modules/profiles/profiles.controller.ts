import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import {
  UpdateSchoolProfileDto,
  CreateBlogPostDto,
} from './dto/update-school-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('School Profile & Blogs')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  // 1. School Profile
  @Public()
  @Get('school')
  @ApiOperation({ summary: 'مشاهده پروفایل عمومی مدرسه' })
  async getSchoolProfile(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.profilesService.getSchoolProfile(effectiveTenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.SCHOOL_PROFILE_WRITE)
  @Patch('school')
  @ApiOperation({ summary: 'ویرایش مشخصات و شعار مدرسه (مدیر مدرسه)' })
  async updateSchoolProfile(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: UpdateSchoolProfileDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.profilesService.updateSchoolProfile(effectiveTenantId, dto);
  }

  // 2. Profile Blogs
  @Public()
  @Get('blogs')
  @ApiOperation({ summary: 'لیست مقالات و دستاوردهای منتشرشده مدرسه' })
  async listBlogPosts(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('authorId') authorId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.profilesService.listBlogPosts(effectiveTenantId, authorId, true);
  }

  @Public()
  @Get('blogs/:slug')
  @ApiOperation({ summary: 'مشاهده متن کامل مقاله بر اساس اسلاگ' })
  async getBlogPostBySlug(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('slug') slug: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.profilesService.getBlogPostBySlug(effectiveTenantId, slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Post('blogs')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF, Role.STUDENT)
  @RequirePermissions(AppPermission.BLOG_WRITE)
  @ApiOperation({ summary: 'ایجاد پست جدید در وبلاگ مدرسه توسط دبیران یا دانش‌آموزان' })
  async createBlogPost(
    @CurrentUser('id') authorId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateBlogPostDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.profilesService.createBlogPost(effectiveTenantId, authorId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @ApiBearerAuth()
  @Delete('blogs/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @RequirePermissions(AppPermission.BLOG_WRITE)
  @ApiOperation({ summary: 'حذف مقاله یا پست وبلاگ مدرسه' })
  async deleteBlogPost(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') postId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('کانتکست مدرسه مشخص نیست');
    }
    return this.profilesService.deleteBlogPost(effectiveTenantId, postId);
  }
}
