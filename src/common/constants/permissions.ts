export const PERMISSION_KEY = 'require_permissions';

export enum AppPermission {
  // Academic Structure
  ACADEMIC_YEAR_READ = 'academic.year.read',
  ACADEMIC_YEAR_WRITE = 'academic.year.write',
  ACADEMIC_LEVEL_WRITE = 'academic.level.write',
  ACADEMIC_FIELD_WRITE = 'academic.field.write',

  // Classes & Lessons
  LESSON_READ = 'lesson.read',
  LESSON_WRITE = 'lesson.write',
  CLASSROOM_READ = 'classroom.read',
  CLASSROOM_WRITE = 'classroom.write',
  SCHEDULE_READ = 'schedule.read',
  SCHEDULE_WRITE = 'schedule.write',
  ENROLLMENT_WRITE = 'enrollment.write',

  // Members Management
  STUDENT_READ = 'student.read',
  STUDENT_WRITE = 'student.write',
  TEACHER_READ = 'teacher.read',
  TEACHER_WRITE = 'teacher.write',
  COACH_READ = 'coach.read',
  COACH_WRITE = 'coach.write',
  STAFF_READ = 'staff.read',
  STAFF_WRITE = 'staff.write',
  PARENT_READ = 'parent.read',
  PARENT_WRITE = 'parent.write',
  PARENT_STUDENT_LINK = 'parent.student.link',

  // RBAC & Roles
  ROLE_READ = 'role.read',
  ROLE_WRITE = 'role.write',
  ROLE_ASSIGN = 'role.assign',
  RBAC_MANAGE = 'rbac.manage',

  // Profiles & Blogs
  SCHOOL_PROFILE_WRITE = 'school.profile.write',
  BLOG_WRITE = 'blog.write',
  BLOG_PUBLISH = 'blog.publish',

  // Daily Operations (Phase 3 Prep)
  ATTENDANCE_READ = 'attendance.read',
  ATTENDANCE_WRITE = 'attendance.write',
  HOMEWORK_READ = 'homework.read',
  HOMEWORK_WRITE = 'homework.write',
  CALENDAR_WRITE = 'calendar.write',
  COACHING_READ = 'coaching.read',
  COACHING_WRITE = 'coaching.write',

  // LMS & Grades (Phase 4 Prep)
  EXAM_READ = 'exam.read',
  EXAM_WRITE = 'exam.write',
  GRADES_READ = 'grades.read',
  GRADES_WRITE = 'grades.write',

  // Finance & HR (Phase 6 Prep)
  FINANCE_FEE_READ = 'finance.fee.read',
  FINANCE_FEE_WRITE = 'finance.fee.write',
  FINANCE_CHECK_MANAGE = 'finance.check.manage',
  FINANCE_FEE_IMPORT = 'finance.fee.import',
  FINANCE_PAYROLL_READ = 'finance.payroll.read',
  FINANCE_PAYROLL_WRITE = 'finance.payroll.write',
}
