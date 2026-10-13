import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateQuestionCategoryDto,
  CreateQuestionDto,
} from './dto/create-category.dto';

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Categories
  async createCategory(tenantId: string, dto: CreateQuestionCategoryDto) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    return this.prisma.questionCategory.create({
      data: {
        tenantId,
        lessonId: dto.lessonId,
        name: dto.name,
        orderIndex: dto.orderIndex || 1,
      },
    });
  }

  async listCategories(tenantId: string, lessonId: string) {
    return this.prisma.questionCategory.findMany({
      where: { tenantId, lessonId },
      include: {
        _count: { select: { questions: true } },
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  // 2. Questions
  async createQuestion(
    tenantId: string,
    createdById: string,
    dto: CreateQuestionDto,
  ) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, tenantId },
    });
    if (!lesson) {
      throw new NotFoundException('درس مورد نظر یافت نشد');
    }

    if (
      dto.type === 'MULTIPLE_CHOICE' &&
      (!dto.options || dto.options.length < 2)
    ) {
      throw new BadRequestException('سوالات تستی باید حداقل دارای ۲ گزینه باشند');
    }

    return this.prisma.question.create({
      data: {
        tenantId,
        lessonId: dto.lessonId,
        categoryId: dto.categoryId,
        createdById,
        type: dto.type,
        difficulty: dto.difficulty || 'MEDIUM',
        text: dto.text,
        formulaHtml: dto.formulaHtml,
        imageUrls: dto.imageUrls || [],
        defaultScore: dto.defaultScore || 1.0,
        suggestedTimeSeconds: dto.suggestedTimeSeconds || 60,
        solutionExplanation: dto.solutionExplanation,
        options: {
          create: dto.options?.map((opt, idx) => ({
            text: opt.text,
            formulaHtml: opt.formulaHtml,
            imageUrl: opt.imageUrl,
            isCorrect: opt.isCorrect || false,
            orderIndex: opt.orderIndex || idx + 1,
          })) || [],
        },
      },
      include: {
        options: { orderBy: { orderIndex: 'asc' } },
        category: true,
      },
    });
  }

  async listQuestions(
    tenantId: string,
    filters: {
      lessonId?: string;
      categoryId?: string;
      difficulty?: string;
      type?: string;
      search?: string;
    },
  ) {
    const where: any = { tenantId };

    if (filters.lessonId) where.lessonId = filters.lessonId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.type) where.type = filters.type;
    if (filters.search) {
      where.text = { contains: filters.search, mode: 'insensitive' };
    }

    return this.prisma.question.findMany({
      where,
      include: {
        category: true,
        options: { orderBy: { orderIndex: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQuestionDetails(tenantId: string, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, tenantId },
      include: {
        category: true,
        options: { orderBy: { orderIndex: 'asc' } },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('سوال مورد نظر یافت نشد');
    }
    return question;
  }

  async deleteQuestion(tenantId: string, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, tenantId },
    });
    if (!question) {
      throw new NotFoundException('سوال مورد نظر یافت نشد');
    }

    await this.prisma.questionOption.deleteMany({
      where: { questionId },
    });

    return this.prisma.question.delete({
      where: { id: questionId },
    });
  }

  async deleteCategory(tenantId: string, categoryId: string) {
    const category = await this.prisma.questionCategory.findFirst({
      where: { id: categoryId, tenantId },
    });
    if (!category) {
      throw new NotFoundException('سرفصل مورد نظر یافت نشد');
    }

    return this.prisma.questionCategory.delete({
      where: { id: categoryId },
    });
  }
}
