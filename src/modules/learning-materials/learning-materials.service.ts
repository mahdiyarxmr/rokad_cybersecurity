import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { CreateMaterialDto } from './dto/create-material.dto';

@Injectable()
export class LearningMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) { }

  // 1. Create Course Material
  async createMaterial(tenantId: string, dto: CreateMaterialDto, user?: any) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    // Resolve teacherId
    let teacherId = dto.teacherId;
    if (!teacherId && user) {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (teacher) {
        teacherId = teacher.id;
      }
    }
    if (!teacherId) {
      const lessonTeacher = await this.prisma.teacherLesson.findFirst({
        where: { tenantId, lessonId: dto.lessonId },
      });
      if (lessonTeacher) {
        teacherId = lessonTeacher.teacherId;
      } else {
        const anyTeacher = await this.prisma.teacherProfile.findFirst({
          where: { tenantId },
        });
        if (anyTeacher) teacherId = anyTeacher.id;
      }
    }
    if (!teacherId) {
      throw new NotFoundException('پروفایل معلم برای ثبت جزوه یافت نشد');
    }

    // Resolve academicYearId
    let academicYearId = dto.academicYearId;
    if (!academicYearId) {
      const currentYear = await this.prisma.academicYear.findFirst({
        where: { tenantId, isCurrent: true },
      });
      if (currentYear) {
        academicYearId = currentYear.id;
      } else {
        const anyYear = await this.prisma.academicYear.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
        });
        if (anyYear) academicYearId = anyYear.id;
      }
    }
    if (!academicYearId) {
      throw new NotFoundException('سال تحصیلی فعال یافت نشد');
    }

    // Resolve classroomIds
    const classroomIds: string[] = dto.classroomIds?.length
      ? dto.classroomIds
      : dto.classroomId
        ? [dto.classroomId]
        : [];

    const fileKey = dto.fileKey || `tenants/${tenantId}/materials/${Date.now()}-${encodeURIComponent(dto.title)}`;
    const fileUrl = dto.fileUrl || `http://localhost:9000/rokad-storage/${fileKey}`;

    return this.prisma.courseMaterial.create({
      data: {
        tenantId,
        academicYearId,
        termId: dto.termId,
        lessonId: dto.lessonId,
        teacherId,
        title: dto.title,
        description: dto.description,
        materialType: dto.materialType || 'DOCUMENT',
        fileKey,
        fileUrl,
        fileSizeMb: dto.fileSizeMb !== undefined ? Number(dto.fileSizeMb) : 0,
        mimeType: dto.mimeType,
        isDownloadable: dto.isDownloadable ?? true,
        isPublished: dto.isPublished ?? true,
        classrooms: {
          create: classroomIds.map((cid) => ({
            tenantId,
            classroomId: cid,
          })),
        },
      },
      include: {
        lesson: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        classrooms: { include: { classroom: true } },
      },
    });
  }

  // 2. List Course Materials with class/lesson filtering
  async listMaterials(
    tenantId: string,
    filters?: { lessonId?: string; classroomId?: string },
  ) {
    const where: any = { tenantId, isPublished: true };
    if (filters?.lessonId) where.lessonId = filters.lessonId;
    if (filters?.classroomId) {
      where.classrooms = { some: { classroomId: filters.classroomId } };
    }

    return this.prisma.courseMaterial.findMany({
      where,
      include: {
        lesson: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        classrooms: { include: { classroom: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Delete Course Material
  async deleteMaterial(tenantId: string, materialId: string, user?: any) {
    const material = await this.prisma.courseMaterial.findFirst({
      where: { id: materialId, tenantId },
    });
    if (!material) {
      throw new NotFoundException('محتوای آموزشی یافت نشد');
    }

    if (material.fileKey) {
      await this.storageService.deleteFile(material.fileKey);
    }

    await this.prisma.materialClassroom.deleteMany({
      where: { materialId, tenantId },
    });

    return this.prisma.courseMaterial.delete({
      where: { id: materialId },
    });
  }

  // 3. Get Presigned Download URL with Strict Pre-Authorization Check
  async getSecureDownloadUrl(
    tenantId: string,
    materialId: string,
    userId: string,
    userRole: string,
  ) {
    const material = await this.prisma.courseMaterial.findFirst({
      where: { id: materialId, tenantId },
      include: {
        classrooms: true,
      },
    });

    if (!material) {
      throw new NotFoundException('محتوای آموزشی مورد نظر یافت نشد');
    }

    // Pre-authorization check: Students must be enrolled in one of the material's classrooms
    if (userRole === 'STUDENT') {
      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: { userId, tenantId },
        include: { enrollments: true },
      });

      if (!studentProfile) {
        throw new ForbiddenException('پروفایل دانش‌آموز یافت نشد');
      }

      const studentClassIds = studentProfile.enrollments.map((e) => e.classroomId);
      const isEnrolled = material.classrooms.some((mc) =>
        studentClassIds.includes(mc.classroomId),
      );

      if (!isEnrolled) {
        throw new ForbiddenException('شما دسترسی به این محتوای آموزشی ندارید');
      }
    }

    // Generate short-lived presigned URL (15 minutes = 900 seconds)
    const secureDownloadUrl = await this.storageService.getPresignedDownloadUrl(
      material.fileKey,
      900,
    );

    return {
      materialId: material.id,
      title: material.title,
      mimeType: material.mimeType,
      fileSizeMb: material.fileSizeMb,
      downloadUrl: secureDownloadUrl,
      expiresInSeconds: 900,
    };
  }
}
