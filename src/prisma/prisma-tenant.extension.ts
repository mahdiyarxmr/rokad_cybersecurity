import { Prisma } from '@prisma/client';
import { TenantContextService } from '../common/tenant/tenant-context.service';

const TENANT_BOUND_MODELS = [
  // Phase 1
  'User',
  'RefreshTokenFamily',
  'TenantFeatureFlag',
  'AuditLog',
  // Phase 2
  'AcademicYear',
  'Term',
  'EducationalLevel',
  'StudyField',
  'Lesson',
  'Classroom',
  'ClassEnrollment',
  'ClassSchedule',
  'SchoolRole',
  'UserSchoolRole',
  'StudentProfile',
  'TeacherProfile',
  'CoachProfile',
  'StaffProfile',
  'ParentProfile',
  'ParentStudentLink',
  'ProfileBlog',
  'SchoolProfile',
  // Phase 3
  'StudentAttendance',
  'TeacherAttendance',
  'Homework',
  'HomeworkSubmission',
  'SchoolEvent',
  'Poll',
  'PollVote',
  'ParentVisitSlot',
  'ParentVisitBooking',
  'DisciplinaryMatter',
  // Phase 4
  'LessonPlan',
  'QuestionCategory',
  'Question',
  'Exam',
  'ExamClassroom',
  'ExamParticipation',
  'GradeEntry',
  'Podman',
  'PodmanGrade',
  // Phase 5
  'CourseMaterial',
  'MaterialClassroom',
  'ChatChannel',
  'ChatChannelMember',
  'ChatMessage',
  // Phase 6
  'StudentFeeContract',
  'FeeInstallment',
  'PaymentTransaction',
  'FeeReceipt',
  'StaffPayrollProfile',
  'PayrollSlip',
  'PayrollItem',
  'TeacherContract',
  'PayrollAdjustment',
  // Phase 7
  'TenantSubscription',
  // Rokad Business Club
  'ClubMembership',
  'ClubRoadmapMilestone',
  'ClubStudentMilestoneProgress',
  'ClubChallenge',
  'ClubChallengeSubmission',
];

const SOFT_DELETE_MODELS = [
  'SchoolRole',
  'UserPermissionOverride',
  'SchoolEvent',
  'ProfileBlog',
  'ProfileBlogComment',
];

export function createTenantExtension(tenantContextService: TenantContextService) {
  return Prisma.defineExtension({
    name: 'prisma-multi-tenant-extension',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const extendedArgs = (args || {}) as any;

          // Automatic Soft Delete Filter: hide deleted records unless explicitly queried with deletedAt
          if (
            model &&
            SOFT_DELETE_MODELS.includes(model) &&
            ['findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy'].includes(
              operation,
            )
          ) {
            if (!extendedArgs.where) {
              extendedArgs.where = {};
            }
            if (extendedArgs.where.deletedAt === undefined) {
              extendedArgs.where.deletedAt = null;
            }
          }

          if (!model || !TENANT_BOUND_MODELS.includes(model)) {
            return query(extendedArgs);
          }

          const store = tenantContextService.getStore();
          const tenantId = store?.tenantId;
          // Only a verified platform admin may skip the tenant filter.
          // An unresolved request must never be treated as PLATFORM.
          const isPlatform = store?.isPlatformAdmin === true;

          // If Platform SuperAdmin is querying without a specific tenant filter, allow global cross-tenant access
          if (isPlatform) {
            // If caller explicitly provided tenantId, let it through as is; do not force platform-root filter
            return query(extendedArgs);
          }

          if (!tenantId) {
            // If model is tenant bound and no tenantId is in context, allow query only if args explicitly specifies tenantId or is platform context
            return query(extendedArgs);
          }

          // READ operations
          if (
            ['findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy'].includes(
              operation,
            )
          ) {
            extendedArgs.where = {
              ...extendedArgs.where,
              tenantId,
            };
          }

          // CREATE operations
          if (operation === 'create') {
            extendedArgs.data = {
              ...extendedArgs.data,
              tenantId,
            };
          }

          if (operation === 'createMany') {
            if (Array.isArray(extendedArgs.data)) {
              extendedArgs.data = extendedArgs.data.map((item: any) => ({
                ...item,
                tenantId,
              }));
            } else if (extendedArgs.data) {
              extendedArgs.data.tenantId = tenantId;
            }
          }

          // UPDATE operations
          if (['update', 'updateMany', 'upsert'].includes(operation)) {
            extendedArgs.where = {
              ...extendedArgs.where,
              tenantId,
            };
            if (operation === 'upsert') {
              if (extendedArgs.create) {
                extendedArgs.create.tenantId = tenantId;
              }
            }
          }

          // DELETE operations
          if (['delete', 'deleteMany'].includes(operation)) {
            extendedArgs.where = {
              ...extendedArgs.where,
              tenantId,
            };
          }

          return query(extendedArgs);
        },
      },
    },
  });
}
