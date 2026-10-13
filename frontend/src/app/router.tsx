import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { SuperAdminLayout } from './layouts/SuperAdminLayout';
import { SchoolAdminLayout } from './layouts/SchoolAdminLayout';
import { TeacherLayout } from './layouts/TeacherLayout';
import { StudentParentLayout } from './layouts/StudentParentLayout';
import { SharedAppLayout } from './layouts/SharedAppLayout';

// Shared Real-Time Pages
// import { LiveChatPage } from '../modules/shared/chat/LiveChatPage'; // Temporarily disabled

import { NoticeboardPage } from '../modules/shared/noticeboard/NoticeboardPage';
import { CalendarPage } from '../modules/shared/calendar/CalendarPage';

// Guards
import { RoleGuard, GuestGuard } from '../components/guards/RoleGuard';

// Pages
import { LoginPage } from '../modules/auth/LoginPage';
import { SuperAdminDashboard } from '../modules/super-admin/SuperAdminDashboard';
import { TenantsPage } from '../modules/super-admin/tenants/TenantsPage';
import { SubscriptionsPage } from '../modules/super-admin/subscriptions/SubscriptionsPage';
import { RoleTemplatesPage } from '../modules/super-admin/roles/RoleTemplatesPage';
import { PlatformOpsPage } from '../modules/super-admin/ops/PlatformOpsPage';
import { SchoolAdminDashboard } from '../modules/school-admin/SchoolAdminDashboard';
import { AcademicStructurePage } from '../modules/school-admin/academic/AcademicStructurePage';
import { ClassSchedulePage } from '../modules/school-admin/academic/ClassSchedulePage';
import { MembersPage } from '../modules/school-admin/members/MembersPage';
import { RoleBuilderPage } from '../modules/school-admin/role-builder/RoleBuilderPage';
import { FeesPage } from '../modules/school-admin/finance/FeesPage';
import { PayrollPage } from '../modules/school-admin/finance/PayrollPage';
import { ReportsPage } from '../modules/school-admin/reports/ReportsPage';
import { TeacherDashboard } from '../modules/teacher/TeacherDashboard';
import { AttendancePage } from '../modules/teacher/attendance/AttendancePage';
import { HomeworkPage } from '../modules/teacher/homework/HomeworkPage';
import { ExamsPage } from '../modules/teacher/exams/ExamsPage';
import { GradebookPage } from '../modules/teacher/gradebook/GradebookPage';
import { LessonPlansPage } from '../modules/teacher/lessons/LessonPlansPage';
import { TeacherSchedulePage } from '../modules/teacher/schedule/TeacherSchedulePage';
import { TeacherMySlipsPage } from '../modules/teacher/payroll/TeacherMySlipsPage';

import { StudentDashboard } from '../modules/student-parent/StudentDashboard';
import { StudentHomeworkPage } from '../modules/student-parent/homework/StudentHomeworkPage';
import { StudentExamsPage } from '../modules/student-parent/exams/StudentExamsPage';
import { StudentGradesPage } from '../modules/student-parent/grades/StudentGradesPage';
import { StudentMaterialsPage } from '../modules/student-parent/materials/StudentMaterialsPage';
import { StudentSchedulePage } from '../modules/student-parent/schedule/StudentSchedulePage';

import { ParentDashboard } from '../modules/student-parent/ParentDashboard';
import { ParentFeesPage } from '../modules/student-parent/fees/ParentFeesPage';

// Newly Integrated Modules
import { SchoolProfilePage } from '../modules/school-admin/profile/SchoolProfilePage';
import { PasswordVaultPage } from '../modules/school-admin/vault/PasswordVaultPage';
import { MattersPage } from '../modules/school-admin/matters/MattersPage';
import { PollsPage } from '../modules/shared/polls/PollsPage';
import { ParentVisitsPage } from '../modules/student-parent/visits/ParentVisitsPage';
import { TeacherVisitsPage } from '../modules/teacher/visits/TeacherVisitsPage';
import { StudentMattersPage } from '../modules/student-parent/matters/StudentMattersPage';
import { QuestionBankPage } from '../modules/teacher/question-bank/QuestionBankPage';
import { MediaFeedPage } from '../modules/shared/media/MediaFeedPage';
import { EventsRoadmapPage } from '../modules/shared/events/EventsRoadmapPage';
import { EventSinglePage } from '../modules/shared/events/EventSinglePage';
import { CoachingPage } from '../modules/shared/coaching/CoachingPage';
import { MessagesPage } from '../modules/shared/messages/MessagesPage';

import { ForbiddenPage } from '../modules/errors/ForbiddenPage';
import { NotFoundPage } from '../modules/errors/NotFoundPage';

// Super-App Architecture Modules
import { SuperAppHomePage } from '../modules/super-app/SuperAppHomePage';
import { ProfileSettingsPage } from '../modules/profile/ProfileSettingsPage';
import { NotificationsPage } from '../modules/notifications/NotificationsPage';
import { KaPlatformPage } from '../modules/ka-platform/KaPlatformPage';
import { ClubPage } from '../modules/club/ClubPage';
import { ClubChallengeDetailPage } from '../modules/club/ClubChallengeDetailPage';
import { AdminClubPage } from '../modules/school-admin/club/AdminClubPage';
import { TeacherClubApprovalsPage } from '../modules/teacher/club/TeacherClubApprovalsPage';
import { SmsCenterPage } from '../modules/sms/SmsCenterPage';
import { DashboardRedirect } from './routes/DashboardRedirect';

export const router = createBrowserRouter([
  // 1. Guest / Auth Routes
  {
    path: '/',
    element: <GuestGuard />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { index: true, element: <Navigate to="/login" replace /> },
          { path: 'login', element: <LoginPage /> },
        ],
      },
    ],
  },

  // 1.1 Direct /dashboard route
  {
    path: '/dashboard',
    element: <DashboardRedirect />,
  },

  // 2. Protected App Routes per Persona
  {
    path: '/app',
    children: [
      { path: 'dashboard', element: <DashboardRedirect /> },
      // 2.1 Persona 1: Super Admin
      {
        path: 'super-admin',
        element: <RoleGuard allowedRoles={['SUPER_ADMIN']} />,
        children: [
          {
            element: <SuperAdminLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <SuperAdminDashboard /> },
              { path: 'tenants', element: <TenantsPage /> },
              { path: 'subscriptions', element: <SubscriptionsPage /> },
              { path: 'role-templates', element: <RoleTemplatesPage /> },
              { path: 'ops', element: <PlatformOpsPage /> },
            ],
          },
        ],
      },

      // 2.2 Persona 2: School Admin & Staff
      {
        path: 'admin',
        element: <RoleGuard allowedRoles={['SCHOOL_ADMIN', 'STAFF', 'SUPER_ADMIN']} />,
        children: [
          {
            element: <SchoolAdminLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <SchoolAdminDashboard /> },
              { path: 'academic', element: <AcademicStructurePage /> },
              { path: 'schedule', element: <ClassSchedulePage /> },
              { path: 'members', element: <MembersPage /> },
              { path: 'vault', element: <PasswordVaultPage /> },
              { path: 'roles', element: <RoleBuilderPage /> },
              { path: 'profile', element: <SchoolProfilePage /> },
              { path: 'matters', element: <MattersPage /> },
              { path: 'attendance', element: <AttendancePage /> },
              { path: 'gradebook', element: <GradebookPage /> },
              { path: 'homework', element: <HomeworkPage /> },
              { path: 'exams', element: <ExamsPage /> },
              { path: 'lessons', element: <LessonPlansPage /> },
              { path: 'question-bank', element: <QuestionBankPage /> },
              { path: 'finance/fees', element: <FeesPage /> },
              { path: 'finance/payroll', element: <PayrollPage /> },
              { path: 'reports', element: <ReportsPage /> },
              { path: 'club', element: <AdminClubPage /> },
            ],
          },
        ],
      },

      // 2.3 Persona 3: Teacher & Academic Deputy
      {
        path: 'teacher',
        element: <RoleGuard allowedRoles={['TEACHER', 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF']} />,
        children: [
          {
            element: <TeacherLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <TeacherDashboard /> },
              { path: 'attendance', element: <AttendancePage /> },
              { path: 'gradebook', element: <GradebookPage /> },
              { path: 'homework', element: <HomeworkPage /> },
              { path: 'exams', element: <ExamsPage /> },
              { path: 'lessons', element: <LessonPlansPage /> },
              { path: 'question-bank', element: <QuestionBankPage /> },
              { path: 'visits', element: <TeacherVisitsPage /> },
              { path: 'schedule', element: <TeacherSchedulePage /> },
              { path: 'payroll', element: <TeacherMySlipsPage /> },
              { path: 'matters', element: <MattersPage /> },
              { path: 'club-approvals', element: <TeacherClubApprovalsPage /> },
            ],
          },
        ],
      },

      // 2.4 Persona 4: Student
      {
        path: 'student',
        element: <RoleGuard allowedRoles={['STUDENT', 'SUPER_ADMIN']} />,
        children: [
          {
            element: <StudentParentLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <StudentDashboard /> },
              { path: 'schedule', element: <StudentSchedulePage /> },
              { path: 'homework', element: <StudentHomeworkPage /> },
              { path: 'exams', element: <StudentExamsPage /> },
              { path: 'grades', element: <StudentGradesPage /> },
              { path: 'matters', element: <StudentMattersPage /> },
              { path: 'materials', element: <StudentMaterialsPage /> },
            ],
          },
        ],
      },

      // 2.5 Persona 5: Parent
      {
        path: 'parent',
        element: <RoleGuard allowedRoles={['PARENT', 'SUPER_ADMIN']} />,
        children: [
          {
            element: <StudentParentLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <ParentDashboard /> },
              { path: 'schedule', element: <StudentSchedulePage /> },
              { path: 'homework', element: <StudentHomeworkPage /> },
              { path: 'exams', element: <StudentExamsPage /> },
              { path: 'fees', element: <ParentFeesPage /> },
              { path: 'reports', element: <StudentGradesPage /> },
              { path: 'matters', element: <StudentMattersPage /> },
              { path: 'visits', element: <ParentVisitsPage /> },
            ],
          },
        ],
      },

      // 2.6 Shared Communication & Live Routes (Available for all authenticated personas)
      {
        element: <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF', 'TEACHER', 'STUDENT', 'PARENT', 'COACH']} />,
        children: [
          {
            element: <SharedAppLayout />,
            children: [
              { index: true, element: <SuperAppHomePage /> },
              { path: 'profile', element: <ProfileSettingsPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'ka-platform', element: <KaPlatformPage /> },
              { path: 'club', element: <ClubPage /> },
              { path: 'club/challenges/:id', element: <ClubChallengeDetailPage /> },
              { path: 'chat', element: <Navigate to="/app" replace /> },
              { path: 'messages', element: <MessagesPage /> },
              {
                element: <RoleGuard allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF']} />,
                children: [
                  { path: 'sms', element: <SmsCenterPage /> },
                ],
              },
              { path: 'notices', element: <Navigate to="/app/messages" replace /> },
              { path: 'calendar', element: <CalendarPage /> },
              { path: 'events', element: <EventsRoadmapPage /> },
              { path: 'events/:id', element: <EventSinglePage /> },
              { path: 'coaching', element: <CoachingPage /> },
              { path: 'polls', element: <PollsPage /> },
              { path: 'media', element: <MediaFeedPage /> },
            ],
          },
        ],
      },
    ],
  },

  // 3. Error Pages
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
