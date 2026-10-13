import { PrismaClient } from '@prisma/client';
import { PERMISSION_CATALOG } from '../src/modules/rbac/rbac-catalog';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial RBAC permissions, roles and overrides...');

  // 1. Seed all catalog permissions
  for (const item of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code: item.code },
      update: {
        name: item.labelFa,
        description: item.descriptionFa,
        module: item.category,
      },
      create: {
        code: item.code,
        name: item.labelFa,
        description: item.descriptionFa,
        module: item.category,
      },
    });
  }
  console.log(`Synced ${PERMISSION_CATALOG.length} permissions in DB.`);

  // 2. Find rokad-boys tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'rokad-boys' },
  });
  if (!tenant) {
    console.log('rokad-boys tenant not found');
    return;
  }

  // 3. Create Sample Role 1: ناظم پایه دهم
  const role1Perms = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          'attendance.read',
          'attendance.write',
          'student.read',
          'calendar.write',
          'homework.read',
        ],
      },
    },
  });

  const role1 = await prisma.schoolRole.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'ناظم پایه دهم',
      },
    },
    update: {
      description: 'مدیریت تردد، حضور و غیاب و انضباطی دانش‌آموزان پایه دهم',
    },
    create: {
      tenantId: tenant.id,
      name: 'ناظم پایه دهم',
      description: 'مدیریت تردد، حضور و غیاب و انضباطی دانش‌آموزان پایه دهم',
      isSystem: false,
      permissions: {
        create: role1Perms.map((p) => ({ permissionId: p.id })),
      },
    },
  });
  console.log('Created sample role:', role1.name);

  // 4. Create Sample Role 2: مشاور هدایت و کنکور
  const role2Perms = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          'coaching.read',
          'coaching.write',
          'student.read',
          'exam.read',
          'grades.read',
        ],
      },
    },
  });

  const role2 = await prisma.schoolRole.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'مشاور هدایت و کنکور',
      },
    },
    update: {
      description: 'هدایت تحصیلی، جلسات مشاوره و بررسی ریزنمرات آزمون‌ها',
    },
    create: {
      tenantId: tenant.id,
      name: 'مشاور هدایت و کنکور',
      isSystem: false,
      description: 'هدایت تحصیلی، جلسات مشاوره و بررسی ریزنمرات آزمون‌ها',
      permissions: {
        create: role2Perms.map((p) => ({ permissionId: p.id })),
      },
    },
  });
  console.log('Created sample role:', role2.name);

  // 5. Assign role 1 to a teacher
  const teacher = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: 'TEACHER' },
  });

  if (teacher) {
    await prisma.userSchoolRole.upsert({
      where: {
        tenantId_userId_schoolRoleId: {
          tenantId: tenant.id,
          userId: teacher.id,
          schoolRoleId: role1.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: teacher.id,
        schoolRoleId: role1.id,
      },
    });
    console.log(`Assigned '${role1.name}' to teacher: ${teacher.firstName} ${teacher.lastName}`);

    // Add a sample override for teacher: give them finance report view
    const admin = await prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'SCHOOL_ADMIN' },
    });

    if (admin) {
      await prisma.userPermissionOverride.upsert({
        where: {
          tenantId_userId_permissionCode: {
            tenantId: tenant.id,
            userId: teacher.id,
            permissionCode: 'finance.fee.read',
          },
        },
        update: {
          effect: 'GRANT',
          reason: 'دسترسی موردی جهت هماهنگی ثبت‌نام پایه دهم',
        },
        create: {
          tenantId: tenant.id,
          userId: teacher.id,
          permissionCode: 'finance.fee.read',
          effect: 'GRANT',
          reason: 'دسترسی موردی جهت هماهنگی ثبت‌نام پایه دهم',
          grantedById: admin.id,
        },
      });
      console.log(`Created sample override 'finance.fee.read' for teacher.`);
    }
  }

  console.log('RBAC seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
