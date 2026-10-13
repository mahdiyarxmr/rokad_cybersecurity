import { apiClient } from './client';

export const kaApi = {
  // Admin Endpoints
  createActivity: (data: any) => apiClient.post('/ka-admin/activities', data),
  getAdminActivities: () => apiClient.get('/ka-admin/activities'),
  getAdminSubmissions: () => apiClient.get('/ka-admin/activity-submissions'),
  reviewSubmission: (id: string, data: any) => apiClient.patch(`/ka-admin/activity-submissions/${id}/review`, data),
  
  createReward: (data: any) => apiClient.post('/ka-admin/rewards', data),
  getAdminRewards: () => apiClient.get('/ka-admin/rewards'),
  getAdminClaims: () => apiClient.get('/ka-admin/reward-claims'),
  fulfillClaim: (id: string, data: any) => apiClient.patch(`/ka-admin/reward-claims/${id}/fulfill`, data),
  
  directAward: (data: any) => apiClient.post('/ka-admin/direct-award', data),
  getSchoolStudents: () => apiClient.get('/ka-admin/students'),
  getStudentHistory: (studentId: string) => apiClient.get(`/ka-admin/students/${studentId}/history`),

  // Student Endpoints
  getActivities: () => apiClient.get('/ka-student/activities'),
  submitActivity: (data: any) => apiClient.post('/ka-student/activity-submissions', data),
  getMySubmissions: () => apiClient.get('/ka-student/activity-submissions'),
  
  getRewards: () => apiClient.get('/ka-student/rewards'),
  claimReward: (data: any) => apiClient.post('/ka-student/reward-claims', data),
  getMyClaims: () => apiClient.get('/ka-student/reward-claims'),
  
  getLeaderboard: () => apiClient.get('/ka-student/leaderboard'),
  getStudentSummary: (studentId: string) => apiClient.get(`/ka-student/students/${studentId}/summary`),
};
