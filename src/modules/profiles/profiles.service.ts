import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UpdateSchoolProfileDto,
  CreateBlogPostDto,
} from './dto/update-school-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. School Profile
  async getSchoolProfile(tenantId: string) {
    let profile = await this.prisma.schoolProfile.findUnique({
      where: { tenantId },
    });

    if (!profile) {
      // Auto-create default school profile if not exists
      profile = await this.prisma.schoolProfile.create({
        data: {
          tenantId,
          motto: 'پرورش استعداد، پیشرو در نوآوری و مهارت‌آموزی',
          aboutHtml: '<p>به سامانه هوشمند مدیریت آموزشی و پرورشی رکاد خوش آمدید.</p>',
        },
      });
    }

    return profile;
  }

  async updateSchoolProfile(tenantId: string, dto: UpdateSchoolProfileDto) {
    return this.prisma.schoolProfile.upsert({
      where: { tenantId },
      update: {
        motto: dto.motto,
        aboutHtml: dto.aboutHtml,
        headerImageUrl: dto.headerImageUrl,
        socialLinks: dto.socialLinks,
        managerName: dto.managerName,
        managerMessage: dto.managerMessage,
        achievements: dto.achievements,
      },
      create: {
        tenantId,
        motto: dto.motto,
        aboutHtml: dto.aboutHtml,
        headerImageUrl: dto.headerImageUrl,
        socialLinks: dto.socialLinks,
        managerName: dto.managerName,
        managerMessage: dto.managerMessage,
        achievements: dto.achievements,
      },
    });
  }

  // 2. Profile Blogs
  async listBlogPosts(tenantId: string, authorId?: string, onlyPublished: boolean = true) {
    return this.prisma.profileBlog.findMany({
      where: {
        tenantId,
        ...(authorId ? { authorId } : {}),
        ...(onlyPublished ? { isPublished: true } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBlogPost(tenantId: string, authorId: string, dto: CreateBlogPostDto) {
    const slug = dto.slug?.trim() || `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const existing = await this.prisma.profileBlog.findFirst({
      where: { tenantId, slug },
    });
    if (existing) {
      throw new ConflictException('مقاله‌ای با این اسلاگ در این مدرسه قبلاً ثبت شده است');
    }

    const coverImageUrl = dto.coverImageUrl || (dto.mediaUrls && dto.mediaUrls.length > 0 ? dto.mediaUrls[0] : null);
    const postType = dto.postType || (dto.mediaUrls && dto.mediaUrls.length > 1 ? 'SLIDESHOW' : dto.attachments && Array.isArray(dto.attachments) && dto.attachments.length > 0 ? 'DOCUMENT' : 'STANDARD');

    return this.prisma.profileBlog.create({
      data: {
        tenantId,
        authorId,
        title: dto.title,
        slug,
        content: dto.content,
        coverImageUrl,
        postType,
        mediaUrls: dto.mediaUrls || [],
        attachments: dto.attachments || undefined,
        audienceType: dto.audienceType || 'ALL',
        targetRoles: dto.targetRoles || [],
        targetClassroomIds: dto.targetClassroomIds || [],
        isPinned: dto.isPinned || false,
        allowComments: dto.allowComments !== undefined ? dto.allowComments : true,
        isPublished: dto.isPublished !== undefined ? dto.isPublished : true,
        publishedAt: dto.isPublished ? new Date() : null,
        tags: dto.tags || [],
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
        likes: {
          select: {
            id: true,
            userId: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });
  }

  // 3. Media Hub Operations
  async listMediaFeed(
    tenantId: string,
    currentUser?: { id: string; role: string; tenantId: string },
    options?: { postType?: string; audience?: string; classroomId?: string },
  ) {
    // If student, find student's classroom
    let studentClassroomId: string | undefined;
    let parentClassroomIds: string[] = [];

    if (currentUser?.role === 'STUDENT') {
      const sp = await this.prisma.studentProfile.findUnique({
        where: { userId: currentUser.id },
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { classroomId: true },
          },
        },
      });
      studentClassroomId = sp?.enrollments?.[0]?.classroomId || undefined;
    } else if (currentUser?.role === 'PARENT') {
      const parentProfile = await this.prisma.parentProfile.findUnique({
        where: { userId: currentUser.id },
        include: {
          studentLinks: {
            include: {
              student: {
                include: {
                  enrollments: {
                    where: { status: 'ACTIVE' },
                    select: { classroomId: true },
                  },
                },
              },
            },
          },
        },
      });
      parentClassroomIds = (parentProfile?.studentLinks || [])
        .flatMap((link) => link.student?.enrollments?.map((e) => e.classroomId) || [])
        .filter((id): id is string => Boolean(id));
    }

    // Construct audience conditions
    const isStaffOrAdmin =
      !currentUser ||
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.role === 'SCHOOL_ADMIN' ||
      currentUser.role === 'STAFF';

    const where: any = {
      tenantId,
      isPublished: true,
    };

    if (options?.postType && options.postType !== 'ALL') {
      where.postType = options.postType;
    }

    if (!isStaffOrAdmin) {
      if (currentUser.role === 'TEACHER') {
        where.OR = [
          { audienceType: 'ALL' },
          { targetRoles: { has: 'TEACHER' } },
          { authorId: currentUser.id },
        ];
      } else if (currentUser.role === 'STUDENT') {
        const studentConditions: any[] = [
          { audienceType: 'ALL' },
          { targetRoles: { has: 'STUDENT' } },
        ];
        if (studentClassroomId) {
          studentConditions.push({
            targetClassroomIds: { has: studentClassroomId },
          });
        }
        where.OR = studentConditions;
      } else if (currentUser.role === 'PARENT') {
        const parentConditions: any[] = [
          { audienceType: 'ALL' },
          { targetRoles: { has: 'PARENT' } },
        ];
        if (parentClassroomIds.length > 0) {
          parentConditions.push({
            targetClassroomIds: { hasSome: parentClassroomIds },
          });
        }
        where.OR = parentConditions;
      }
    }

    const posts = await this.prisma.profileBlog.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
        likes: {
          select: {
            id: true,
            userId: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return posts.map((post) => ({
      ...post,
      isLikedByMe: currentUser
        ? post.likes.some((like) => like.userId === currentUser.id)
        : false,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
    }));
  }

  async toggleLike(tenantId: string, postId: string, userId: string) {
    const post = await this.prisma.profileBlog.findFirst({
      where: { id: postId, tenantId },
    });
    if (!post) {
      throw new NotFoundException('پست مورد نظر یافت نشد');
    }

    const existing = await this.prisma.profileBlogLike.findUnique({
      where: {
        blogId_userId: { blogId: postId, userId },
      },
    });

    if (existing) {
      await this.prisma.profileBlogLike.delete({ where: { id: existing.id } });
      const likeCount = await this.prisma.profileBlogLike.count({ where: { blogId: postId } });
      return { isLiked: false, likeCount };
    } else {
      await this.prisma.profileBlogLike.create({
        data: {
          tenantId,
          blogId: postId,
          userId,
        },
      });
      const likeCount = await this.prisma.profileBlogLike.count({ where: { blogId: postId } });
      return { isLiked: true, likeCount };
    }
  }

  async addComment(tenantId: string, postId: string, authorId: string, content: string) {
    const post = await this.prisma.profileBlog.findFirst({
      where: { id: postId, tenantId },
    });
    if (!post) {
      throw new NotFoundException('پست مورد نظر یافت نشد');
    }

    if (!post.allowComments) {
      throw new ConflictException('امکان ثبت نظر برای این پست غیرفعال است');
    }

    return this.prisma.profileBlogComment.create({
      data: {
        tenantId,
        blogId: postId,
        authorId,
        content: content.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async deleteComment(tenantId: string, commentId: string, userId: string, userRole: string) {
    const comment = await this.prisma.profileBlogComment.findFirst({
      where: { id: commentId, tenantId },
    });
    if (!comment) {
      throw new NotFoundException('نظر مورد نظر یافت نشد');
    }

    const isStaffOrAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SCHOOL_ADMIN' || userRole === 'STAFF';
    if (comment.authorId !== userId && !isStaffOrAdmin) {
      throw new ConflictException('شما دسترسی حذف این نظر را ندارید');
    }

    return this.prisma.profileBlogComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }

  async restoreBlogComment(tenantId: string, commentId: string) {
    const comment = await this.prisma.profileBlogComment.findFirst({
      where: { id: commentId, tenantId, deletedAt: { not: null } },
    });
    if (!comment) {
      throw new NotFoundException('دیدگاه حذف‌شده مورد نظر یافت نشد');
    }
    return this.prisma.profileBlogComment.update({
      where: { id: commentId },
      data: { deletedAt: null },
    });
  }

  async getBlogPostBySlug(tenantId: string, slug: string) {
    const post = await this.prisma.profileBlog.findFirst({
      where: { tenantId, slug },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
          },
        },
        likes: true,
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('مقاله مورد نظر یافت نشد');
    }

    // Increment view count asynchronously
    await this.prisma.profileBlog.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });

    return post;
  }

  async deleteBlogPost(tenantId: string, postId: string, userId?: string, userRole?: string) {
    const post = await this.prisma.profileBlog.findFirst({
      where: { id: postId, tenantId },
    });
    if (!post) {
      throw new NotFoundException('مقاله مورد نظر یافت نشد');
    }

    if (userId && userRole) {
      const isStaffOrAdmin =
        userRole === 'SUPER_ADMIN' ||
        userRole === 'SCHOOL_ADMIN' ||
        userRole === 'STAFF';
      if (post.authorId !== userId && !isStaffOrAdmin) {
        throw new ConflictException('شما دسترسی حذف این پست را ندارید');
      }
    }

    return this.prisma.profileBlog.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
  }

  async restoreBlogPost(tenantId: string, postId: string) {
    const post = await this.prisma.profileBlog.findFirst({
      where: { id: postId, tenantId, deletedAt: { not: null } },
    });
    if (!post) {
      throw new NotFoundException('مقاله حذف‌شده مورد نظر یافت نشد');
    }
    return this.prisma.profileBlog.update({
      where: { id: postId },
      data: { deletedAt: null },
    });
  }
}
