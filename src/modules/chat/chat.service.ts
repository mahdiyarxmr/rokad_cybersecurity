import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateDirectChannelDto,
  CreateClassChannelDto,
  SendMessageDto,
} from './dto/create-channel.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // 1. Get or Create 1-on-1 Direct Channel
  async getOrCreateDirectChannel(
    tenantId: string,
    currentUserId: string,
    dto: CreateDirectChannelDto,
  ) {
    if (currentUserId === dto.recipientUserId) {
      throw new BadRequestException('امکان گفتگوی مستقیم با خود کاربر وجود ندارد');
    }

    const recipient = await this.prisma.user.findFirst({
      where: { id: dto.recipientUserId, tenantId },
    });
    if (!recipient) {
      throw new NotFoundException('کاربر گیرنده در این مدرسه یافت نشد');
    }

    // Check if channel already exists between these 2 users
    const existingChannel = await this.prisma.chatChannel.findFirst({
      where: {
        tenantId,
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: currentUserId } } },
          { members: { some: { userId: dto.recipientUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });

    if (existingChannel) {
      return existingChannel;
    }

    // Create new direct channel
    return this.prisma.chatChannel.create({
      data: {
        tenantId,
        type: 'DIRECT',
        createdById: currentUserId,
        members: {
          create: [
            { tenantId, userId: currentUserId, isAdmin: true },
            { tenantId, userId: dto.recipientUserId, isAdmin: false },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
    });
  }

  // 2. Get or Create Classroom Group Channel
  async getOrCreateClassChannel(
    tenantId: string,
    createdById: string,
    dto: CreateClassChannelDto,
  ) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: dto.classroomId, tenantId },
      include: {
        enrollments: true,
      },
    });
    if (!classroom) {
      throw new NotFoundException('کلاس مورد نظر یافت نشد');
    }

    const existingChannel = await this.prisma.chatChannel.findFirst({
      where: { tenantId, classroomId: dto.classroomId, type: 'CLASS_GROUP' },
      include: {
        classroom: true,
        _count: { select: { members: true, messages: true } },
      },
    });

    if (existingChannel) {
      return existingChannel;
    }

    const channelName = dto.name || `گفتگوی ${classroom.name}`;

    return this.prisma.chatChannel.create({
      data: {
        tenantId,
        type: 'CLASS_GROUP',
        name: channelName,
        description: dto.description,
        classroomId: dto.classroomId,
        createdById,
        members: {
          create: {
            tenantId,
            userId: createdById,
            isAdmin: true,
          },
        },
      },
      include: {
        classroom: true,
        members: { include: { user: true } },
      },
    });
  }

  // 3. List User's Channels
  async listUserChannels(tenantId: string, userId: string) {
    return this.prisma.chatChannel.findMany({
      where: {
        tenantId,
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
          },
        },
        classroom: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: { select: { firstName: true, lastName: true } },
          },
        },
        _count: { select: { messages: true, members: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // 4. Save Chat Message
  async saveMessage(
    tenantId: string,
    senderId: string,
    dto: SendMessageDto,
  ) {
    // Verify membership
    const isMember = await this.prisma.chatChannelMember.findUnique({
      where: {
        channelId_userId: { channelId: dto.channelId, userId: senderId },
      },
    });

    if (!isMember) {
      throw new ForbiddenException('شما عضو این کانال گفتگو نیستید');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        tenantId,
        channelId: dto.channelId,
        senderId,
        content: dto.content,
        attachmentKey: dto.attachmentKey,
        attachmentUrl: dto.attachmentUrl,
        attachmentType: dto.attachmentType || 'NONE',
        replyToId: dto.replyToId,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
        },
        replyTo: {
          include: {
            sender: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    // Touch channel updated_at
    await this.prisma.chatChannel.update({
      where: { id: dto.channelId },
      data: { updatedAt: new Date() },
    });

    // Emit event for push notifications to offline members
    this.eventEmitter.emit('chat.message_created', {
      tenantId,
      channelId: dto.channelId,
      senderId,
      senderName: `${message.sender?.firstName || ''} ${message.sender?.lastName || ''}`.trim() || 'همکار',
      content: dto.content,
    });

    return message;
  }

  // 5. List Channel Message History
  async listChannelMessages(
    tenantId: string,
    channelId: string,
    userId: string,
    page = 1,
    limit = 50,
  ) {
    // Check channel existence and membership
    const channel = await this.prisma.chatChannel.findFirst({
      where: { id: channelId, tenantId },
    });
    if (!channel) {
      throw new NotFoundException('کانال گفتگو یافت نشد');
    }

    const isMember = await this.prisma.chatChannelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!isMember) {
      throw new ForbiddenException('شما عضو این کانال گفتگو نیستید');
    }

    const skip = (page - 1) * limit;

    const [total, messages] = await Promise.all([
      this.prisma.chatMessage.count({ where: { channelId, isDeleted: false } }),
      this.prisma.chatMessage.findMany({
        where: { channelId, isDeleted: false },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true },
          },
          replyTo: {
            include: {
              sender: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Update member's lastReadAt
    await this.prisma.chatChannelMember.update({
      where: { channelId_userId: { channelId, userId } },
      data: { lastReadAt: new Date() },
    });

    return {
      messages: messages.reverse(),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 6. Strict Classroom Membership Check for Room Authorization
  async verifyClassroomMembership(
    tenantId: string,
    userId: string,
    classroomId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) return false;

    // Super Admin & School Admin have full access
    if (user.isPlatformAdmin || user.role === 'SUPER_ADMIN' || user.role === 'SCHOOL_ADMIN') {
      return true;
    }

    // Check Student Enrollment
    if (user.role === 'STUDENT') {
      const enrollment = await this.prisma.classEnrollment.findFirst({
        where: {
          classroomId,
          student: { userId, tenantId },
          status: 'ACTIVE',
        },
      });
      return !!enrollment;
    }

    // Check Teacher Schedule / Mentor
    if (user.role === 'TEACHER') {
      const isMentor = await this.prisma.classroom.findFirst({
        where: { id: classroomId, tenantId, mentorId: userId },
      });
      if (isMentor) return true;

      const teachesClass = await this.prisma.classSchedule.findFirst({
        where: {
          classroomId,
          teacher: { userId, tenantId },
        },
      });
      return !!teachesClass;
    }

    return false;
  }

  async getActiveUser(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, status: 'ACTIVE' },
      select: { id: true, tenantId: true, role: true, isPlatformAdmin: true },
    });
  }

  async verifyChannelMembership(tenantId: string, userId: string, channelId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, status: 'ACTIVE' },
      select: { id: true, role: true, isPlatformAdmin: true },
    });
    if (!user) return false;
    if (user.isPlatformAdmin || user.role === 'SUPER_ADMIN' || user.role === 'SCHOOL_ADMIN') {
      const channel = await this.prisma.chatChannel.findFirst({
        where: { id: channelId, tenantId },
        select: { id: true },
      });
      return !!channel;
    }
    const member = await this.prisma.chatChannelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { userId: true },
    });
    return !!member;
  }
}
