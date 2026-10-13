import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVisitSlotDto, BookVisitDto } from './dto/create-slot.dto';

@Injectable()
export class ParentVisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createSlot(tenantId: string, dto: CreateVisitSlotDto, user?: any) {
    let teacherId = dto.teacherId;
    if (!teacherId && user) {
      const teacherProfile = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (teacherProfile) teacherId = teacherProfile.id;
    }
    if (!teacherId) {
      const anyTeacher = await this.prisma.teacherProfile.findFirst({ where: { tenantId } });
      if (anyTeacher) teacherId = anyTeacher.id;
    }

    const teacher = await this.prisma.teacherProfile.findFirst({
      where: { id: teacherId, tenantId },
    });
    if (!teacher) {
      throw new NotFoundException('استاد یا مشاور مورد نظر یافت نشد');
    }

    return this.prisma.parentVisitSlot.create({
      data: {
        tenantId,
        teacherId: teacher.id,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        durationMinutes: dto.durationMinutes || 15,
        capacityPerSlot: dto.capacityPerSlot || 1,
        roomLocation: dto.roomLocation,
        isVirtual: dto.isVirtual || false,
        virtualMeetingUrl: dto.virtualMeetingUrl,
      },
      include: {
        teacher: { include: { user: true } },
      },
    });
  }

  async deleteSlot(tenantId: string, slotId: string) {
    const slot = await this.prisma.parentVisitSlot.findFirst({
      where: { id: slotId, tenantId },
    });
    if (!slot) {
      throw new NotFoundException('اسلات ملاقات یافت نشد');
    }

    return this.prisma.parentVisitSlot.update({
      where: { id: slotId },
      data: { isCancelled: true },
    });
  }

  async listMyBookings(tenantId: string, user: any) {
    if (user.role === 'PARENT') {
      const parent = await this.prisma.parentProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!parent) return [];

      return this.prisma.parentVisitBooking.findMany({
        where: { parentId: parent.id, tenantId },
        include: {
          slot: { include: { teacher: { include: { user: true } } } },
          student: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'TEACHER') {
      const teacher = await this.prisma.teacherProfile.findFirst({
        where: { userId: user.id, tenantId },
      });
      if (!teacher) return [];

      return this.prisma.parentVisitBooking.findMany({
        where: { slot: { teacherId: teacher.id }, tenantId },
        include: {
          slot: true,
          student: { include: { user: true } },
          parent: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Super Admin or School Admin: return all bookings
      return this.prisma.parentVisitBooking.findMany({
        where: { tenantId },
        include: {
          slot: { include: { teacher: { include: { user: true } } } },
          student: { include: { user: true } },
          parent: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }
  }

  async listAvailableSlots(tenantId: string, teacherId?: string, date?: string) {
    return this.prisma.parentVisitSlot.findMany({
      where: {
        tenantId,
        isCancelled: false,
        ...(teacherId ? { teacherId } : {}),
        ...(date ? { date } : {}),
      },
      include: {
        teacher: { include: { user: true } },
        bookings: {
          where: { status: 'CONFIRMED' },
          select: { id: true },
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async bookVisit(
    tenantId: string,
    parentUserId: string,
    dto: BookVisitDto,
  ) {
    const parent = await this.prisma.parentProfile.findFirst({
      where: { userId: parentUserId, tenantId },
    });
    if (!parent) {
      throw new NotFoundException('پروفایل والد برای کاربر لاگین‌شده یافت نشد');
    }

    const slot = await this.prisma.parentVisitSlot.findFirst({
      where: { id: dto.slotId, tenantId, isCancelled: false },
      include: {
        _count: {
          select: { bookings: { where: { status: 'CONFIRMED' } } },
        },
      },
    });
    if (!slot) {
      throw new NotFoundException('اسلات زمانی ملاقات یافت نشد یا لغو شده است');
    }

    if (slot._count.bookings >= slot.capacityPerSlot) {
      throw new BadRequestException('ظرفیت این تایم ملاقات تکمیل شده است');
    }

    const existingBooking = await this.prisma.parentVisitBooking.findFirst({
      where: {
        slotId: dto.slotId,
        parentId: parent.id,
        status: 'CONFIRMED',
      },
    });
    if (existingBooking) {
      throw new ConflictException('شما قبلاً این نوبت ملاقات را رزرو کرده‌اید');
    }

    const booking = await this.prisma.parentVisitBooking.create({
      data: {
        tenantId,
        slotId: dto.slotId,
        parentId: parent.id,
        studentId: dto.studentId,
        subject: dto.subject,
        status: 'CONFIRMED',
      },
      include: {
        slot: { include: { teacher: { include: { user: true } } } },
        student: { include: { user: true } },
      },
    });

    this.eventEmitter.emit('parent_visit.booked', {
      tenantId,
      bookingId: booking.id,
      parentId: parent.id,
      teacherId: slot.teacherId,
    });

    return booking;
  }

  async cancelBooking(tenantId: string, bookingId: string) {
    const booking = await this.prisma.parentVisitBooking.findFirst({
      where: { id: bookingId, tenantId },
    });
    if (!booking) {
      throw new NotFoundException('رزرو ملاقات یافت نشد');
    }

    return this.prisma.parentVisitBooking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    });
  }
}
