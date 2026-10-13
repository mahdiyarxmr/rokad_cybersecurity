import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateRoleTemplateDto,
  DistributeRoleTemplateDto,
} from '../dto/role-template.dto';

@Injectable()
export class SaasRoleTemplateService {
  private readonly logger = new Logger(SaasRoleTemplateService.name);

  constructor(private readonly prisma: PrismaService) {}

  // 1. Create Global Role Template
  async createTemplate(dto: CreateRoleTemplateDto) {
    const existing = await this.prisma.globalRoleTemplate.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`قالب نقش با کد '${dto.code}' قبلاً ثبت شده است`);
    }

    return this.prisma.$transaction(async (tx) => {
      const template = await tx.globalRoleTemplate.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          targetTenantType: dto.targetTenantType || 'SCHOOL',
          isSystem: true,
        },
      });

      for (const permCode of dto.permissionCodes) {
        await tx.globalRoleTemplatePermission.create({
          data: {
            templateId: template.id,
            permissionCode: permCode,
          },
        });
      }

      return tx.globalRoleTemplate.findUnique({
        where: { id: template.id },
        include: { permissions: true },
      });
    });
  }

  // 2. List Global Role Templates
  async listTemplates() {
    return this.prisma.globalRoleTemplate.findMany({
      include: {
        permissions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 3. Get Template Details
  async getTemplate(id: string) {
    const template = await this.prisma.globalRoleTemplate.findUnique({
      where: { id },
      include: { permissions: true },
    });
    if (!template) {
      throw new NotFoundException('قالب نقش مورد نظر یافت نشد');
    }
    return template;
  }

  // 4. Distribute Role Template Across Tenants
  async distributeTemplate(templateId: string, dto: DistributeRoleTemplateDto) {
    const template = await this.getTemplate(templateId);

    // Resolve target tenants
    let targetTenants: Array<{ id: string }> = [];

    if (dto.targetTenantIds && dto.targetTenantIds.length > 0) {
      targetTenants = await this.prisma.tenant.findMany({
        where: { id: { in: dto.targetTenantIds }, status: 'ACTIVE' },
        select: { id: true },
      });
    } else {
      targetTenants = await this.prisma.tenant.findMany({
        where: {
          type: template.targetTenantType,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
    }

    if (targetTenants.length === 0) {
      return {
        message: 'هیچ مرکز یا مدرسه‌ای با این مشخصات برای دریافت نقش یافت نشد',
        distributedCount: 0,
      };
    }

    // Fetch system permission records for permissionCodes
    const permCodes = template.permissions.map((p) => p.permissionCode);
    const systemPermissions = await this.prisma.permission.findMany({
      where: { code: { in: permCodes } },
    });

    let distributedCount = 0;

    for (const tenant of targetTenants) {
      await this.prisma.$transaction(async (tx) => {
        // Upsert SchoolRole for this tenant
        const existingRole = await tx.schoolRole.findFirst({
          where: { tenantId: tenant.id, name: template.name },
        });

        const role = existingRole
          ? await tx.schoolRole.update({
              where: { id: existingRole.id },
              data: { description: template.description },
            })
          : await tx.schoolRole.create({
              data: {
                tenantId: tenant.id,
                name: template.name,
                description: template.description,
                isSystem: true,
              },
            });

        // Sync RolePermissions
        for (const sysPerm of systemPermissions) {
          await tx.rolePermission.upsert({
            where: {
              schoolRoleId_permissionId: {
                schoolRoleId: role.id,
                permissionId: sysPerm.id,
              },
            },
            update: {},
            create: {
              schoolRoleId: role.id,
              permissionId: sysPerm.id,
            },
          });
        }
      });

      distributedCount++;
    }

    return {
      message: `قالب نقش '${template.name}' با موفقیت به ${distributedCount} مدرسه/مرکز آموزشی توزیع شد`,
      templateName: template.name,
      distributedCount,
    };
  }
}
