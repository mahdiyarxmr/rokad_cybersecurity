import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto, UpdateEventDto } from './dto/create-event.dto';
import { Role } from '../../common/constants';
import { getInitialBackendIdeas, getInitialBackendTeams } from './constants/initial-event-ideas';
import {
  SubmitEventIdeaDto,
  UpdateEventIdeaDto,
  UpdateEventWizardStepsDto,
  UpdateEventTeamsDto,
  SubmitEventVoteDto,
} from './dto/event-wizard.dto';

const VALID_PRISMA_EVENT_TYPES: string[] = [
  'ACADEMIC',
  'HOLIDAY',
  'EXAM',
  'MEETING',
  'CULTURAL',
  'SPORTS',
  'EXCURSION',
  'STARTUP_WEEKEND',
];

const DEFAULT_STARTUP_WEEKEND_MODULES = [
  { key: 'IDEA_SUBMISSION', step: 1, enabled: true },
  { key: 'IDEA_HALL', step: 2, enabled: true },
  { key: 'VOTING', step: 3, enabled: true },
  { key: 'TEAM_FORMATION', step: 4, enabled: true },
  { key: 'EVENT_CANVAS', step: 5, enabled: true },
  { key: 'TASK_DEFINITION', step: 6, enabled: true },
  { key: 'PRESENTATION_UPLOAD', step: 7, enabled: true },
  { key: 'LEADERBOARD', step: 8, enabled: true },
];

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  private hydrateEvent(event: any): any {
    if (!event) return event;
    let resolvedType = event.eventType;
    let customKey: string | undefined;

    if (Array.isArray(event.tags)) {
      const typeTag = event.tags.find(
        (t: string) => typeof t === 'string' && t.startsWith('type:'),
      );
      if (typeTag) {
        customKey = typeTag.replace('type:', '');
      } else {
        const catTag = event.tags.find(
          (t: string) => typeof t === 'string' && t.startsWith('categoryKey:'),
        );
        if (catTag) {
          customKey = catTag.replace('categoryKey:', '');
        }
      }
    }

    if (customKey) {
      resolvedType = customKey;
    }

    let workflowModules = event.workflowModules;
    let wizardData = undefined;
    if (workflowModules && typeof workflowModules === 'object' && !Array.isArray(workflowModules)) {
      wizardData = (workflowModules as any).wizardData;
      workflowModules = (workflowModules as any).modules || [];
    }

    return {
      ...event,
      workflowModules,
      wizardData,
      type: resolvedType,
      eventType: resolvedType,
      baseEventType: event.eventType,
      categoryKey: customKey || undefined,
    };
  }

  async createEvent(
    tenantId: string,
    createdById: string,
    dto: CreateEventDto,
  ) {
    const customTypes = await this.getEventTypes(tenantId);

    // Identify selected type code
    let selectedTypeCode = dto.type || dto.eventType || dto.categoryKey;
    if (!selectedTypeCode && Array.isArray(dto.tags)) {
      const typeTag = dto.tags.find((t) => typeof t === 'string' && t.startsWith('type:'));
      if (typeTag) {
        selectedTypeCode = typeTag.replace('type:', '');
      } else {
        const catTag = dto.tags.find((t) => typeof t === 'string' && t.startsWith('categoryKey:'));
        if (catTag) selectedTypeCode = catTag.replace('categoryKey:', '');
      }
    }

    const isCustomType = Boolean(selectedTypeCode && !VALID_PRISMA_EVENT_TYPES.includes(selectedTypeCode));

    // Determine final valid Prisma enum eventType
    let finalEventType: any = 'ACADEMIC';
    if (dto.baseType && VALID_PRISMA_EVENT_TYPES.includes(dto.baseType)) {
      finalEventType = dto.baseType;
    } else if (dto.eventType && VALID_PRISMA_EVENT_TYPES.includes(dto.eventType)) {
      finalEventType = dto.eventType;
    } else if (dto.type && VALID_PRISMA_EVENT_TYPES.includes(dto.type)) {
      finalEventType = dto.type;
    } else if (isCustomType) {
      const matchingType = customTypes.find((t) => t.code === selectedTypeCode);
      if (matchingType?.baseType && VALID_PRISMA_EVENT_TYPES.includes(matchingType.baseType)) {
        finalEventType = matchingType.baseType;
      }
    }

    // Construct clean tags
    let tags = [...(dto.tags || [])];
    if (isCustomType && selectedTypeCode) {
      tags = tags.filter((t) => !String(t).startsWith('type:') && !String(t).startsWith('categoryKey:'));
      tags.push(`type:${selectedTypeCode}`);
      tags.push(`categoryKey:${selectedTypeCode}`);
    } else if (dto.categoryKey) {
      const marker = `categoryKey:${dto.categoryKey}`;
      if (!tags.includes(marker)) tags.push(marker);
    }

    let workflowModules = dto.workflowModules;
    if (
      (finalEventType === 'STARTUP_WEEKEND' || selectedTypeCode === 'STARTUP_WEEKEND') &&
      (!workflowModules || (Array.isArray(workflowModules) && workflowModules.length === 0))
    ) {
      workflowModules = DEFAULT_STARTUP_WEEKEND_MODULES as any;
    }

    const createData: any = {
      tenantId,
      title: dto.title,
      description: dto.description,
      eventType: finalEventType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      isAllDay: dto.isAllDay || false,
      targetAudience: dto.targetAudience || 'ALL',
      targetClassIds: dto.targetClassIds || [],
      location: dto.location,
      coverUrl: dto.coverUrl,
      tags,
      workflowModules: workflowModules
        ? (workflowModules as any)
        : undefined,
      createdById,
    };

    const created = await this.prisma.schoolEvent.create({
      data: createData,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true, avatarUrl: true },
        },
      },
    });

    return this.hydrateEvent(created);
  }

  async listEvents(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    audience?: string,
    userId?: string,
    role?: string,
    eventType?: string,
    search?: string,
  ) {
    const where: any = { tenantId, deletedAt: null };

    if (startDate && endDate) {
      where.AND = [
        { startDate: { lte: new Date(endDate) } },
        { endDate: { gte: new Date(startDate) } },
      ];
    }

    if (audience && audience !== 'ALL') {
      where.OR = [
        { targetAudience: 'ALL' },
        { targetAudience: audience },
      ];
    }

    if (search) {
      const searchCondition = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      };
      if (where.AND) {
        where.AND.push(searchCondition);
      } else {
        where.AND = [searchCondition];
      }
    }

    if (eventType && eventType !== 'ALL') {
      let typeCondition: any;
      if (VALID_PRISMA_EVENT_TYPES.includes(eventType)) {
        typeCondition = {
          OR: [
            { eventType: eventType as any },
            { tags: { has: `type:${eventType}` } },
            { tags: { has: `categoryKey:${eventType}` } },
          ],
        };
      } else {
        typeCondition = {
          OR: [
            { tags: { has: `type:${eventType}` } },
            { tags: { has: `categoryKey:${eventType}` } },
          ],
        };
      }

      if (where.AND) {
        where.AND.push(typeCondition);
      } else {
        where.AND = [typeCondition];
      }
    }

    const schoolEvents = await this.prisma.schoolEvent.findMany({
      where,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true, avatarUrl: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    const hydratedSchoolEvents = schoolEvents.map((ev) => this.hydrateEvent(ev));

    let homeworkEvents: any[] = [];
    if (!eventType || eventType === 'ALL' || eventType === 'HOMEWORK') {
      try {
        const hwWhere: any = { tenantId };
        if (startDate && endDate) {
          hwWhere.dueDate = {
            gte: new Date(startDate),
            lte: new Date(endDate),
          };
        }
        if (search) {
          hwWhere.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }
        const homeworks = await this.prisma.homework.findMany({
          where: hwWhere,
          include: {
            lesson: { select: { id: true, name: true } },
            classroom: { select: { id: true, name: true } },
            teacher: { include: { user: { select: { firstName: true, lastName: true, role: true, avatarUrl: true } } } },
          },
          orderBy: { dueDate: 'asc' },
        });

        homeworkEvents = homeworks.map((hw) => ({
          id: `hw-${hw.id}`,
          tenantId: hw.tenantId,
          title: `مهلت تکلیف: ${hw.title}`,
          description: hw.description || '',
          eventType: 'HOMEWORK',
          type: 'HOMEWORK',
          startDate: hw.dueDate,
          endDate: hw.dueDate,
          isAllDay: false,
          targetAudience: 'SPECIFIC_CLASSES',
          targetClassIds: [hw.classroomId],
          location: hw.lesson?.name || (hw.classroom?.name ? (hw.classroom.name.startsWith('کلاس') ? hw.classroom.name : `کلاس ${hw.classroom.name}`) : undefined),
          tags: ['HOMEWORK', `lesson:${hw.lessonId}`],
          homeworkId: hw.id,
          lessonName: hw.lesson?.name,
          classroomName: hw.classroom?.name,
          createdBy: hw.teacher?.user
            ? {
                firstName: hw.teacher.user.firstName,
                lastName: hw.teacher.user.lastName,
                role: 'TEACHER',
              }
            : undefined,
          createdAt: hw.createdAt,
        }));
      } catch {
        // Non-blocking fallback
      }
    }

    let coachingEvents: any[] = [];
    if (!eventType || eventType === 'ALL' || eventType === 'MEETING' || eventType === 'COACHING') {
      coachingEvents = await this.fetchCoachingCalendarEvents(tenantId, {
        startDate,
        endDate,
        userId,
        role,
        search,
      });
    }

    const allEvents = [...hydratedSchoolEvents, ...homeworkEvents, ...coachingEvents];
    allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return allEvents;
  }

  private async fetchCoachingCalendarEvents(
    tenantId: string,
    filter: {
      startDate?: string;
      endDate?: string;
      search?: string;
      userId?: string;
      role?: string;
    },
  ): Promise<any[]> {
    try {
      const csWhere: any = { tenantId };
      if (filter.startDate && filter.endDate) {
        csWhere.scheduledDate = {
          gte: new Date(filter.startDate),
          lte: new Date(filter.endDate),
        };
      }

      if (filter.search) {
        csWhere.OR = [
          { coachNotes: { contains: filter.search, mode: 'insensitive' } },
          { coach: { firstName: { contains: filter.search, mode: 'insensitive' } } },
          { coach: { lastName: { contains: filter.search, mode: 'insensitive' } } },
          { student: { firstName: { contains: filter.search, mode: 'insensitive' } } },
          { student: { lastName: { contains: filter.search, mode: 'insensitive' } } },
        ];
      }

      if (filter.role === Role.STUDENT && filter.userId) {
        csWhere.studentId = filter.userId;
      } else if (filter.role === Role.COACH && filter.userId) {
        csWhere.coachId = filter.userId;
      } else if (filter.role === Role.PARENT && filter.userId) {
        const parent = await this.prisma.parentProfile.findFirst({
          where: { userId: filter.userId, tenantId },
          include: { studentLinks: { include: { student: true } } },
        });
        const childUserIds = parent?.studentLinks?.map((l) => l.student?.userId).filter(Boolean) || [];
        if (childUserIds.length > 0) {
          csWhere.studentId = { in: childUserIds };
        } else {
          return [];
        }
      } else if (
        filter.role !== Role.SUPER_ADMIN &&
        filter.role !== Role.SCHOOL_ADMIN &&
        filter.role !== Role.STAFF &&
        filter.userId
      ) {
        csWhere.OR = [{ studentId: filter.userId }, { coachId: filter.userId }];
      }

      const sessions = await this.prisma.coachingSession.findMany({
        where: csWhere,
        include: {
          coach: { select: { firstName: true, lastName: true, avatarUrl: true } },
          student: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { scheduledDate: 'asc' },
      });

      return sessions.map((cs) => {
        const end = new Date(cs.scheduledDate.getTime() + (cs.durationMinutes || 20) * 60 * 1000);
        const partyName =
          filter.role === Role.STUDENT
            ? `کوچ ${cs.coach?.firstName || ''} ${cs.coach?.lastName || ''}`.trim()
            : `دانش‌آموز ${cs.student?.firstName || ''} ${cs.student?.lastName || ''}`.trim();

        return {
          id: `coaching-${cs.id}`,
          tenantId: cs.tenantId,
          title: `جلسه کوچینگ: ${partyName}`,
          description:
            cs.coachNotes ||
            (cs.sessionType === 'EXTRA' ? 'جلسه فوق‌العاده کوچینگ' : 'جلسه منظم کوچینگ'),
          eventType: 'MEETING',
          type: 'MEETING',
          startDate: cs.scheduledDate,
          endDate: end,
          isAllDay: false,
          targetAudience: 'ALL',
          targetClassIds: [],
          location: 'اتاق مشاوره و کوچینگ',
          tags: ['COACHING', 'MEETING', `sessionType:${cs.sessionType}`],
          coachingSessionId: cs.id,
          sessionType: cs.sessionType,
          durationMinutes: cs.durationMinutes,
          attendanceStatus: cs.attendanceStatus,
          createdBy: cs.coach
            ? {
                firstName: cs.coach.firstName,
                lastName: cs.coach.lastName,
                role: 'COACH',
                avatarUrl: cs.coach.avatarUrl,
              }
            : undefined,
          createdAt: cs.createdAt,
        };
      });
    } catch {
      return [];
    }
  }

  async listAnnouncements(
    tenantId: string,
    audience?: string,
    classroomId?: string,
  ) {
    const where: any = { tenantId, deletedAt: null };

    const conditions: any[] = [];
    if (audience && audience !== 'ALL') {
      conditions.push({
        OR: [{ targetAudience: 'ALL' }, { targetAudience: audience }],
      });
    }

    if (classroomId) {
      conditions.push({
        OR: [
          { targetAudience: { not: 'SPECIFIC_CLASSES' } },
          { targetClassIds: { has: classroomId } },
        ],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    return this.prisma.schoolEvent.findMany({
      where,
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async ensureDefaultStartupWeekendEvent(tenantId: string) {
    // Disabled to ensure strict tenant isolation and no cross-school mock event leakage
    return null;
  }

  async getEventById(tenantId: string, eventId: string): Promise<any> {
    if (eventId.startsWith('hw-')) {
      const hwId = eventId.replace('hw-', '');
      const hw = await this.prisma.homework.findFirst({
        where: { id: hwId, tenantId },
        include: {
          lesson: { select: { id: true, name: true } },
          classroom: { select: { id: true, name: true } },
          teacher: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                  avatarUrl: true,
                  phone: true,
                },
              },
            },
          },
          tenant: {
            select: { id: true, name: true, slug: true, theme: true, logoUrl: true },
          },
        },
      });

      if (hw) {
        return {
          id: `hw-${hw.id}`,
          tenantId: hw.tenantId,
          title: `مهلت تکلیف: ${hw.title}`,
          description: hw.description || '',
          eventType: 'HOMEWORK',
          type: 'HOMEWORK',
          startDate: hw.dueDate,
          endDate: hw.dueDate,
          isAllDay: false,
          targetAudience: 'SPECIFIC_CLASSES',
          targetClassIds: [hw.classroomId],
          location:
            hw.lesson?.name ||
            (hw.classroom?.name
              ? hw.classroom.name.startsWith('کلاس')
                ? hw.classroom.name
                : `کلاس ${hw.classroom.name}`
              : undefined),
          tags: ['HOMEWORK', `lesson:${hw.lessonId}`],
          homeworkId: hw.id,
          lessonName: hw.lesson?.name,
          classroomName: hw.classroom?.name,
          createdBy: hw.teacher?.user || undefined,
          tenant: hw.tenant,
          createdAt: hw.createdAt,
        };
      }
    }

    let event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true, avatarUrl: true, phone: true },
        },
        tenant: {
          select: { id: true, name: true, slug: true, theme: true, logoUrl: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('رویداد مورد نظر یافت نشد');
    }

    return this.hydrateEvent(event);
  }

  async updateEvent(
    tenantId: string,
    eventId: string,
    dto: UpdateEventDto,
  ): Promise<any> {
    let existing = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('رویداد مورد نظر یافت نشد');
    }

    const customTypes = await this.getEventTypes(tenantId);

    // Identify target type code
    let selectedTypeCode = dto.type || dto.eventType || dto.categoryKey;
    if (!selectedTypeCode && Array.isArray(dto.tags)) {
      const typeTag = dto.tags.find((t) => typeof t === 'string' && t.startsWith('type:'));
      if (typeTag) {
        selectedTypeCode = typeTag.replace('type:', '');
      } else {
        const catTag = dto.tags.find((t) => typeof t === 'string' && t.startsWith('categoryKey:'));
        if (catTag) selectedTypeCode = catTag.replace('categoryKey:', '');
      }
    }

    let nextTags: string[] | undefined;
    let finalEventType: any = undefined;

    if (
      dto.tags !== undefined ||
      dto.type !== undefined ||
      dto.eventType !== undefined ||
      dto.categoryKey !== undefined ||
      dto.baseType !== undefined
    ) {
      const base = dto.tags !== undefined ? dto.tags : ((existing.tags as string[]) || []);
      let cleanedTags = base.filter(
        (t) => !String(t).startsWith('type:') && !String(t).startsWith('categoryKey:'),
      );

      if (selectedTypeCode) {
        if (!VALID_PRISMA_EVENT_TYPES.includes(selectedTypeCode)) {
          // Custom type
          cleanedTags.push(`type:${selectedTypeCode}`);
          cleanedTags.push(`categoryKey:${selectedTypeCode}`);

          const matchingType = customTypes.find((t) => t.code === selectedTypeCode);
          if (dto.baseType && VALID_PRISMA_EVENT_TYPES.includes(dto.baseType)) {
            finalEventType = dto.baseType;
          } else if (dto.eventType && VALID_PRISMA_EVENT_TYPES.includes(dto.eventType)) {
            finalEventType = dto.eventType;
          } else if (matchingType?.baseType && VALID_PRISMA_EVENT_TYPES.includes(matchingType.baseType)) {
            finalEventType = matchingType.baseType;
          } else {
            finalEventType = 'ACADEMIC';
          }
        } else {
          // Standard type (e.g. EXAM, SPORTS, etc.)
          finalEventType = selectedTypeCode;
        }
      } else if (dto.eventType && VALID_PRISMA_EVENT_TYPES.includes(dto.eventType)) {
        finalEventType = dto.eventType;
      }

      nextTags = cleanedTags;
    }

    let nextWorkflowModules = dto.workflowModules;
    if (
      (finalEventType === 'STARTUP_WEEKEND' || selectedTypeCode === 'STARTUP_WEEKEND') &&
      (!existing.workflowModules ||
        (Array.isArray(existing.workflowModules) && (existing.workflowModules as any).length === 0)) &&
      (!nextWorkflowModules ||
        (Array.isArray(nextWorkflowModules) && nextWorkflowModules.length === 0))
    ) {
      nextWorkflowModules = DEFAULT_STARTUP_WEEKEND_MODULES as any;
    }

    const updated = await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(finalEventType ? { eventType: finalEventType } : {}),
        ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.isAllDay !== undefined ? { isAllDay: dto.isAllDay } : {}),
        ...(dto.targetAudience ? { targetAudience: dto.targetAudience } : {}),
        ...(dto.targetClassIds ? { targetClassIds: dto.targetClassIds } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.coverUrl !== undefined ? { coverUrl: dto.coverUrl } : {}),
        ...(nextTags !== undefined ? { tags: nextTags } : {}),
        ...(nextWorkflowModules !== undefined
          ? { workflowModules: nextWorkflowModules as any }
          : {}),
      },
      include: {
        createdBy: {
          select: { firstName: true, lastName: true, role: true, avatarUrl: true },
        },
      },
    });

    return this.hydrateEvent(updated);
  }

  async listRoadmapEvents(
    tenantId: string,
    eventType?: string,
    audience?: string,
    search?: string,
    userId?: string,
    role?: string,
  ): Promise<any> {
    const where: any = { tenantId, deletedAt: null };
    const conditions: any[] = [];

    if (eventType && eventType !== 'ALL') {
      if (eventType === 'HOMEWORK') {
        // Will only fetch homeworks
      } else if (VALID_PRISMA_EVENT_TYPES.includes(eventType)) {
        conditions.push({
          OR: [
            { eventType: eventType as any },
            { tags: { has: `type:${eventType}` } },
            { tags: { has: `categoryKey:${eventType}` } },
          ],
        });
      } else {
        conditions.push({
          OR: [
            { tags: { has: `type:${eventType}` } },
            { tags: { has: `categoryKey:${eventType}` } },
          ],
        });
      }
    }

    if (audience && audience !== 'ALL') {
      conditions.push({
        OR: [
          { targetAudience: 'ALL' },
          { targetAudience: audience },
        ],
      });
    }

    if (search) {
      conditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    let schoolEvents: any[] = [];
    if (!eventType || eventType !== 'HOMEWORK') {
      const rawSchoolEvents = await this.prisma.schoolEvent.findMany({
        where,
        include: {
          createdBy: {
            select: { firstName: true, lastName: true, role: true, avatarUrl: true },
          },
        },
        orderBy: { startDate: 'asc' },
      });
      schoolEvents = rawSchoolEvents.map((ev) => this.hydrateEvent(ev));
    }

    let homeworkEvents: any[] = [];
    if (!eventType || eventType === 'ALL' || eventType === 'HOMEWORK') {
      try {
        const hwWhere: any = { tenantId };
        if (search) {
          hwWhere.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ];
        }
        const homeworks = await this.prisma.homework.findMany({
          where: hwWhere,
          include: {
            lesson: { select: { id: true, name: true } },
            classroom: { select: { id: true, name: true } },
            teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
          orderBy: { dueDate: 'asc' },
        });

        homeworkEvents = homeworks.map((hw) => ({
          id: `hw-${hw.id}`,
          tenantId: hw.tenantId,
          title: `مهلت تکلیف: ${hw.title}`,
          description: hw.description || '',
          eventType: 'HOMEWORK',
          type: 'HOMEWORK',
          startDate: hw.dueDate,
          endDate: hw.dueDate,
          isAllDay: false,
          targetAudience: 'SPECIFIC_CLASSES',
          targetClassIds: [hw.classroomId],
          location: hw.lesson?.name || (hw.classroom?.name ? (hw.classroom.name.startsWith('کلاس') ? hw.classroom.name : `کلاس ${hw.classroom.name}`) : undefined),
          tags: ['HOMEWORK', `lesson:${hw.lessonId}`],
          homeworkId: hw.id,
          lessonName: hw.lesson?.name,
          classroomName: hw.classroom?.name,
          createdBy: hw.teacher?.user
            ? {
                firstName: hw.teacher.user.firstName,
                lastName: hw.teacher.user.lastName,
                role: 'TEACHER',
              }
            : undefined,
          createdAt: hw.createdAt,
        }));
      } catch {
        // Non-blocking fallback
      }
    }

    let coachingEvents: any[] = [];
    if (!eventType || eventType === 'ALL' || eventType === 'MEETING' || eventType === 'COACHING') {
      coachingEvents = await this.fetchCoachingCalendarEvents(tenantId, {
        search,
        userId,
        role,
      });
    }

    const allEvents = [...schoolEvents, ...homeworkEvents, ...coachingEvents];
    allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return allEvents;
  }

  async deleteEvent(tenantId: string, eventId: string): Promise<any> {
    const event = await this.prisma.schoolEvent.findFirst({
      where: {
        id: eventId,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (event) {
      await this.prisma.schoolEvent.update({
        where: { id: event.id },
        data: { deletedAt: new Date() },
      });
    }

    return { message: 'رویداد با موفقیت حذف گردید' };
  }

  async restoreEvent(tenantId: string, eventId: string): Promise<any> {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: { not: null } },
    });
    if (!event) {
      throw new NotFoundException('رویداد حذف‌شده مورد نظر یافت نشد');
    }

    const restored = await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: { deletedAt: null },
    });
    return { message: 'رویداد با موفقیت بازگردانده شد', data: this.hydrateEvent(restored) };
  }

  async getEventTypes(tenantId: string) {
    const defaultTypes = [
      { code: 'STARTUP_WEEKEND', titleFa: 'استارت‌آپ ویکند', color: 'violet', baseType: 'STARTUP_WEEKEND', isDefault: true },
      { code: 'ACADEMIC', titleFa: 'رویداد عمومی / آموزشی', color: 'emerald', baseType: 'ACADEMIC', isDefault: true },
      { code: 'EXAM', titleFa: 'آزمون و امتحان هماهنگ', color: 'amber', baseType: 'EXAM', isDefault: true },
      { code: 'HOMEWORK', titleFa: 'مهلت تحویل تکالیف', color: 'orange', baseType: 'HOMEWORK', isDefault: true },
      { code: 'MEETING', titleFa: 'جلسه اولیاء و مربیان', color: 'purple', baseType: 'MEETING', isDefault: true },
      { code: 'CULTURAL', titleFa: 'جشن و مراسم مدرسه', color: 'rose', baseType: 'CULTURAL', isDefault: true },
      { code: 'SPORTS', titleFa: 'مسابقات و رویداد ورزشی', color: 'blue', baseType: 'SPORTS', isDefault: true },
      { code: 'EXCURSION', titleFa: 'اردو و بازدید علمی', color: 'teal', baseType: 'EXCURSION', isDefault: true },
    ];

    if (!tenantId) return defaultTypes;

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const settings = (tenant?.settings as Record<string, any>) || {};
      if (Array.isArray(settings.eventTypes) && settings.eventTypes.length > 0) {
        const existingCodes = new Set(settings.eventTypes.map((t: any) => t.code));
        const merged = [...settings.eventTypes];
        for (const def of defaultTypes) {
          if (!existingCodes.has(def.code)) {
            merged.push(def);
          }
        }
        return merged;
      }
    } catch {
      // Fallback to default types
    }

    return defaultTypes;
  }

  async updateEventTypes(tenantId: string, eventTypes: any[]) {
    if (!tenantId) {
      throw new BadRequestException('شناسه مدرسه (tenantId) نامعتبر است');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      throw new NotFoundException('مدرسه مورد نظر یافت نشد');
    }

    const sanitized = (eventTypes || [])
      .map((t) => ({
        code: String(t.code || '').trim(),
        titleFa: String(t.titleFa || '').trim(),
        color: String(t.color || 'emerald').trim(),
        baseType: String(t.baseType || 'ACADEMIC').trim(),
        isDefault: Boolean(t.isDefault),
      }))
      .filter((t) => t.code && t.titleFa);

    const currentSettings = (tenant?.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      eventTypes: sanitized,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings },
    });

    return { success: true, eventTypes: sanitized };
  }

  private static readonly DEFAULT_EVENT_CATEGORIES = [
    { key: 'STARTUP_WEEKEND', label: 'استارت‌آپ ویکند', icon: 'Rocket', color: '', removable: true },
    { key: 'ACADEMIC', label: 'آموزشی و مهارت', icon: 'BookOpen', color: '', removable: true },
    { key: 'CULTURAL', label: 'فرهنگی و جشن‌ها', icon: 'PartyPopper', color: '', removable: true },
    { key: 'SPORTS', label: 'مسابقات و ورزش', icon: 'Trophy', color: '', removable: true },
    { key: 'EXAM', label: 'آزمون‌ها و سنجش', icon: 'Flame', color: '', removable: true },
    { key: 'EXCURSION', label: 'اردو و بازدید علمی', icon: 'Compass', color: '', removable: true },
    { key: 'MEETING', label: 'جلسات و شورا', icon: 'Users', color: '', removable: true },
    { key: 'HOLIDAY', label: 'تعطیلی و مناسبت', icon: 'CalendarDays', color: '', removable: true },
  ];

  private getEventCategoriesFromSettings(settings: any): any[] | null {
    if (settings && typeof settings === 'object' && Array.isArray(settings.eventCategories)) {
      return settings.eventCategories;
    }
    return null;
  }

  private async saveEventCategories(tenantId: string, categories: any[]) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const settings = tenant?.settings && typeof tenant.settings === 'object' ? { ...(tenant.settings as any) } : {};
    settings.eventCategories = categories;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: settings as any },
    });
    return categories;
  }

  async listEventCategories(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const existing = this.getEventCategoriesFromSettings(tenant?.settings);

    // Seed defaults only on first initialization. Never re-add deleted defaults.
    if (existing !== null) {
      const hasStartup = existing.some((c) => c.key === 'STARTUP_WEEKEND');
      if (!hasStartup) {
        const startupDefault = CalendarService.DEFAULT_EVENT_CATEGORIES.find((d) => d.key === 'STARTUP_WEEKEND');
        if (startupDefault) {
          const merged = [startupDefault, ...existing];
          await this.saveEventCategories(tenantId, merged);
          return merged;
        }
      }
      return existing;
    }

    const next = CalendarService.DEFAULT_EVENT_CATEGORIES.map((d) => ({ ...d }));
    await this.saveEventCategories(tenantId, next);
    return next;
  }

  async createEventCategory(tenantId: string, category: any) {
    const existing = await this.listEventCategories(tenantId);
    if (existing.some((c) => c.key === category.key)) {
      throw new ConflictException('کلید این دسته‌بندی قبلاً ثبت شده است');
    }
    const next = [...existing, { removable: true, ...category }];
    await this.saveEventCategories(tenantId, next);
    return { message: 'دسته‌بندی با موفقیت ایجاد شد', data: next[next.length - 1] };
  }

  async updateEventCategory(tenantId: string, key: string, dto: any) {
    const existing = await this.listEventCategories(tenantId);
    const idx = existing.findIndex((c) => c.key === key);
    if (idx === -1) {
      throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
    }
    const updated = { ...existing[idx], ...(dto.label ? { label: dto.label } : {}), ...(dto.icon !== undefined ? { icon: dto.icon } : {}), ...(dto.color !== undefined ? { color: dto.color } : {}) };
    const next = existing.map((c, i) => (i === idx ? updated : c));
    await this.saveEventCategories(tenantId, next);
    return { message: 'دسته‌بندی با موفقیت ویرایش شد', data: updated };
  }

  async deleteEventCategory(tenantId: string, key: string) {
    const existing = await this.listEventCategories(tenantId);
    const target = existing.find((c) => c.key === key);
    if (!target) {
      throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
    }
    const next = existing.filter((c) => c.key !== key);
    await this.saveEventCategories(tenantId, next);
    return { message: 'دسته‌بندی با موفقیت حذف شد' };
  }

  // ==========================================
  // مدیریت داده‌های زنده ویزارد رویداد (ایده‌ها، قفل‌ها، تیم‌ها)
  // ==========================================

  private parseWorkflowModules(raw: any, eventId: string): { modules: any[]; wizardData: any } {
    let modules: any[] = [];
    let wizardData: any = null;

    if (Array.isArray(raw)) {
      modules = raw;
    } else if (raw && typeof raw === 'object') {
      modules = Array.isArray(raw.modules) ? raw.modules : [];
      wizardData = raw.wizardData || null;
    }

    if (!wizardData) {
      const initialIdeas = getInitialBackendIdeas(eventId);
      wizardData = {
        unlockedSteps: [1, 2, 3, 4, 5, 6, 7, 8],
        isIdeaSubmissionLocked: false,
        ideas: initialIdeas,
        teams: getInitialBackendTeams(eventId),
        poll: null,
      };
    } else {
      if (!Array.isArray(wizardData.unlockedSteps) || wizardData.unlockedSteps.length === 0) {
        wizardData.unlockedSteps = [1, 2, 3, 4, 5, 6, 7, 8];
      }
      if (!Array.isArray(wizardData.ideas) || wizardData.ideas.length === 0) {
        wizardData.ideas = getInitialBackendIdeas(eventId);
      }
      if (!wizardData.teams || Object.keys(wizardData.teams).length === 0) {
        wizardData.teams = getInitialBackendTeams(eventId);
      }
    }

    return { modules, wizardData };
  }

  async getEventWizardData(tenantId: string, eventId: string) {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, title: true, workflowModules: true },
    });
    if (!event) throw new NotFoundException('رویداد مورد نظر یافت نشد');

    const { modules, wizardData } = this.parseWorkflowModules(event.workflowModules, eventId);
    return {
      eventId: event.id,
      eventTitle: event.title,
      modules,
      ...wizardData,
    };
  }

  async submitEventIdea(tenantId: string, eventId: string, user: any, dto: SubmitEventIdeaDto) {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('رویداد مورد نظر یافت نشد');

    const { modules, wizardData } = this.parseWorkflowModules(event.workflowModules, eventId);

    const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(user.role);
    if (wizardData.isIdeaSubmissionLocked && !isManager) {
      throw new BadRequestException('مهلت ثبت ایده به پایان رسیده و قفل شده است');
    }

    const currentIdeas = Array.isArray(wizardData.ideas) ? wizardData.ideas : [];
    const maxNumber = currentIdeas.reduce((max: number, i: any) => Math.max(max, Number(i.ideaNumber) || 0), 0);
    const assignedNumber = maxNumber + 1;

    const authorFullName = dto.authorName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'دانش‌آموز';
    const authorRoleName = user.role === 'STUDENT' ? 'دانش‌آموز' : 'مدیر رویداد';

    const newIdea = {
      id: `idea_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      eventId,
      ideaNumber: assignedNumber,
      title: dto.title.trim(),
      description: dto.description.trim(),
      authorName: authorFullName,
      authorRole: authorRoleName,
      authorUserId: user.id,
      createdAt: new Date().toISOString(),
      status: 'APPROVED',
      category: dto.category,
      goals: dto.goals,
      suggestedMaterials: dto.suggestedMaterials,
      attachmentUrl: dto.attachmentUrl,
    };

    const updatedIdeas = [newIdea, ...currentIdeas];
    wizardData.ideas = updatedIdeas;

    await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        workflowModules: {
          modules,
          wizardData,
        },
      },
    });

    return {
      message: 'ایده با موفقیت ثبت شد',
      idea: newIdea,
      ideas: updatedIdeas,
    };
  }

  async updateEventIdea(tenantId: string, eventId: string, user: any, ideaId: string, dto: UpdateEventIdeaDto) {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('رویداد مورد نظر یافت نشد');

    const { modules, wizardData } = this.parseWorkflowModules(event.workflowModules, eventId);
    const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(user.role);

    const ideaIndex = (wizardData.ideas || []).findIndex((i: any) => i.id === ideaId);
    if (ideaIndex === -1) throw new NotFoundException('ایده یافت نشد');

    const existingIdea = wizardData.ideas[ideaIndex];
    if (!isManager && existingIdea.authorUserId && existingIdea.authorUserId !== user.id) {
      throw new ForbiddenException('شما دسترسی ویرایش این ایده را ندارید');
    }

    const updatedIdea = {
      ...existingIdea,
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.status !== undefined && isManager ? { status: dto.status } : {}),
      ...(dto.ideaNumber !== undefined && isManager ? { ideaNumber: dto.ideaNumber } : {}),
      ...(dto.authorName !== undefined ? { authorName: dto.authorName.trim() } : {}),
    };

    wizardData.ideas[ideaIndex] = updatedIdea;

    await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        workflowModules: {
          modules,
          wizardData,
        },
      },
    });

    return {
      message: 'ایده با موفقیت به‌روزرسانی شد',
      idea: updatedIdea,
      ideas: wizardData.ideas,
    };
  }

  async deleteEventIdea(tenantId: string, eventId: string, user: any, ideaId: string) {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('رویداد مورد نظر یافت نشد');

    const { modules, wizardData } = this.parseWorkflowModules(event.workflowModules, eventId);
    const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(user.role);

    const existingIdea = (wizardData.ideas || []).find((i: any) => i.id === ideaId);
    if (!existingIdea) throw new NotFoundException('ایده یافت نشد');

    if (!isManager && existingIdea.authorUserId && existingIdea.authorUserId !== user.id) {
      throw new ForbiddenException('شما دسترسی حذف این ایده را ندارید');
    }

    wizardData.ideas = (wizardData.ideas || []).filter((i: any) => i.id !== ideaId);

    await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        workflowModules: {
          modules,
          wizardData,
        },
      },
    });

    return { message: 'ایده با موفقیت حذف شد', ideas: wizardData.ideas };
  }

  async updateEventWizardSteps(tenantId: string, eventId: string, user: any, dto: UpdateEventWizardStepsDto) {
    const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(user.role);
    if (!isManager) throw new ForbiddenException('فقط مدیر رویداد می‌تواند قفل مراحل را تغییر دهد');

    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('رویداد مورد نظر یافت نشد');

    const { modules, wizardData } = this.parseWorkflowModules(event.workflowModules, eventId);

    if (dto.unlockedSteps !== undefined) {
      wizardData.unlockedSteps = dto.unlockedSteps;
    }
    if (dto.isIdeaSubmissionLocked !== undefined) {
      wizardData.isIdeaSubmissionLocked = dto.isIdeaSubmissionLocked;
    }

    await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        workflowModules: {
          modules,
          wizardData,
        },
      },
    });

    return {
      message: 'تنظیمات مراحل رویداد با موفقیت ذخیره شد',
      unlockedSteps: wizardData.unlockedSteps,
      isIdeaSubmissionLocked: wizardData.isIdeaSubmissionLocked,
    };
  }

  async updateEventTeams(tenantId: string, eventId: string, user: any, teams: Record<string, any>) {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('رویداد مورد نظر یافت نشد');

    const { modules, wizardData } = this.parseWorkflowModules(event.workflowModules, eventId);
    wizardData.teams = { ...(wizardData.teams || {}), ...teams };

    await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        workflowModules: {
          modules,
          wizardData,
        },
      },
    });

    return { message: 'ترکیب تیم‌ها با موفقیت در سرور ذخیره شد', teams: wizardData.teams };
  }

  async submitEventVote(tenantId: string, eventId: string, user: any, selectedOptionIds: string[]) {
    const event = await this.prisma.schoolEvent.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) throw new NotFoundException('رویداد مورد نظر یافت نشد');

    const { modules, wizardData } = this.parseWorkflowModules(event.workflowModules, eventId);
    if (!wizardData.poll) {
      throw new BadRequestException('فرم نظرسنجی برای این رویداد هنوز تعریف نشده است');
    }
    if (wizardData.poll.isClosed) {
      throw new BadRequestException('مهلت رأی‌گیری به پایان رسیده است');
    }

    if (!wizardData.pollVotes) {
      wizardData.pollVotes = {};
    }

    const voterId = user.id;
    if (wizardData.pollVotes[voterId]) {
      throw new BadRequestException('شما قبلاً در این نظرسنجی رأی ثبت کرده‌اید');
    }

    wizardData.pollVotes[voterId] = {
      selectedOptionIds,
      votedAt: new Date().toISOString(),
    };

    if (Array.isArray(wizardData.poll.options)) {
      wizardData.poll.options = wizardData.poll.options.map((opt: any) => {
        const count = selectedOptionIds.includes(opt.id) ? (opt.voteCount || 0) + 1 : (opt.voteCount || 0);
        return { ...opt, voteCount: count };
      });
      const total = wizardData.poll.options.reduce((sum: number, o: any) => sum + (o.voteCount || 0), 0);
      wizardData.poll.totalVotes = total;
      wizardData.poll.totalRespondents = Object.keys(wizardData.pollVotes).length;
      wizardData.poll.options = wizardData.poll.options.map((opt: any) => ({
        ...opt,
        percentage: total > 0 ? Math.round(((opt.voteCount || 0) / total) * 100) : 0,
      }));
    }

    await this.prisma.schoolEvent.update({
      where: { id: eventId },
      data: {
        workflowModules: {
          modules,
          wizardData,
        },
      },
    });

    return {
      message: 'رأی شما با موفقیت در سرور ثبت شد',
      poll: wizardData.poll,
    };
  }
}
