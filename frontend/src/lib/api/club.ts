import { apiClient } from './client';

export type ClubDepartment = 'ENGINEER' | 'ARTIST' | 'JACK_OF_ALL_TRADES';
export type ClubGrade = 'A' | 'B' | 'C';
export type ClubMembershipStatus = 'LOCKED' | 'IN_ROADMAP' | 'ACTIVE_MEMBER' | 'STUDIO_READY' | 'SUSPENDED';
export type ClubMilestoneType = 'TEACHER_APPROVAL' | 'PLACEMENT_CHALLENGE' | 'ADMIN_CHECKLIST' | 'LESSON_GRADE';
export type ClubMilestoneStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ClubChallengeType = 'PLACEMENT' | 'GRADE_UPGRADE' | 'MONTHLY_MISSION';
export type ClubSubmissionStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'EXPIRED';

export interface ClubMembership {
  id: string;
  tenantId: string;
  userId: string;
  status: ClubMembershipStatus;
  department: ClubDepartment | null;
  grade: ClubGrade | null;
  joinedAt: string | null;
  promotedToGradeAAt: string | null;
  adminNotes: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatarUrl: string | null;
    phone: string | null;
    studentProfile?: {
      studentCode: string;
      nationalCode?: string;
    };
  };
}

export interface ClubRoadmapMilestone {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  orderIndex: number;
  weight: number;
  type: ClubMilestoneType;
  lessonId: string | null;
  isRequired: boolean;
  lesson?: {
    id: string;
    name: string;
    code: string;
  };
  progress?: {
    id?: string;
    status: ClubMilestoneStatus;
    approvedAt?: string | null;
    notes?: string | null;
    approvedBy?: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    } | null;
  };
}

export interface ClubChallenge {
  id: string;
  title: string;
  slug: string;
  description: string;
  missionBrief: string;
  rules?: string | null;
  department: ClubDepartment;
  type: ClubChallengeType;
  minGrade?: ClubGrade | null;
  maxDays: number;
  maxScore: number;
  isPublished: boolean;
  createdAt: string;
  userSubmission?: ClubChallengeSubmission | null;
  isEnrolled?: boolean;
  isGraded?: boolean;
}

export interface ClubChallengeSubmission {
  id: string;
  challengeId: string;
  challenge?: ClubChallenge;
  studentId: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatarUrl: string | null;
    studentProfile?: {
      studentCode: string;
    };
  };
  status: ClubSubmissionStatus;
  startedAt: string;
  submittedAt: string | null;
  deadlineAt: string;
  repositoryUrl?: string | null;
  figmaUrl?: string | null;
  demoUrl?: string | null;
  submissionNotes?: string | null;
  attachments?: any;
  score?: number | null;
  feedback?: string | null;
  awardedGrade?: ClubGrade | null;
  gradedAt?: string | null;
  gradedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface MyClubStatusResponse {
  membership: ClubMembership;
  roadmap: ClubRoadmapMilestone[];
  progressPercentage: number;
  activeChallengesCount: number;
  canStartNewChallenge: boolean;
  activeSubmissions: ClubChallengeSubmission[];
  recentSubmissions: ClubChallengeSubmission[];
  isStudioReady: boolean;
}

export const clubApi = {
  // Student Portal
  getMyStatus: () => apiClient.get<any>('/club/my-status').then((r) => r.data?.data || r.data),
  getChallenges: (department?: ClubDepartment) =>
    apiClient
      .get<any>('/club/challenges', { params: department ? { department } : {} })
      .then((r) => r.data?.data || r.data),
  getChallengeById: (id: string) =>
    apiClient.get<any>(`/club/challenges/${id}`).then((r) => r.data?.data || r.data),
  startChallenge: (id: string) =>
    apiClient.post<any>(`/club/challenges/${id}/start`).then((r) => r.data?.data || r.data),
  submitChallenge: (id: string, data: any) =>
    apiClient.post<any>(`/club/challenges/${id}/submit`, data).then((r) => r.data?.data || r.data),

  // Teacher Approvals
  getTeacherApprovals: () =>
    apiClient.get<any>('/club/teacher/approvals').then((r) => r.data?.data || r.data),
  submitTeacherApproval: (progressId: string, data: { status: ClubMilestoneStatus; notes?: string }) =>
    apiClient.post<any>(`/club/teacher/approvals/${progressId}`, data).then((r) => r.data?.data || r.data),

  // Admin Management
  getAdminMembers: (params?: { department?: ClubDepartment; grade?: ClubGrade; search?: string }) =>
    apiClient.get<any>('/club/admin/members', { params }).then((r) => r.data?.data || r.data),
  updateMemberStatus: (studentId: string, data: any) =>
    apiClient.patch<any>(`/club/admin/members/${studentId}`, data).then((r) => r.data?.data || r.data),
  toggleStudentMilestone: (studentId: string, milestoneId: string) =>
    apiClient.post<any>(`/club/admin/members/${studentId}/milestones/${milestoneId}/toggle`).then((r) => r.data?.data || r.data),

  // Milestones CRUD
  getAdminMilestones: () =>
    apiClient.get<any>('/club/admin/milestones').then((r) => r.data?.data || r.data),
  createMilestone: (data: any) =>
    apiClient.post<any>('/club/admin/milestones', data).then((r) => r.data?.data || r.data),
  updateMilestone: (id: string, data: any) =>
    apiClient.patch<any>(`/club/admin/milestones/${id}`, data).then((r) => r.data?.data || r.data),
  deleteMilestone: (id: string) =>
    apiClient.delete<any>(`/club/admin/milestones/${id}`).then((r) => r.data?.data || r.data),

  // Challenges CRUD
  getAdminChallenges: () =>
    apiClient.get<any>('/club/admin/challenges').then((r) => r.data?.data || r.data),
  createChallenge: (data: any) =>
    apiClient.post<any>('/club/admin/challenges', data).then((r) => r.data?.data || r.data),
  updateChallenge: (id: string, data: any) =>
    apiClient.patch<any>(`/club/admin/challenges/${id}`, data).then((r) => r.data?.data || r.data),
  deleteChallenge: (id: string) =>
    apiClient.delete<any>(`/club/admin/challenges/${id}`).then((r) => r.data?.data || r.data),

  // Submissions Grading Hub
  getAdminSubmissions: (status?: ClubSubmissionStatus) =>
    apiClient.get<any>('/club/admin/submissions', { params: status ? { status } : {} }).then((r) => r.data?.data || r.data),
  gradeSubmission: (submissionId: string, data: { score: number; feedback?: string; overrideGrade?: ClubGrade }) =>
    apiClient.post<any>(`/club/admin/submissions/${submissionId}/grade`, data).then((r) => r.data?.data || r.data),
};
