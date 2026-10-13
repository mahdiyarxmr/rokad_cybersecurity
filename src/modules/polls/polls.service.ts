import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePollDto,
  SubmitPollAnswersDto,
  CastVoteDto,
  PollStatusAction,
} from './dto/create-poll.dto';
import { Role } from '../../common/constants';
import { canViewPollResults } from './polls.permissions';

export interface SurveyQuestion {
  type: string;
  title: string;
  description?: string;
  options?: string[];
  maxSelections?: number;
  required?: boolean;
  displayMode?: 'buttons' | 'list';
  porscadQuestionId?: string | null;
}

const OPTION_TYPES = new Set([
  'choice',
  'picture_choice',
  'dropdown',
  'likert',
  'ranking',
  'matrix',
]);

import * as fs from 'fs';
import * as path from 'path';

const DEV_STORE_PATH = path.join(process.cwd(), '.polls_dev_store.json');
const DEFAULT_PORSCAD_USER_ID = '3d7a922f-f553-44c2-8591-7c12bb95278d';

function loadPersistedPolls(): any[] {
  try {
    if (fs.existsSync(DEV_STORE_PATH)) {
      const raw = fs.readFileSync(DEV_STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out legacy forms from old test accounts
        return parsed.filter(
          (p: any) =>
            !p.createdById ||
            p.createdById === DEFAULT_PORSCAD_USER_ID ||
            p.createdById === 'admin' ||
            p.createdById.startsWith('usr_') ||
            p.createdById.startsWith('usr-'),
        );
      }
    }
  } catch {}
  return [];
}

function savePersistedPolls(polls: any[]) {
  try {
    fs.writeFileSync(DEV_STORE_PATH, JSON.stringify(polls, null, 2), 'utf-8');
  } catch {}
}

const inMemoryPolls: any[] = loadPersistedPolls();
const inMemoryVotes: any[] = [];

function sanitizePollForRole(poll: any, role?: string) {
  if (!poll) return poll;
  if (canViewPollResults(role)) return poll;

  const sanitizedOptions = Array.isArray(poll.options)
    ? poll.options.map((opt: any) => ({ ...opt, voteCount: 0 }))
    : poll.options;

  return {
    ...poll,
    options: sanitizedOptions,
  };
}

@Injectable()
export class PollsService {
  constructor(private readonly prisma: PrismaService) {}

  private audienceForRole(role?: string): string | null {
    switch (role) {
      case Role.STUDENT:
        return 'STUDENTS';
      case Role.PARENT:
        return 'PARENTS';
      case Role.TEACHER:
      case Role.COACH:
      case Role.STAFF:
      case Role.SCHOOL_ADMIN:
      case Role.SUPER_ADMIN:
        return null;
      default:
        return 'ALL';
    }
  }

  async createPoll(tenantId: string, createdById: string, dto: CreatePollDto) {
    const rawQuestions = Array.isArray(dto.questions) ? dto.questions : [];
    const options = dto.options || [];

    const questionIds =
      (dto.porscadMeta?.questionIds as string[] | undefined) ||
      (dto as { porscadQuestionIds?: string[] }).porscadQuestionIds ||
      [];

    const questions = rawQuestions.map((q, index) => {
      let qOptions = Array.isArray(q.options) ? q.options.filter((o: any) => typeof o === 'string' && o.trim() !== '') : [];
      if (q.type === 'likert' && qOptions.length < 2) {
        qOptions = [
          'کاملاً موافق',
          'موافق',
          'ممتنع / خنثی',
          'مخالف',
          'کاملاً مخالف',
        ];
      } else if (q.type === 'yes_no' && qOptions.length < 2) {
        qOptions = ['بله', 'خیر'];
      } else if (q.type === 'statement' || q.type === 'group') {
        qOptions = [];
      }

      const porscadQId =
        (q as any).porscadQuestionId ||
        questionIds[index] ||
        null;

      return {
        ...q,
        options: qOptions,
        maxSelections: q.maxSelections ?? (q.type === 'choice' ? 1 : undefined),
        required: q.type === 'statement' || q.type === 'group' ? false : (q.required ?? true),
        displayMode: q.displayMode ?? 'buttons',
        porscadQuestionId: porscadQId,
      };
    });

    if (questions.length === 0) {
      if (options.length < 2 && dto.pollType !== 'RATING_SCALE') {
        throw new BadRequestException('نظرسنجی باید حداقل دارای ۲ گزینه باشد');
      }
    } else {
      const MUST_HAVE_OPTIONS = new Set(['choice', 'picture_choice', 'dropdown', 'ranking', 'matrix']);
      for (const q of questions) {
        if (MUST_HAVE_OPTIONS.has(q.type) && (!q.options || q.options.length < 2)) {
          throw new BadRequestException(
            `سوال «${q.title}» باید حداقل ۲ گزینه داشته باشد`,
          );
        }
      }
    }

    const start = dto.startDate ? new Date(dto.startDate) : new Date();
    const end = dto.endDate ? new Date(dto.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const validStart = isNaN(start.getTime()) ? new Date() : start;
    const validEnd = isNaN(end.getTime()) ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : end;

    try {
      const created = await this.prisma.poll.create({
        data: {
          tenantId,
          title: dto.title,
          description: dto.description,
          pollType: dto.pollType || 'SINGLE_CHOICE',
          targetAudience: dto.targetAudience || 'ALL',
          targetClassIds: dto.targetClassIds || [],
          startDate: validStart,
          endDate: validEnd,
          isAnonymous: dto.isAnonymous || false,
          createdById,
          questions: questions as any,
          porscadFormId: dto.porscadFormId,
          porscadFormPublicId: dto.porscadFormPublicId,
          options: {
            create:
              options.length > 0
                ? options.map((opt, index) => ({
                    text: opt.text,
                    orderIndex: index + 1,
                  }))
                : questions
                    .filter((q) => (q.options?.length || 0) > 0)
                    .flatMap((q, qi) =>
                      (q.options || []).map((text, oi) => ({
                        text,
                        orderIndex: qi * 10 + oi + 1,
                      })),
                    ),
          },
        },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
        },
      });
      inMemoryPolls.unshift(created);
      savePersistedPolls(inMemoryPolls);
      return created;
    } catch (err: any) {
      console.warn('⚠️ [PollsService.createPoll] DB offline fallback:', err?.message || err);
      const newPoll = {
        id: `poll_${Date.now()}`,
        tenantId,
        title: dto.title,
        description: dto.description || null,
        pollType: dto.pollType || 'SINGLE_CHOICE',
        targetAudience: dto.targetAudience || 'ALL',
        targetClassIds: dto.targetClassIds || [],
        startDate: validStart,
        endDate: validEnd,
        isClosed: false,
        isArchived: false,
        isAnonymous: dto.isAnonymous || false,
        createdById,
        questions: questions as any,
        porscadFormId: dto.porscadFormId || null,
        porscadFormPublicId: dto.porscadFormPublicId || null,
        options: (options.length > 0 ? options : questions.flatMap((q) => (q.options || []).map((text) => ({ text })))).map((opt, i) => ({
          id: `opt_${i + 1}`,
          text: opt.text,
          orderIndex: i + 1,
          voteCount: 0,
        })),
        _count: { votes: 0 },
        createdBy: { firstName: 'مدیر', lastName: 'سیستم', role: 'SUPER_ADMIN' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryPolls.unshift(newPoll);
      savePersistedPolls(inMemoryPolls);
      return newPoll;
    }
  }

  async listPolls(tenantId: string, userId?: string, role?: string) {
    const audience = this.audienceForRole(role);
    const where: Record<string, unknown> = { tenantId };
    if (audience) {
      where.targetAudience = { in: ['ALL', audience] };
    }

    if (!this.prisma.isConnected) {
      let list = inMemoryPolls.length > 0 ? inMemoryPolls : loadPersistedPolls();
      if (list.length === 0) {
        try {
          const res = await fetch(
            `https://pivwmyacpxdywevccpmw.supabase.co/rest/v1/forms?select=*,questions(*)&created_by=eq.${DEFAULT_PORSCAD_USER_ID}&deleted_at=is.null&order=created_at.desc&limit=30`,
            {
              headers: {
                apikey:
                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MjU1MSwiZXhwIjoyMTAzMjM4NTUxfQ.WqnDBvpwIOtDOBn7pHKozf0WzpF-S7F5nq7FB4aCPl0',
                Authorization:
                  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MjU1MSwiZXhwIjoyMTAzMjM4NTUxfQ.WqnDBvpwIOtDOBn7pHKozf0WzpF-S7F5nq7FB4aCPl0',
              },
            },
          );
          const pForms = await res.json();
          if (Array.isArray(pForms)) {
            list = pForms.map((pf: any) => ({
              id: pf.id,
              tenantId,
              title: pf.title || 'نظرسنجی',
              description: pf.description || pf.welcome_message || '',
              pollType: 'SINGLE_CHOICE',
              targetAudience: 'ALL',
              targetClassIds: [],
              startDate: new Date(pf.created_at || Date.now()),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              isClosed: false,
              isArchived: pf.archived || false,
              isAnonymous: false,
              createdById: pf.created_by || 'admin',
              porscadFormId: pf.id,
              porscadFormPublicId: pf.public_id,
              questions: (pf.questions || [])
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                .map((q: any) => ({
                  type: q.type,
                  title: q.title,
                  description: q.description,
                  placeholder: q.placeholder,
                  options: q.options || [],
                  maxSelections: q.max_selections || 1,
                  required: q.required ?? true,
                  porscadQuestionId: q.id,
                  validation: q.validation || {},
                  jump_actions: q.jump_actions || [],
                  points: q.points || 0,
                })),
              options: (pf.questions || []).flatMap((q: any) =>
                (q.options || []).map((text: string, i: number) => ({
                  id: `opt_${i}`,
                  text,
                  voteCount: 0,
                })),
              ),
              _count: { votes: 0 },
              createdBy: {
                firstName: 'مدرسه',
                lastName: 'رکاد',
                role: 'SCHOOL_ADMIN',
              },
              createdAt: new Date(pf.created_at || Date.now()),
              updatedAt: new Date(pf.updated_at || Date.now()),
            }));
            inMemoryPolls.splice(0, inMemoryPolls.length, ...list);
            savePersistedPolls(list);
          }
        } catch (fetchErr) {
          console.warn('Could not sync live porscad forms:', fetchErr);
        }
      }

      const filtered = list.filter((p) => {
        if (p.isArchived) return false;
        if (!audience) return true;
        return p.targetAudience === 'ALL' || p.targetAudience === audience;
      });
      return filtered.map((p) => sanitizePollForRole(p, role));
    }

    try {
      const items = await this.prisma.poll.findMany({
        where,
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          _count: { select: { votes: true } },
          createdBy: {
            select: { firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return items.map((p) => sanitizePollForRole(p, role));
    } catch (err: any) {
      console.warn('⚠️ [PollsService.listPolls] DB offline fallback:', err?.message || err);
      let list = inMemoryPolls.length > 0 ? inMemoryPolls : loadPersistedPolls();
      if (list.length === 0) {
        try {
          const res = await fetch(
            `https://pivwmyacpxdywevccpmw.supabase.co/rest/v1/forms?select=*,questions(*)&created_by=eq.${DEFAULT_PORSCAD_USER_ID}&deleted_at=is.null&order=created_at.desc&limit=30`,
            {
              headers: {
                apikey:
                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MjU1MSwiZXhwIjoyMTAzMjM4NTUxfQ.WqnDBvpwIOtDOBn7pHKozf0WzpF-S7F5nq7FB4aCPl0',
                Authorization:
                  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MjU1MSwiZXhwIjoyMTAzMjM4NTUxfQ.WqnDBvpwIOtDOBn7pHKozf0WzpF-S7F5nq7FB4aCPl0',
              },
            },
          );
          const pForms = await res.json();
          if (Array.isArray(pForms)) {
            list = pForms.map((pf: any) => ({
              id: pf.id,
              tenantId,
              title: pf.title || 'نظرسنجی',
              description: pf.description || pf.welcome_message || '',
              pollType: 'SINGLE_CHOICE',
              targetAudience: 'ALL',
              targetClassIds: [],
              startDate: new Date(pf.created_at || Date.now()),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              isClosed: false,
              isArchived: pf.archived || false,
              isAnonymous: false,
              createdById: pf.created_by || 'admin',
              porscadFormId: pf.id,
              porscadFormPublicId: pf.public_id,
              questions: (pf.questions || [])
                .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
                .map((q: any) => ({
                  type: q.type,
                  title: q.title,
                  description: q.description,
                  placeholder: q.placeholder,
                  options: q.options || [],
                  maxSelections: q.max_selections || 1,
                  required: q.required ?? true,
                  porscadQuestionId: q.id,
                  validation: q.validation || {},
                  jump_actions: q.jump_actions || [],
                  points: q.points || 0,
                })),
              options: (pf.questions || []).flatMap((q: any) =>
                (q.options || []).map((text: string, i: number) => ({
                  id: `opt_${i}`,
                  text,
                  voteCount: 0,
                })),
              ),
              _count: { votes: 0 },
              createdBy: {
                firstName: 'مدرسه',
                lastName: 'رکاد',
                role: 'SCHOOL_ADMIN',
              },
              createdAt: new Date(pf.created_at || Date.now()),
              updatedAt: new Date(pf.updated_at || Date.now()),
            }));
            inMemoryPolls.splice(0, inMemoryPolls.length, ...list);
            savePersistedPolls(list);
          }
        } catch (fetchErr) {
          console.warn('Could not sync live porscad forms:', fetchErr);
        }
      }

      const filtered = list.filter((p) => {
        if (p.isArchived) return false;
        if (!audience) return true;
        return p.targetAudience === 'ALL' || p.targetAudience === audience;
      });
      return filtered.map((p) => sanitizePollForRole(p, role));
    }
  }

  async updatePollStatus(
    tenantId: string,
    pollId: string,
    action: PollStatusAction,
  ) {
    try {
      const poll = await this.prisma.poll.findFirst({
        where: { id: pollId, tenantId },
      });
      if (!poll) {
        throw new NotFoundException('نظرسنجی یافت نشد');
      }

      switch (action) {
        case 'close': {
          if (poll.isClosed) {
            throw new BadRequestException('این نظرسنجی هم‌اکنون بسته است');
          }
          return await this.prisma.poll.update({
            where: { id: pollId },
            data: { isClosed: true },
          });
        }
        case 'open': {
          if (!poll.isClosed) {
            throw new BadRequestException('این نظرسنجی هم‌اکنون باز است');
          }
          if (new Date() > poll.endDate) {
            throw new BadRequestException(
              'مهلت این نظرسنجی به پایان رسیده است؛ ابتدا تاریخ پایان را تمدید کنید',
            );
          }
          return await this.prisma.poll.update({
            where: { id: pollId },
            data: { isClosed: false },
          });
        }
        case 'archive': {
          if (poll.isArchived) {
            throw new BadRequestException('این نظرسنجی در آرشیو است');
          }
          return await this.prisma.poll.update({
            where: { id: pollId },
            data: { isArchived: true },
          });
        }
        case 'unarchive': {
          if (!poll.isArchived) {
            throw new BadRequestException('این نظرسنجی در آرشیو نیست');
          }
          return await this.prisma.poll.update({
            where: { id: pollId },
            data: { isArchived: false },
          });
        }
        default:
          throw new BadRequestException('عملیات وضعیت نامعتبر است');
      }
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      console.warn('⚠️ [PollsService.updatePollStatus] DB offline fallback:', err?.message || err);
      const poll = inMemoryPolls.find((p) => p.id === pollId && p.tenantId === tenantId);
      if (!poll) throw new NotFoundException('نظرسنجی یافت نشد');
      if (action === 'close') poll.isClosed = true;
      else if (action === 'open') poll.isClosed = false;
      else if (action === 'archive') poll.isArchived = true;
      else if (action === 'unarchive') poll.isArchived = false;
      return poll;
    }
  }

  async deletePoll(tenantId: string, pollId: string) {
    try {
      const poll = await this.prisma.poll.findFirst({
        where: { id: pollId, tenantId },
        select: { id: true, porscadFormId: true, porscadFormPublicId: true },
      });
      if (!poll) {
        throw new NotFoundException('نظرسنجی یافت نشد');
      }

      await this.prisma.poll.delete({ where: { id: pollId } });

      return {
        message: 'نظرسنجی با موفقیت حذف شد',
        porscadFormId: poll.porscadFormId,
        porscadFormPublicId: poll.porscadFormPublicId,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      console.warn('⚠️ [PollsService.deletePoll] DB offline fallback:', err?.message || err);
      const idx = inMemoryPolls.findIndex((p) => p.id === pollId && p.tenantId === tenantId);
      if (idx < 0) throw new NotFoundException('نظرسنجی یافت نشد');
      const removed = inMemoryPolls.splice(idx, 1)[0];
      return {
        message: 'نظرسنجی با موفقیت حذف شد',
        porscadFormId: removed.porscadFormId,
        porscadFormPublicId: removed.porscadFormPublicId,
      };
    }
  }

  async getPollDetails(tenantId: string, pollId: string, userId?: string, role?: string) {
    try {
      const poll = await this.prisma.poll.findFirst({
        where: { id: pollId, tenantId },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          _count: { select: { votes: true } },
          votes: userId
            ? { where: { userId }, take: 1 }
            : false,
        },
      });

      if (!poll) {
        throw new NotFoundException('نظرسنجی یافت نشد');
      }

      const userVote = userId
        ? await this.prisma.pollVote.findUnique({
            where: { pollId_userId: { pollId, userId } },
          })
        : null;

      const { votes: _votes, ...rest } = poll as any;
      const sanitizedPoll = sanitizePollForRole(rest, role);

      return {
        poll: sanitizedPoll,
        hasVoted: !!userVote,
        userVote: userVote
          ? {
              createdAt: userVote.createdAt,
              answers: userVote.answers,
              respondentName: userVote.respondentName,
            }
          : null,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      console.warn('⚠️ [PollsService.getPollDetails] DB offline fallback:', err?.message || err);
      const poll = inMemoryPolls.find((p) => p.id === pollId && p.tenantId === tenantId);
      if (!poll) throw new NotFoundException('نظرسنجی یافت نشد');
      const userVote = userId
        ? inMemoryVotes.find((v) => v.pollId === pollId && v.userId === userId)
        : null;
      const sanitizedPoll = sanitizePollForRole(poll, role);
      return {
        poll: sanitizedPoll,
        hasVoted: !!userVote,
        userVote: userVote
          ? {
              createdAt: userVote.createdAt,
              answers: userVote.answers,
              respondentName: userVote.respondentName,
            }
          : null,
      };
    }
  }

  async submitAnswers(
    tenantId: string,
    pollId: string,
    userId: string,
    respondentName: string,
    dto: SubmitPollAnswersDto,
    role?: string,
  ) {
    try {
      const poll = await this.prisma.poll.findFirst({
        where: { id: pollId, tenantId },
      });
      if (!poll) {
        throw new NotFoundException('نظرسنجی یافت نشد');
      }

      if (poll.targetAudience !== 'ALL' && role) {
        const aud = this.audienceForRole(role);
        if (aud && poll.targetAudience !== aud) {
          throw new BadRequestException(
            `شما دسترسی لازم برای شرکت در این نظرسنجی را ندارید (مختص ${poll.targetAudience === 'STUDENTS' ? 'دانش‌آموزان' : poll.targetAudience === 'PARENTS' ? 'اولیا' : poll.targetAudience === 'TEACHERS' ? 'معلمان' : 'کادر مدرسه'})`,
          );
        }
      }

      const now = new Date();
      if (poll.isArchived) {
        throw new BadRequestException('این نظرسنجی آرشیو شده و پذیرش پاسخ نیست');
      }
      if (now < poll.startDate || now > poll.endDate || poll.isClosed) {
        throw new BadRequestException(
          'مهلت شرکت در این نظرسنجی به پایان رسیده یا نظرسنجی غیرفعال شده است',
        );
      }

      const existing = await this.prisma.pollVote.findUnique({
        where: { pollId_userId: { pollId, userId } },
      });
      if (existing) {
        throw new ConflictException('شما قبلاً در این نظرسنجی پاسخ داده‌اید');
      }

      const answers = dto.answers || {};
      const selectedOptionIds = Object.values(answers)
        .flatMap((v) => (Array.isArray(v) ? v : [v]))
        .filter((v): v is string => typeof v === 'string');

      const firstNumeric = Object.values(answers).find(
        (v) => typeof v === 'number',
      );

      return await this.prisma.$transaction(async (tx) => {
        const vote = await tx.pollVote.create({
          data: {
            tenantId,
            pollId,
            userId,
            selectedOptionIds,
            ratingValue: typeof firstNumeric === 'number' && Number.isFinite(firstNumeric) ? Math.round(firstNumeric) : null,
            textResponse:
              typeof dto.answers?.comment === 'string'
                ? dto.answers.comment
                : null,
            answers: dto.answers as any,
            porscadResponseId: dto.porscadResponseId,
            respondentName: respondentName || dto.respondentName,
          },
        });

        for (const optId of selectedOptionIds) {
          const opt = await tx.pollOption.findFirst({
            where: {
              pollId,
              OR: [{ id: optId }, { text: optId }],
            },
          });
          if (opt) {
            await tx.pollOption.update({
              where: { id: opt.id },
              data: { voteCount: { increment: 1 } },
            });
          }
        }

        return {
          message: 'پاسخ شما با موفقیت ثبت گردید',
          voteId: vote.id,
          porscadResponseId: vote.porscadResponseId,
        };
      });
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }
      console.warn('⚠️ [PollsService.submitAnswers] DB offline fallback:', err?.message || err);
      const vote = {
        id: `vote_${Date.now()}`,
        tenantId,
        pollId,
        userId,
        answers: dto.answers,
        porscadResponseId: dto.porscadResponseId,
        respondentName: respondentName || dto.respondentName || 'کاربر سیستم',
        createdAt: new Date(),
      };
      inMemoryVotes.push(vote);
      return {
        message: 'پاسخ شما با موفقیت ثبت گردید',
        voteId: vote.id,
        porscadResponseId: vote.porscadResponseId,
      };
    }
  }

  async getAnalytics(tenantId: string, pollId: string, role?: string) {
    if (role && !canViewPollResults(role)) {
      throw new ForbiddenException('شما دسترسی لازم برای مشاهده نتایج و آمار این نظرسنجی را ندارید');
    }

    try {
      const poll = await this.prisma.poll.findFirst({
        where: { id: pollId, tenantId },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
          _count: { select: { votes: true } },
        },
      });
      if (!poll) {
        throw new NotFoundException('نظرسنجی یافت نشد');
      }

      let votes = await this.prisma.pollVote.findMany({
        where: { pollId, tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          respondentName: true,
          answers: true,
          porscadResponseId: true,
          ratingValue: true,
          selectedOptionIds: true,
          textResponse: true,
          createdAt: true,
          user: { select: { firstName: true, lastName: true, role: true } },
        },
      });

      if (votes.length === 0 && poll.porscadFormId) {
        const porscadVotes = await this.fetchPorscadLiveResponses(poll);
        if (porscadVotes.length > 0) {
          return this.formatAnalyticsData(poll, porscadVotes);
        }
      }

      return this.formatAnalyticsData(poll, votes);
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) throw err;
      console.warn('⚠️ [PollsService.getAnalytics] DB offline fallback:', err?.message || err);
      const poll = inMemoryPolls.find((p) => p.id === pollId && p.tenantId === tenantId);
      if (!poll) throw new NotFoundException('نظرسنجی یافت نشد');
      let votes = inMemoryVotes.filter((v) => v.pollId === pollId && v.tenantId === tenantId);

      if (votes.length === 0 && poll.porscadFormId) {
        const porscadVotes = await this.fetchPorscadLiveResponses(poll);
        if (porscadVotes.length > 0) {
          return this.formatAnalyticsData(poll, porscadVotes);
        }
      }

      return this.formatAnalyticsData(poll, votes);
    }
  }

  private async fetchPorscadLiveResponses(poll: any): Promise<any[]> {
    if (!poll.porscadFormId) return [];
    try {
      const questions = (poll.questions as unknown as SurveyQuestion[]) || [];
      let qIds = questions.map((q) => q.porscadQuestionId).filter(Boolean) as string[];

      if (qIds.length === 0) {
        const qRes = await fetch(
          `https://pivwmyacpxdywevccpmw.supabase.co/rest/v1/questions?form_id=eq.${poll.porscadFormId}&select=id,title,type,options,position&order=position.asc`,
          {
            headers: {
              apikey:
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MjU1MSwiZXhwIjoyMTAzMjM4NTUxfQ.WqnDBvpwIOtDOBn7pHKozf0WzpF-S7F5nq7FB4aCPl0',
              Authorization:
                'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MjU1MSwiZXhwIjoyMTAzMjM4NTUxfQ.WqnDBvpwIOtDOBn7pHKozf0WzpF-S7F5nq7FB4aCPl0',
            },
          },
        );
        if (qRes.ok) {
          const qRows = await qRes.json();
          if (Array.isArray(qRows) && qRows.length > 0) {
            qIds = qRows.map((r: any) => r.id);
          }
        }
      }

      if (qIds.length === 0) return [];

      const aRes = await fetch(
        `https://pivwmyacpxdywevccpmw.supabase.co/rest/v1/answers?question_id=in.("${qIds.join('","')}")&select=id,response_id,question_id,value,time_spent_seconds`,
        {
          headers: {
            apikey:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MjU1MSwiZXhwIjoyMTAzMjM4NTUxfQ.WqnDBvpwIOtDOBn7pHKozf0WzpF-S7F5nq7FB4aCPl0',
            Authorization:
              'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MjU1MSwiZXhwIjoyMTAzMjM4NTUxfQ.WqnDBvpwIOtDOBn7pHKozf0WzpF-S7F5nq7FB4aCPl0',
          },
        },
      );

      if (!aRes.ok) return [];
      const aRows = await aRes.json();
      if (!Array.isArray(aRows) || aRows.length === 0) return [];

      const byResp: Record<string, any> = {};
      for (const a of aRows) {
        const rId = a.response_id || `r_${a.id}`;
        if (!byResp[rId]) {
          byResp[rId] = {
            id: rId,
            userId: null,
            respondentName: 'کاربر پرس‌کاد',
            answers: {},
            porscadResponseId: rId,
            createdAt: new Date(),
          };
        }
        const qIdx = qIds.indexOf(a.question_id);
        const key = qIdx >= 0 ? String(qIdx) : a.question_id;
        byResp[rId].answers[key] = a.value;
      }

      return Object.values(byResp);
    } catch (err) {
      console.warn('⚠️ [PollsService.fetchPorscadLiveResponses] Live fetch error:', err);
      return [];
    }
  }

  private formatAnalyticsData(poll: any, votes: any[]) {
    const questions = (poll.questions as unknown as SurveyQuestion[]) || [];
    const perQuestion = questions.map((q, index) => {
      const counts: Record<string, number> = {};
      let ratingSum = 0;
      let ratingCount = 0;
      let answered = 0;

      for (const v of votes) {
        const answers = (v.answers as Record<string, unknown>) || {};
        const raw = answers[String(index)] ?? answers[`q_${index}`];
        if (raw === undefined || raw === null || raw === '') continue;
        answered += 1;
        if (typeof raw === 'number') {
          ratingSum += raw;
          ratingCount += 1;
          const key = String(raw);
          counts[key] = (counts[key] || 0) + 1;
        } else if (Array.isArray(raw)) {
          for (const item of raw) {
            const key = String(item);
            counts[key] = (counts[key] || 0) + 1;
          }
        } else {
          const key = String(raw);
          counts[key] = (counts[key] || 0) + 1;
        }
      }

      const options = (q.options || []).map((text: string) => ({
        text,
        count: counts[text] || 0,
        percentage:
          answered > 0
            ? Math.round(((counts[text] || 0) / answered) * 100)
            : 0,
      }));

      Object.entries(counts).forEach(([text, count]) => {
        if (!options.find((o: any) => o.text === text)) {
          options.push({
            text,
            count,
            percentage:
              answered > 0 ? Math.round((count / answered) * 100) : 0,
          });
        }
      });

      return {
        index,
        title: q.title,
        type: q.type,
        answered,
        options: options.sort((a: any, b: any) => b.count - a.count),
        avgRating:
          ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(2)) : null,
      };
    });

    const legacyCounts = (poll.options || []).map((opt: any) => ({
      id: opt.id,
      text: opt.text,
      voteCount: opt.voteCount || 0,
      percentage:
        votes.length > 0
          ? Math.round(((opt.voteCount || 0) / votes.length) * 100)
          : 0,
    }));

    return {
      poll: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        startDate: poll.startDate,
        endDate: poll.endDate,
        isClosed: poll.isClosed,
        isArchived: poll.isArchived,
        targetAudience: poll.targetAudience,
        porscadFormId: poll.porscadFormId,
        porscadFormPublicId: poll.porscadFormPublicId,
        questions: poll.questions,
      },
      totalResponses: votes.length,
      porscadLinked: !!poll.porscadFormId,
      perQuestion,
      legacyOptions: legacyCounts,
      responses: votes.map((v) => ({
        id: v.id,
        respondentName: poll.isAnonymous
          ? 'کاربر ناشناس'
          : v.respondentName ||
            `${v.user?.firstName || ''} ${v.user?.lastName || ''}`.trim() ||
            'کاربر',
        role: poll.isAnonymous ? undefined : v.user?.role,
        answers: v.answers,
        porscadResponseId: v.porscadResponseId,
        createdAt: v.createdAt,
      })),
    };
  }

  async castVote(
    tenantId: string,
    pollId: string,
    userId: string,
    dto: CastVoteDto,
    role?: string,
  ) {
    try {
      const poll = await this.prisma.poll.findFirst({
        where: { id: pollId, tenantId },
      });
      if (!poll) {
        throw new NotFoundException('نظرسنجی یافت نشد');
      }

      if (poll.targetAudience !== 'ALL' && role) {
        const aud = this.audienceForRole(role);
        if (aud && poll.targetAudience !== aud) {
          throw new BadRequestException(
            `شما دسترسی لازم برای شرکت در این نظرسنجی را ندارید (مختص ${poll.targetAudience === 'STUDENTS' ? 'دانش‌آموزان' : poll.targetAudience === 'PARENTS' ? 'اولیا' : poll.targetAudience === 'TEACHERS' ? 'معلمان' : 'کادر مدرسه'})`,
          );
        }
      }

      const now = new Date();
      if (poll.isArchived) {
        throw new BadRequestException('این نظرسنجی آرشیو شده و پذیرش رأی نیست');
      }
      if (now < poll.startDate || now > poll.endDate || poll.isClosed) {
        throw new BadRequestException(
          'مهلت شرکت در این نظرسنجی به پایان رسیده یا نظرسنجی غیرفعال شده است',
        );
      }

      const existingVote = await this.prisma.pollVote.findUnique({
        where: { pollId_userId: { pollId, userId } },
      });
      if (existingVote) {
        throw new ConflictException('شما قبلاً در این نظرسنجی رأی داده‌اید');
      }

      return await this.prisma.$transaction(async (tx) => {
        const vote = await tx.pollVote.create({
          data: {
            tenantId,
            pollId,
            userId,
            selectedOptionIds: dto.selectedOptionIds || [],
            ratingValue: typeof dto.ratingValue === 'number' && Number.isFinite(dto.ratingValue) ? Math.round(dto.ratingValue) : null,
            textResponse: dto.textResponse,
          },
        });

        if (dto.selectedOptionIds && dto.selectedOptionIds.length > 0) {
          for (const optId of dto.selectedOptionIds) {
            await tx.pollOption.update({
              where: { id: optId },
              data: { voteCount: { increment: 1 } },
            });
          }
        }

        return {
          message: 'رأی شما با موفقیت ثبت گردید',
          voteId: vote.id,
        };
      });
    } catch (err: any) {
      if (err instanceof NotFoundException || err instanceof BadRequestException || err instanceof ConflictException) {
        throw err;
      }
      console.warn('⚠️ [PollsService.castVote] DB offline fallback:', err?.message || err);
      const vote = {
        id: `vote_${Date.now()}`,
        tenantId,
        pollId,
        userId,
        selectedOptionIds: dto.selectedOptionIds || [],
        ratingValue: dto.ratingValue,
        textResponse: dto.textResponse,
        createdAt: new Date(),
      };
      inMemoryVotes.push(vote);
      return {
        message: 'رأی شما با موفقیت ثبت گردید',
        voteId: vote.id,
      };
    }
  }
}
