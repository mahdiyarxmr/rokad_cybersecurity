import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateMessageDto,
  MessagePriorityDto,
  MessageTargetTypeDto,
  MessageTargetAudienceDto,
} from './dto/create-message.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==========================================
  // 1. Send Message with Access Matrix Check
  // ==========================================
  async createMessage(tenantId: string, senderId: string, dto: CreateMessageDto) {
    const sender = await this.prisma.user.findFirst({
      where: { id: senderId, tenantId },
      include: {
        teacherProfile: true,
        studentProfile: { include: { enrollments: true } },
        parentProfile: { include: { studentLinks: true } },
        userSchoolRoles: {
          include: {
            schoolRole: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sender) {
      throw new NotFoundException('کاربر ارسال‌کننده یافت نشد');
    }

    const isAdmin =
      sender.role === 'SUPER_ADMIN' ||
      sender.role === 'SCHOOL_ADMIN' ||
      sender.role === 'STAFF';
    const isTeacher = sender.role === 'TEACHER';
    const isStudent = sender.role === 'STUDENT';
    const isParent = sender.role === 'PARENT';

    // 1.1 Enforce Student Restrictions
    if (isStudent) {
      if (dto.targetType !== MessageTargetTypeDto.INDIVIDUAL) {
        throw new ForbiddenException('دانش‌آموزان امکان ارسال پیام گروهی یا همگانی را ندارند');
      }
      if (!dto.recipientIds || dto.recipientIds.length === 0) {
        throw new BadRequestException('حداقل یک گیرنده برای پیام فردی الزامی است');
      }

      // Check that none of the recipients is a parent
      const recipients = await this.prisma.user.findMany({
        where: { id: { in: dto.recipientIds }, tenantId },
        select: { id: true, role: true, firstName: true, lastName: true },
      });

      const hasParent = recipients.some((r) => r.role === 'PARENT');
      if (hasParent) {
        throw new ForbiddenException('دانش‌آموزان امکان ارسال پیام مستقیم به اولیاء را ندارند');
      }
    }

    // 1.2 Enforce Parent Restrictions
    if (isParent) {
      if (dto.targetType !== MessageTargetTypeDto.INDIVIDUAL) {
        throw new ForbiddenException('اولیاء محترم تنها امکان ارسال پیام فردی را دارند');
      }
      if (!dto.recipientIds || dto.recipientIds.length === 0) {
        throw new BadRequestException('حداقل یک گیرنده برای پیام فردی الزامی است');
      }
    }

    // 1.3 Enforce Teacher Restrictions
    if (isTeacher && !isAdmin) {
      if (dto.targetType === MessageTargetTypeDto.ALL || dto.targetType === MessageTargetTypeDto.ROLE) {
        // Only allowed if teacher has broadcast permission
        const hasBroadcastPerm = sender.userSchoolRoles.some((usr) =>
          usr.schoolRole.permissions.some((p: any) => p.permission?.code === 'message.broadcast'),
        );
        if (!hasBroadcastPerm) {
          throw new ForbiddenException('ارسال پیام همگانی به کل مدرسه نیازمند مجوز مدیریت است');
        }
      }

      if (dto.targetType === MessageTargetTypeDto.CLASSROOM) {
        if (!dto.targetClassroomId) {
          throw new BadRequestException('شناسه کلاس برای ارسال گروهی الزامی است');
        }
        // Verify teacher teaches this classroom
        const teacherClassrooms = await this.getTeacherClassroomIds(tenantId, sender.teacherProfile?.id);
        if (!teacherClassrooms.includes(dto.targetClassroomId)) {
          throw new ForbiddenException('شما تنها مجاز به ارسال پیام به کلاس‌های تحت تدریس خود هستید');
        }
      }
    }

    // 2. Resolve Target Recipients
    const recipientUserIds = await this.resolveRecipients(tenantId, senderId, dto);

    if (recipientUserIds.length === 0) {
      throw new BadRequestException('هیچ مخاطب فعالی برای این پیام یافت نشد');
    }

    // 3. Create Message & Recipient records in a transaction
    const message = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.academicMessage.create({
        data: {
          tenantId,
          senderId,
          title: dto.title.trim(),
          body: dto.body.trim(),
          priority: (dto.priority as any) || 'NORMAL',
          targetType: (dto.targetType as any) || 'INDIVIDUAL',
          targetAudience: (dto.targetAudience as any) || 'ALL',
          targetClassroomId: dto.targetClassroomId || null,
          attachments: this.normalizeAttachments(dto.attachments),
          replyToId: dto.replyToId || null,
        },
      });

      // Bulk create recipients
      await tx.academicMessageRecipient.createMany({
        data: recipientUserIds.map((recId) => ({
          tenantId,
          messageId: createdMessage.id,
          recipientId: recId,
          isRead: false,
        })),
        skipDuplicates: true,
      });

      return createdMessage;
    });

    // 4. Send Notifications in background (do not block API response)
    this.sendNotificationsForMessage(tenantId, sender, message, recipientUserIds).catch((err) => {
      this.logger.warn(`Failed to dispatch message notifications: ${err.message}`);
    });

    return {
      success: true,
      message: 'پیام با موفقیت ارسال شد',
      data: {
        id: message.id,
        recipientsCount: recipientUserIds.length,
      },
    };
  }

  // ==========================================
  // 2. Helper: Resolve Target Recipient IDs
  // ==========================================
  private async resolveRecipients(
    tenantId: string,
    senderId: string,
    dto: CreateMessageDto,
  ): Promise<string[]> {
    const recipientsSet = new Set<string>();

    if (dto.targetType === MessageTargetTypeDto.INDIVIDUAL) {
      if (Array.isArray(dto.recipientIds)) {
        dto.recipientIds.forEach((id) => {
          if (id && id !== senderId) recipientsSet.add(id);
        });
      }
      return Array.from(recipientsSet);
    }

    if (dto.targetType === MessageTargetTypeDto.CLASSROOM && dto.targetClassroomId) {
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { classroomId: dto.targetClassroomId, tenantId },
        include: {
          student: {
            include: {
              user: { select: { id: true, status: true } },
              parentLinks: {
                include: {
                  parent: {
                    include: {
                      user: { select: { id: true, status: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const includeStudents =
        dto.targetAudience === MessageTargetAudienceDto.ALL ||
        dto.targetAudience === MessageTargetAudienceDto.STUDENTS;

      const includeParents =
        dto.targetAudience === MessageTargetAudienceDto.ALL ||
        dto.targetAudience === MessageTargetAudienceDto.PARENTS;

      for (const en of enrollments) {
        if (includeStudents && en.student?.user?.id && en.student.user.id !== senderId) {
          recipientsSet.add(en.student.user.id);
        }
        if (includeParents && Array.isArray(en.student?.parentLinks)) {
          for (const pl of en.student.parentLinks) {
            if (pl.parent?.user?.id && pl.parent.user.id !== senderId) {
              recipientsSet.add(pl.parent.user.id);
            }
          }
        }
      }

      return Array.from(recipientsSet);
    }

    if (dto.targetType === MessageTargetTypeDto.ROLE) {
      const roleMap: Record<string, any[]> = {
        STUDENTS: ['STUDENT'],
        PARENTS: ['PARENT'],
        TEACHERS: ['TEACHER'],
        STAFF: ['STAFF', 'SCHOOL_ADMIN'],
        ALL: ['STUDENT', 'PARENT', 'TEACHER', 'STAFF', 'SCHOOL_ADMIN'],
      };

      const targetRoles = roleMap[dto.targetAudience || 'ALL'] || ['STUDENT', 'PARENT', 'TEACHER', 'STAFF', 'SCHOOL_ADMIN'];

      const users = await this.prisma.user.findMany({
        where: {
          tenantId,
          role: { in: targetRoles },
          status: 'ACTIVE',
          id: { not: senderId },
        },
        select: { id: true },
      });

      users.forEach((u) => recipientsSet.add(u.id));
      return Array.from(recipientsSet);
    }

    if (dto.targetType === MessageTargetTypeDto.ALL) {
      const users = await this.prisma.user.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          id: { not: senderId },
        },
        select: { id: true },
      });

      users.forEach((u) => recipientsSet.add(u.id));
      return Array.from(recipientsSet);
    }

    return Array.from(recipientsSet);
  }

  // ==========================================
  // 3. Helper: Teacher Classroom IDs
  // ==========================================
  private async getTeacherClassroomIds(tenantId: string, teacherProfileId?: string): Promise<string[]> {
    if (!teacherProfileId) return [];

    const schedules = await this.prisma.classSchedule.findMany({
      where: { teacherId: teacherProfileId, tenantId },
      select: { classroomId: true },
    });

    return Array.from(new Set(schedules.map((s) => s.classroomId)));
  }

  // ==========================================
  // 4. Dispatch Push Notifications
  // ==========================================
  private async sendNotificationsForMessage(
    tenantId: string,
    sender: any,
    message: any,
    recipientUserIds: string[],
  ) {
    const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'مدیریت مجتمع';
    const preview = message.body.length > 70 ? `${message.body.slice(0, 70)}...` : message.body;

    const pushPayload = {
      title: `پیام جدید: ${message.title}`,
      body: `${senderName}: ${preview}`,
      url: '/app/messages',
      icon: '/logo.svg',
    };

    // Dispatch push notifications to each recipient
    for (const recId of recipientUserIds.slice(0, 200)) {
      try {
        await this.notificationsService.sendPushToUser(recId, pushPayload);
      } catch {
        // non-blocking
      }
    }

    // If message is marked as URGENT or IMPORTANT, trigger SMS broadcast
    if (message.priority === MessagePriorityDto.URGENT || message.priority === 'URGENT' || message.priority === MessagePriorityDto.IMPORTANT || message.priority === 'IMPORTANT') {
      try {
        const recipients = await this.prisma.user.findMany({
          where: { id: { in: recipientUserIds }, tenantId },
          select: {
            id: true,
            phone: true,
            firstName: true,
            lastName: true,
            studentProfile: {
              select: {
                fatherPhone: true,
                motherPhone: true,
              },
            },
          },
        });

        const phoneMap = new Map<string, { phone: string; name: string; userId?: string }>();
        for (const r of recipients) {
          const fullName = `${r.firstName || ''} ${r.lastName || ''}`.trim();
          if (r.phone && r.phone.length >= 10) {
            phoneMap.set(r.phone, { phone: r.phone, name: fullName, userId: r.id });
          }
          if (r.studentProfile?.fatherPhone && r.studentProfile.fatherPhone.length >= 10) {
            phoneMap.set(r.studentProfile.fatherPhone, {
              phone: r.studentProfile.fatherPhone,
              name: `پدر ${fullName}`,
            });
          }
          if (r.studentProfile?.motherPhone && r.studentProfile.motherPhone.length >= 10) {
            phoneMap.set(r.studentProfile.motherPhone, {
              phone: r.studentProfile.motherPhone,
              name: `مادر ${fullName}`,
            });
          }
        }

        if (phoneMap.size > 0) {
          this.eventEmitter.emit('message.urgent_broadcast', {
            tenantId,
            senderName,
            title: message.title,
            body: message.body,
            recipientPhones: Array.from(phoneMap.values()),
          });
        }
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch urgent SMS broadcast: ${err.message}`);
      }
    }
  }

  // ==========================================
  // 5. Get Inbox Messages
  // ==========================================
  async getInbox(
    tenantId: string,
    userId: string,
    query: { page?: number; limit?: number; unreadOnly?: boolean; starredOnly?: boolean; search?: string },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      recipientId: userId,
      deletedAt: null,
    };

    if (query.unreadOnly) {
      where.isRead = false;
    }
    if (query.starredOnly) {
      where.isStarred = true;
    }
    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.message = {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { body: { contains: q, mode: 'insensitive' } },
          { sender: { firstName: { contains: q, mode: 'insensitive' } } },
          { sender: { lastName: { contains: q, mode: 'insensitive' } } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.academicMessageRecipient.count({ where }),
      this.prisma.academicMessageRecipient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          message: {
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                  avatarUrl: true,
                },
              },
              targetClassroom: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    const unreadCount = await this.prisma.academicMessageRecipient.count({
      where: { tenantId, recipientId: userId, isRead: false, deletedAt: null },
    });

    return {
      success: true,
      data: items.map((item) => ({
        recipientRecordId: item.id,
        isRead: item.isRead,
        readAt: item.readAt,
        isStarred: item.isStarred,
        isArchived: item.isArchived,
        createdAt: item.createdAt,
        message: {
          id: item.message.id,
          title: item.message.title,
          body: item.message.body,
          priority: item.message.priority,
          targetType: item.message.targetType,
          targetAudience: item.message.targetAudience,
          classroom: item.message.targetClassroom,
          attachments: item.message.attachments || [],
          createdAt: item.message.createdAt,
          sender: item.message.sender,
        },
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  // ==========================================
  // 6. Get Sent Messages
  // ==========================================
  async getSentMessages(
    tenantId: string,
    userId: string,
    query: { page?: number; limit?: number; search?: string },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      senderId: userId,
    };

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.academicMessage.count({ where }),
      this.prisma.academicMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          targetClassroom: { select: { id: true, name: true } },
          _count: {
            select: {
              recipients: true,
            },
          },
        },
      }),
    ]);

    return {
      success: true,
      data: items.map((m) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        priority: m.priority,
        targetType: m.targetType,
        targetAudience: m.targetAudience,
        classroom: m.targetClassroom,
        attachments: m.attachments || [],
        createdAt: m.createdAt,
        recipientsCount: m._count.recipients,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // 7. Get Message Details & Mark Read
  // ==========================================
  async getMessageDetails(tenantId: string, userId: string, messageId: string) {
    const message = await this.prisma.academicMessage.findFirst({
      where: { id: messageId, tenantId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
        targetClassroom: { select: { id: true, name: true } },
        replyTo: {
          select: {
            id: true,
            title: true,
            body: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            body: true,
            attachments: true,
            createdAt: true,
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
        },
        recipients: {
          take: 50,
          include: {
            recipient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('پیام مورد نظر یافت نشد');
    }

    // Check if user is recipient or sender
    const isSender = message.senderId === userId;
    const recipientRecord = await this.prisma.academicMessageRecipient.findUnique({
      where: {
        messageId_recipientId: {
          messageId,
          recipientId: userId,
        },
      },
    });

    if (!isSender && !recipientRecord) {
      throw new ForbiddenException('شما اجازه دسترسی به این پیام را ندارید');
    }

    // Auto mark as read if recipient
    if (recipientRecord && !recipientRecord.isRead) {
      await this.prisma.academicMessageRecipient.update({
        where: { id: recipientRecord.id },
        data: { isRead: true, readAt: new Date() },
      });
      recipientRecord.isRead = true;
      recipientRecord.readAt = new Date();
    }

    return {
      success: true,
      data: {
        ...message,
        attachments: this.normalizeAttachments(message.attachments),
        isStarred: recipientRecord?.isStarred || false,
        isRead: recipientRecord?.isRead || false,
        readAt: recipientRecord?.readAt || null,
        isSender,
      },
    };
  }

  // ==========================================
  // 8. Star / Unstar Message
  // ==========================================
  async toggleStar(tenantId: string, userId: string, messageId: string) {
    const record = await this.prisma.academicMessageRecipient.findUnique({
      where: {
        messageId_recipientId: {
          messageId,
          recipientId: userId,
        },
      },
    });

    if (!record || record.tenantId !== tenantId) {
      throw new NotFoundException('پیام در صندوق ورودی شما یافت نشد');
    }

    const updated = await this.prisma.academicMessageRecipient.update({
      where: { id: record.id },
      data: { isStarred: !record.isStarred },
    });

    return {
      success: true,
      isStarred: updated.isStarred,
    };
  }

  // ==========================================
  // 9. Soft Delete Message from Recipient Box
  // ==========================================
  async deleteRecipientMessage(tenantId: string, userId: string, messageId: string) {
    const record = await this.prisma.academicMessageRecipient.findUnique({
      where: {
        messageId_recipientId: {
          messageId,
          recipientId: userId,
        },
      },
    });

    if (!record || record.tenantId !== tenantId) {
      throw new NotFoundException('پیام یافت نشد');
    }

    await this.prisma.academicMessageRecipient.update({
      where: { id: record.id },
      data: { deletedAt: new Date() },
    });

    return {
      success: true,
      message: 'پیام از صندوق ورودی حذف شد',
    };
  }

  // ==========================================
  // 10. Get Allowed Recipients Directory
  // ==========================================
  async getAllowedRecipients(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        teacherProfile: true,
        studentProfile: {
          include: {
            enrollments: {
              include: {
                classroom: {
                  include: {
                    schedules: {
                      include: {
                        teacher: { include: { user: true } },
                      },
                    },
                    enrollments: {
                      include: {
                        student: { include: { user: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        parentProfile: {
          include: {
            studentLinks: {
              include: {
                student: {
                  include: {
                    enrollments: {
                      include: {
                        classroom: {
                          include: {
                            schedules: {
                              include: {
                                teacher: { include: { user: true } },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('کاربر یافت نشد');

    const isAdmin =
      user.role === 'SUPER_ADMIN' ||
      user.role === 'SCHOOL_ADMIN' ||
      user.role === 'STAFF';
    const isTeacher = user.role === 'TEACHER';
    const isStudent = user.role === 'STUDENT';
    const isParent = user.role === 'PARENT';

    // 10.1 Admins & Staff (مدیر و معاون): Get all classrooms and users
    if (isAdmin) {
      const [classrooms, users] = await Promise.all([
        this.prisma.classroom.findMany({
          where: { tenantId },
          select: { id: true, name: true, code: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.user.findMany({
          where: { tenantId, status: 'ACTIVE', id: { not: userId } },
          select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
          orderBy: { lastName: 'asc' },
        }),
      ]);

      return {
        canBroadcast: true,
        canClassroom: true,
        canIndividual: true,
        classrooms,
        users,
      };
    }

    // 10.2 Teachers (مربیان و کوچ‌ها):
    // به دانش‌آموزان و اولیای مربوط به خودشون (فردی و گروهی)، و به سایر مربیان و مدیر و معاون (فردی)
    if (isTeacher) {
      const teacherProfile = user.teacherProfile;
      const schedules = teacherProfile
        ? await this.prisma.classSchedule.findMany({
            where: { teacherId: teacherProfile.id, tenantId },
            include: {
              classroom: {
                include: {
                  enrollments: {
                    include: {
                      student: {
                        include: {
                          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                          parentLinks: {
                            include: {
                              parent: {
                                include: {
                                  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        : [];

      // Deduplicate classrooms
      const classMap = new Map<string, any>();
      const userMap = new Map<string, any>();

      for (const s of schedules) {
        if (!classMap.has(s.classroom.id)) {
          classMap.set(s.classroom.id, {
            id: s.classroom.id,
            name: s.classroom.name,
            code: s.classroom.code,
          });
        }

        for (const en of s.classroom.enrollments) {
          if (en.student?.user && en.student.user.id !== userId) {
            userMap.set(en.student.user.id, {
              id: en.student.user.id,
              firstName: en.student.user.firstName,
              lastName: en.student.user.lastName,
              role: 'STUDENT',
              classroomName: s.classroom.name,
            });
          }

          for (const pl of en.student.parentLinks || []) {
            if (pl.parent?.user && pl.parent.user.id !== userId) {
              userMap.set(pl.parent.user.id, {
                id: pl.parent.user.id,
                firstName: pl.parent.user.firstName,
                lastName: pl.parent.user.lastName,
                role: 'PARENT',
                childName: `${en.student.user?.firstName || ''} ${en.student.user?.lastName || ''}`.trim(),
              });
            }
          }
        }
      }

      // Add other teachers (سایر مربیان و کوچ‌ها)
      const otherTeachers = await this.prisma.user.findMany({
        where: { tenantId, role: 'TEACHER', status: 'ACTIVE', id: { not: userId } },
        select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
      });
      otherTeachers.forEach((t) => userMap.set(t.id, t));

      // Add school admins and staff (مدیر و معاون)
      const admins = await this.prisma.user.findMany({
        where: { tenantId, role: { in: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'] }, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
      });
      admins.forEach((adm) => userMap.set(adm.id, adm));

      return {
        canBroadcast: false,
        canClassroom: true,
        canIndividual: true,
        classrooms: Array.from(classMap.values()),
        users: Array.from(userMap.values()),
      };
    }

    // 10.3 Students (دانش‌آموزان):
    // امکان ارسال پیام فردی به مدیر، معاون، مربیان و کوچ مربوط به خودشون و دانش‌آموزان دیگه
    if (isStudent) {
      const userMap = new Map<string, any>();

      for (const en of user.studentProfile?.enrollments || []) {
        // Teachers of their classes (مربیان و کوچ‌های مربوطه)
        for (const sc of en.classroom?.schedules || []) {
          if (sc.teacher?.user) {
            userMap.set(sc.teacher.user.id, {
              id: sc.teacher.user.id,
              firstName: sc.teacher.user.firstName,
              lastName: sc.teacher.user.lastName,
              role: 'TEACHER',
            });
          }
        }
      }

      // Classmates & all other active students (دانش‌آموزان دیگر)
      const otherStudents = await this.prisma.user.findMany({
        where: { tenantId, role: 'STUDENT', status: 'ACTIVE', id: { not: userId } },
        select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
      });
      otherStudents.forEach((st) => userMap.set(st.id, st));

      // Admins & Staff (مدیر و معاون)
      const admins = await this.prisma.user.findMany({
        where: { tenantId, role: { in: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'] }, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
      });
      admins.forEach((adm) => userMap.set(adm.id, adm));

      return {
        canBroadcast: false,
        canClassroom: false,
        canIndividual: true,
        classrooms: [],
        users: Array.from(userMap.values()),
      };
    }

    // 10.4 Parents (والدین):
    // امکان ارسال پیام فردی به مدیر، معاون، مربیان و کوچ مربوطه و سایر والدین
    if (isParent) {
      const userMap = new Map<string, any>();

      for (const pl of user.parentProfile?.studentLinks || []) {
        for (const en of pl.student?.enrollments || []) {
          for (const sc of en.classroom?.schedules || []) {
            if (sc.teacher?.user) {
              userMap.set(sc.teacher.user.id, {
                id: sc.teacher.user.id,
                firstName: sc.teacher.user.firstName,
                lastName: sc.teacher.user.lastName,
                role: 'TEACHER',
              });
            }
          }
        }
      }

      // Other parents (سایر والدین)
      const otherParents = await this.prisma.user.findMany({
        where: { tenantId, role: 'PARENT', status: 'ACTIVE', id: { not: userId } },
        select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
      });
      otherParents.forEach((p) => userMap.set(p.id, p));

      // Admins & Staff (مدیر و معاون)
      const admins = await this.prisma.user.findMany({
        where: { tenantId, role: { in: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'STAFF'] }, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true },
      });
      admins.forEach((adm) => userMap.set(adm.id, adm));

      return {
        canBroadcast: false,
        canClassroom: false,
        canIndividual: true,
        classrooms: [],
        users: Array.from(userMap.values()),
      };
    }

    return {
      canBroadcast: false,
      canClassroom: false,
      canIndividual: false,
      classrooms: [],
      users: [],
    };
  }

  public normalizeAttachments(rawList: any): any[] {
    if (!Array.isArray(rawList)) return [];
    return rawList.map((att) => {
      if (typeof att === 'string') {
        const cleanUrl = att.trim();
        const fileName = decodeURIComponent(cleanUrl.split('/').pop()?.split('?')[0] || 'فایل پیوست');
        const isVideo = /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(fileName);
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
        return { name: fileName, url: cleanUrl, type: isVideo ? 'video' : isImage ? 'image' : 'file' };
      }
      if (att && typeof att === 'object') {
        const rawUrl = att.url || att.fileUrl || att.path || att.attachmentUrl || att.src || '';
        const cleanUrl = typeof rawUrl === 'string' ? rawUrl.trim() : '';
        let rawName =
          att.name ||
          att.originalName ||
          att.filename ||
          att.fileName ||
          att.title ||
          '';
        if (!rawName && cleanUrl) {
          rawName = decodeURIComponent(cleanUrl.split('/').pop()?.split('?')[0] || '');
        }
        if (!rawName) {
          rawName = 'فایل پیوست';
        }

        const isVideo =
          att.type === 'video' ||
          (typeof att.mimetype === 'string' && att.mimetype.startsWith('video/')) ||
          /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(rawName) ||
          /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(cleanUrl);

        const isImage =
          att.type === 'image' ||
          (typeof att.mimetype === 'string' && att.mimetype.startsWith('image/')) ||
          /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(rawName) ||
          /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(cleanUrl);

        const size =
          typeof att.size === 'number'
            ? att.size
            : typeof att.fileSize === 'number'
              ? att.fileSize
              : undefined;

        return {
          name: rawName,
          url: cleanUrl,
          type: isVideo ? 'video' : isImage ? 'image' : (att.type || 'file'),
          size,
        };
      }
      return { name: 'فایل پیوست', url: '', type: 'file' };
    });
  }
}
