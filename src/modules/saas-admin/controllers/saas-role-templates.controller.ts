import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SaasRoleTemplateService } from '../services/saas-role-template.service';
import {
  CreateRoleTemplateDto,
  DistributeRoleTemplateDto,
} from '../dto/role-template.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants';

@ApiTags('SaaS SuperAdmin — Dynamic Role Templates (قالب‌های نقش پویا و توزیع سراسری)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('saas/roles/templates')
export class SaasRoleTemplatesController {
  constructor(
    private readonly roleTemplateService: SaasRoleTemplateService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'ایجاد قالب نقش پویا استاندارد کشوری' })
  async createTemplate(@Body() dto: CreateRoleTemplateDto) {
    return this.roleTemplateService.createTemplate(dto);
  }

  @Get()
  @ApiOperation({ summary: 'لیست تمام قالب‌های نقش استاندارد' })
  async listTemplates() {
    return this.roleTemplateService.listTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده مشخصات و دسترسی‌های یک قالب نقش' })
  async getTemplate(@Param('id') id: string) {
    return this.roleTemplateService.getTemplate(id);
  }

  @Post(':id/distribute')
  @ApiOperation({ summary: 'توزیع و همگام‌سازی خودکار قالب نقش به مدارس منتخب یا سراسر پلتفرم' })
  async distributeTemplate(
    @Param('id') id: string,
    @Body() dto: DistributeRoleTemplateDto,
  ) {
    return this.roleTemplateService.distributeTemplate(id, dto);
  }
}
