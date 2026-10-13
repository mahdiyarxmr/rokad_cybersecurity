import React, { useEffect, useState, useMemo } from 'react';
import {
  Award,
  Users,
  Route,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Github,
  Figma,
  Globe,
  Sliders,
  Sparkles,
  CheckSquare,
  Shield,
  Layers,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import {
  clubApi,
  ClubDepartment,
  ClubGrade,
  ClubMembershipStatus,
  ClubMilestoneType,
  ClubChallengeType,
  ClubSubmissionStatus,
  ClubRoadmapMilestone,
  ClubChallenge,
  ClubChallengeSubmission,
} from '../../../lib/api/club';
import { apiClient } from '../../../lib/api/client';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { toast } from '../../../components/ui/toast/toast';
import { toPersianDigits, formatToJalali } from '../../../lib/utils';

export const AdminClubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'ROADMAP' | 'CHALLENGES' | 'SUBMISSIONS'>('MEMBERS');

  // Shared state
  const [lessons, setLessons] = useState<any[]>([]);

  // 1. Members State
  const [members, setMembers] = useState<any[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [memberDeptFilter, setMemberDeptFilter] = useState<string>('ALL');
  const [memberGradeFilter, setMemberGradeFilter] = useState<string>('ALL');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberFormData, setMemberFormData] = useState({
    department: '',
    grade: '',
    status: '',
    adminNotes: '',
  });

  // 2. Roadmap State
  const [milestones, setMilestones] = useState<ClubRoadmapMilestone[]>([]);
  const [isMilestonesLoading, setIsMilestonesLoading] = useState(false);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ClubRoadmapMilestone | null>(null);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    orderIndex: 1,
    weight: 25,
    type: 'TEACHER_APPROVAL' as ClubMilestoneType,
    lessonId: '',
    isRequired: true,
  });

  // 3. Challenges State
  const [challenges, setChallenges] = useState<ClubChallenge[]>([]);
  const [isChallengesLoading, setIsChallengesLoading] = useState(false);
  const [challengeDeptFilter, setChallengeDeptFilter] = useState<string>('ALL');
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<ClubChallenge | null>(null);
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    slug: '',
    description: '',
    missionBrief: '',
    rules: '',
    department: 'ENGINEER' as ClubDepartment,
    type: 'PLACEMENT' as ClubChallengeType,
    minGrade: '' as '' | ClubGrade,
    maxDays: 7,
    maxScore: 100,
    isPublished: true,
  });

  // 4. Submissions State
  const [submissions, setSubmissions] = useState<ClubChallengeSubmission[]>([]);
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(false);
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<string>('SUBMITTED');
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<ClubChallengeSubmission | null>(null);
  const [gradingForm, setGradingForm] = useState({
    score: 85,
    feedback: '',
    overrideGrade: '' as '' | ClubGrade,
  });

  // Load Lessons for Dropdowns
  useEffect(() => {
    apiClient
      .get('/classes/lessons')
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setLessons(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  // Fetch Members
  const fetchMembers = async () => {
    try {
      setIsMembersLoading(true);
      const params: any = {};
      if (memberDeptFilter !== 'ALL') params.department = memberDeptFilter;
      if (memberGradeFilter !== 'ALL') params.grade = memberGradeFilter;
      if (memberSearch.trim()) params.search = memberSearch.trim();
      const res = await clubApi.getAdminMembers(params);
      const list = Array.isArray(res) ? res : res?.members || [];
      setMembers(list);
    } catch {
      toast.error('خطا در بارگذاری لیست اعضای باشگاه');
    } finally {
      setIsMembersLoading(false);
    }
  };

  // Fetch Milestones
  const fetchMilestones = async () => {
    try {
      setIsMilestonesLoading(true);
      const res = await clubApi.getAdminMilestones();
      const list = Array.isArray(res) ? res : res?.milestones || [];
      setMilestones(list);
    } catch {
      toast.error('خطا در دریافت مراحل نقشه راه');
    } finally {
      setIsMilestonesLoading(false);
    }
  };

  // Fetch Challenges
  const fetchChallenges = async () => {
    try {
      setIsChallengesLoading(true);
      const res = await clubApi.getAdminChallenges();
      const list = Array.isArray(res) ? res : res?.challenges || [];
      setChallenges(list);
    } catch {
      toast.error('خطا در دریافت چالش‌های باشگاه');
    } finally {
      setIsChallengesLoading(false);
    }
  };

  // Fetch Submissions
  const fetchSubmissions = async () => {
    try {
      setIsSubmissionsLoading(true);
      const statusParam = submissionStatusFilter === 'ALL' ? undefined : (submissionStatusFilter as ClubSubmissionStatus);
      const res = await clubApi.getAdminSubmissions(statusParam);
      const list = Array.isArray(res) ? res : res?.submissions || [];
      setSubmissions(list);
    } catch {
      toast.error('خطا در دریافت ارسال‌های پروژه‌ها');
    } finally {
      setIsSubmissionsLoading(false);
    }
  };

  // Load initial tab data
  useEffect(() => {
    if (activeTab === 'MEMBERS') fetchMembers();
    if (activeTab === 'ROADMAP') fetchMilestones();
    if (activeTab === 'CHALLENGES') fetchChallenges();
    if (activeTab === 'SUBMISSIONS') fetchSubmissions();
  }, [activeTab]);

  // Tab 1: Member Handlers
  const handleOpenMemberModal = (member: any) => {
    setSelectedMember(member);
    setMemberFormData({
      department: member.department || member.membership?.department || '',
      grade: member.grade || member.membership?.grade || '',
      status: member.status || member.membership?.status || 'IN_ROADMAP',
      adminNotes: member.adminNotes || member.membership?.adminNotes || '',
    });
  };

  const handleSaveMember = async () => {
    if (!selectedMember) return;
    const targetStudentId = selectedMember.studentId || selectedMember.userId || selectedMember.id;
    try {
      await clubApi.updateMemberStatus(targetStudentId, {
        department: memberFormData.department ? (memberFormData.department as ClubDepartment) : null,
        grade: memberFormData.grade ? (memberFormData.grade as ClubGrade) : null,
        status: memberFormData.status as ClubMembershipStatus,
        adminNotes: memberFormData.adminNotes.trim() || null,
      });
      toast.success('اطلاعات عضویت با موفقیت بروزرسانی شد');
      setSelectedMember(null);
      fetchMembers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در ذخیره اطلاعات عضو');
    }
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    if (!selectedMember) return;
    const targetStudentId = selectedMember.studentId || selectedMember.userId || selectedMember.id;
    try {
      await clubApi.toggleStudentMilestone(targetStudentId, milestoneId);
      toast.success('وضعیت مرحله برای دانش‌آموز تغییر یافت');
      fetchMembers();
      // Update selectedMember state locally
      setSelectedMember((prev: any) => {
        if (!prev) return prev;
        const updatedProgress = (prev.milestoneProgress || []).map((p: any) => {
          if (p.milestoneId === milestoneId) {
            return { ...p, status: p.status === 'APPROVED' ? 'PENDING' : 'APPROVED' };
          }
          return p;
        });
        return { ...prev, milestoneProgress: updatedProgress };
      });
    } catch {
      toast.error('خطا در تغییر وضعیت مرحله');
    }
  };

  // Tab 2: Roadmap Handlers
  const handleOpenMilestoneModal = (milestone?: ClubRoadmapMilestone) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneForm({
        title: milestone.title,
        description: milestone.description || '',
        orderIndex: milestone.orderIndex,
        weight: milestone.weight,
        type: milestone.type,
        lessonId: milestone.lessonId || '',
        isRequired: milestone.isRequired,
      });
    } else {
      setEditingMilestone(null);
      setMilestoneForm({
        title: '',
        description: '',
        orderIndex: milestones.length + 1,
        weight: 25,
        type: 'TEACHER_APPROVAL',
        lessonId: '',
        isRequired: true,
      });
    }
    setMilestoneModalOpen(true);
  };

  const handleSaveMilestone = async () => {
    if (!milestoneForm.title.trim()) {
      toast.error('عنوان مرحله الزامی است');
      return;
    }
    try {
      const payload: any = {
        title: milestoneForm.title.trim(),
        description: milestoneForm.description.trim() || undefined,
        orderIndex: Number(milestoneForm.orderIndex),
        weight: Number(milestoneForm.weight),
        type: milestoneForm.type,
        lessonId: milestoneForm.lessonId || undefined,
        isRequired: Boolean(milestoneForm.isRequired),
      };

      if (editingMilestone) {
        await clubApi.updateMilestone(editingMilestone.id, payload);
        toast.success('مرحله نقشه راه بروزرسانی شد');
      } else {
        await clubApi.createMilestone(payload);
        toast.success('مرحله جدید با موفقیت به نقشه راه افزوده شد');
      }
      setMilestoneModalOpen(false);
      fetchMilestones();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در ذخیره مرحله');
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('آیا از حذف این مرحله از نقشه راه اطمینان دارید؟')) return;
    try {
      await clubApi.deleteMilestone(id);
      toast.success('مرحله با موفقیت حذف شد');
      fetchMilestones();
    } catch {
      toast.error('خطا در حذف مرحله');
    }
  };

  // Tab 3: Challenges Handlers
  const handleOpenChallengeModal = (challenge?: ClubChallenge) => {
    if (challenge) {
      setEditingChallenge(challenge);
      setChallengeForm({
        title: challenge.title,
        slug: challenge.slug,
        description: challenge.description,
        missionBrief: challenge.missionBrief,
        rules: challenge.rules || '',
        department: challenge.department,
        type: challenge.type,
        minGrade: challenge.minGrade || '',
        maxDays: challenge.maxDays,
        maxScore: challenge.maxScore,
        isPublished: challenge.isPublished,
      });
    } else {
      setEditingChallenge(null);
      setChallengeForm({
        title: '',
        slug: '',
        description: '',
        missionBrief: '',
        rules: '',
        department: 'ENGINEER',
        type: 'PLACEMENT',
        minGrade: '',
        maxDays: 7,
        maxScore: 100,
        isPublished: true,
      });
    }
    setChallengeModalOpen(true);
  };

  const handleSaveChallenge = async () => {
    if (!challengeForm.title.trim() || !challengeForm.missionBrief.trim()) {
      toast.error('عنوان و شرح مأموریت چالش الزامی هستند');
      return;
    }
    try {
      const payload: any = {
        title: challengeForm.title.trim(),
        slug: challengeForm.slug.trim() || challengeForm.title.trim().toLowerCase().replace(/\s+/g, '-'),
        description: challengeForm.description.trim(),
        missionBrief: challengeForm.missionBrief.trim(),
        rules: challengeForm.rules.trim() || undefined,
        department: challengeForm.department,
        type: challengeForm.type,
        minGrade: challengeForm.minGrade || undefined,
        maxDays: Number(challengeForm.maxDays),
        maxScore: Number(challengeForm.maxScore),
        isPublished: Boolean(challengeForm.isPublished),
      };

      if (editingChallenge) {
        await clubApi.updateChallenge(editingChallenge.id, payload);
        toast.success('چالش با موفقیت ویرایش شد');
      } else {
        await clubApi.createChallenge(payload);
        toast.success('چالش جدید با موفقیت ایجاد گردید');
      }
      setChallengeModalOpen(false);
      fetchChallenges();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در ذخیره چالش');
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!confirm('آیا از حذف این چالش اطمینان دارید؟')) return;
    try {
      await clubApi.deleteChallenge(id);
      toast.success('چالش حذف شد');
      fetchChallenges();
    } catch {
      toast.error('خطا در حذف چالش');
    }
  };

  // Tab 4: Grading Handlers
  const handleOpenGradingModal = (submission: ClubChallengeSubmission) => {
    setGradingSubmission(submission);
    const scoreVal = submission.score ?? 85;
    setGradingForm({
      score: scoreVal,
      feedback: submission.feedback || '',
      overrideGrade: submission.awardedGrade || '',
    });
    setGradingModalOpen(true);
  };

  const calculatedGradeForScore = useMemo(() => {
    const s = Number(gradingForm.score);
    if (s < 50) return 'C';
    if (s <= 80) return 'B';
    return 'A';
  }, [gradingForm.score]);

  const handleSaveGrading = async () => {
    if (!gradingSubmission) return;
    try {
      await clubApi.gradeSubmission(gradingSubmission.id, {
        score: Number(gradingForm.score),
        feedback: gradingForm.feedback.trim() || undefined,
        overrideGrade: gradingForm.overrideGrade ? gradingForm.overrideGrade : undefined,
      });
      toast.success('ارزیابی داور با موفقیت ثبت شد و گرید دانش‌آموز بروزرسانی گردید');
      setGradingModalOpen(false);
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'خطا در ثبت نمره چالش');
    }
  };

  // Stats calculation
  const membersStats = useMemo(() => {
    const total = members.length;
    const gradeA = members.filter((m) => m.grade === 'A').length;
    const gradeB = members.filter((m) => m.grade === 'B').length;
    const gradeC = members.filter((m) => m.grade === 'C').length;
    const studioReady = members.filter((m) => m.status === 'STUDIO_READY').length;
    return { total, gradeA, gradeB, gradeC, studioReady };
  }, [members]);

  return (
    <div className="space-y-6 pb-16" data-theme="club">
      {/* Header Banner */}
      <div className="bg-stone-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border-2 border-stone-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8A38F5]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#8A38F5]/25 text-[#C084FC] px-3 py-1 rounded-full text-xs font-bold border border-[#8A38F5]/40">
              <Award className="w-4 h-4 text-[#8A38F5]" />
              <span>پنل مدیریت اکوسیستم باشگاه کسب‌وکار رُکاد</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              باشگاه کسب‌وکار دانش‌آموزان و رُکاد استودیو
            </h1>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-800/80 p-3.5 rounded-2xl border border-stone-700 backdrop-blur-sm text-center">
            <div className="px-2">
              <div className="text-xl sm:text-2xl font-black text-amber-400">{toPersianDigits(membersStats.total)}</div>
              <div className="text-xs text-stone-400 font-bold">کل متقاضیان</div>
            </div>
            <div className="px-2 border-r border-stone-700">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">{toPersianDigits(membersStats.studioReady)}</div>
              <div className="text-xs text-stone-400 font-bold">رُکاد استودیو</div>
            </div>
            <div className="px-2 border-r border-stone-700">
              <div className="text-xl sm:text-2xl font-black text-purple-400">{toPersianDigits(membersStats.gradeA)}</div>
              <div className="text-xs text-stone-400 font-bold">گرید A</div>
            </div>
            <div className="px-2 border-r border-stone-700">
              <div className="text-xl sm:text-2xl font-black text-sky-400">{toPersianDigits(membersStats.gradeB)}</div>
              <div className="text-xs text-stone-400 font-bold">گرید B</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 pt-4 border-t border-stone-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('MEMBERS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'MEMBERS'
                ? 'bg-[#8A38F5] text-white shadow-md font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            فهرست اعضا و تعیین سطح
          </button>
          <button
            onClick={() => setActiveTab('ROADMAP')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'ROADMAP'
                ? 'bg-[#8A38F5] text-white shadow-md font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Route className="w-4 h-4" />
            سازنده نقشه راه پذیرش
          </button>
          <button
            onClick={() => setActiveTab('CHALLENGES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'CHALLENGES'
                ? 'bg-[#8A38F5] text-white shadow-md font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            مدیریت چالش‌ها و پروژه‌ها
          </button>
          <button
            onClick={() => setActiveTab('SUBMISSIONS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'SUBMISSIONS'
                ? 'bg-[#8A38F5] text-white shadow-md font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Award className="w-4 h-4" />
            کارتابل داوری و ارزیابی
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: MEMBERS DIRECTORY */}
      {/* ======================================================== */}
      {activeTab === 'MEMBERS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-4 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMembers()}
                placeholder="جستجوی نام یا کد دانش‌آموزی..."
                className="pr-10 h-10 text-sm rounded-xl"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={memberDeptFilter}
                onChange={(e) => {
                  setMemberDeptFilter(e.target.value);
                  setTimeout(fetchMembers, 10);
                }}
                className="text-xs font-bold h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              >
                <option value="ALL">همه دپارتمان‌ها</option>
                <option value="ENGINEER">مهندسا (ENGINEER)</option>
                <option value="ARTIST">آرتیستا (ARTIST)</option>
                <option value="JACK_OF_ALL_TRADES">آچار فرانسه‌ها (JACK_OF_ALL_TRADES)</option>
              </select>

              <select
                value={memberGradeFilter}
                onChange={(e) => {
                  setMemberGradeFilter(e.target.value);
                  setTimeout(fetchMembers, 10);
                }}
                className="text-xs font-bold h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              >
                <option value="ALL">همه گریدها</option>
                <option value="A">گرید A (استارتاپ استودیو)</option>
                <option value="B">گرید B (پیشرفته)</option>
                <option value="C">گرید C (پایه‌ای)</option>
              </select>

              <Button onClick={fetchMembers} className="h-10 text-xs font-bold bg-[#8A38F5] hover:bg-[#7828E0] text-white shadow-[2px_2px_0_#5B21B6] rounded-xl px-4 transition-all">
                اعمال فیلتر
              </Button>
            </div>
          </div>

          {/* Members Table */}
          {isMembersLoading ? (
            <div className="p-8 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-4">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : members.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 space-y-3">
              <Users className="w-12 h-12 text-stone-400 mx-auto" />
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">عضوی با این مشخصات یافت نشد</h3>
            </div>
          ) : (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 font-bold border-b border-stone-200 dark:border-stone-700">
                    <tr>
                      <th className="p-4">دانش‌آموز</th>
                      <th className="p-4">دپارتمان تخصصی</th>
                      <th className="p-4">سطح / گرید</th>
                      <th className="p-4">وضعیت عضویت</th>
                      <th className="p-4">تاریخ ارتقا / عضویت</th>
                      <th className="p-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-medium">
                    {members.map((m) => {
                      const user = m.user || m;
                      const firstName = user.firstName || m.firstName || '';
                      const lastName = user.lastName || m.lastName || '';
                      const avatarUrl = user.avatarUrl || m.avatarUrl;
                      const studentCode = user.studentProfile?.studentCode || m.studentCode || user.username || m.username || '';
                      const department = m.department || m.membership?.department;
                      const grade = m.grade || m.membership?.grade;
                      const status = m.status || m.membership?.status || 'IN_ROADMAP';
                      const joinedDate = m.promotedToGradeAAt || m.joinedAt || m.membership?.promotedToGradeAAt || m.membership?.joinedAt;

                      return (
                        <tr key={m.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center font-bold text-stone-700 dark:text-stone-300 overflow-hidden">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  `${firstName?.[0] || ''} ${lastName?.[0] || ''}` || '—'
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-stone-900 dark:text-white text-sm">
                                  {firstName} {lastName}
                                </div>
                                <div className="text-stone-500 font-mono text-[11px]">
                                  {toPersianDigits(studentCode)}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            {department === 'ENGINEER' && (
                              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                                💻 مهندسا (Engineer)
                              </span>
                            )}
                            {department === 'ARTIST' && (
                              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-400 border border-fuchsia-200 dark:border-fuchsia-800">
                                🎨 آرتیستا (Artist)
                              </span>
                            )}
                            {department === 'JACK_OF_ALL_TRADES' && (
                              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                ⚡ آچار فرانسه‌ها
                              </span>
                            )}
                            {!department && <span className="text-stone-400">تعیین نشده</span>}
                          </td>

                          <td className="p-4">
                            {grade === 'A' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm">
                                <Sparkles className="w-3.5 h-3.5" />
                                گرید A (استودیو)
                              </span>
                            )}
                            {grade === 'B' && (
                              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
                                گرید B (پیشرفته)
                              </span>
                            )}
                            {grade === 'C' && (
                              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                                گرید C (پایه‌ای)
                              </span>
                            )}
                            {!grade && <span className="text-stone-400">تعیین نشده</span>}
                          </td>

                          <td className="p-4">
                            {status === 'STUDIO_READY' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200">
                                🚀 رُکاد استودیو
                              </span>
                            )}
                            {status === 'ACTIVE_MEMBER' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200">
                                ⭐ عضو فعال
                              </span>
                            )}
                            {status === 'IN_ROADMAP' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border border-blue-200">
                                ⏳ در حال طی نقشه راه
                              </span>
                            )}
                            {status === 'LOCKED' && <span className="text-stone-400 font-bold">قفل</span>}
                          </td>

                          <td className="p-4 text-stone-500 font-mono text-[11px]">
                            {joinedDate ? formatToJalali(joinedDate) : '—'}
                          </td>

                        <td className="p-4 text-center">
                          <Button
                            onClick={() => handleOpenMemberModal(m)}
                            variant="outline"
                            className="h-8 text-xs font-bold rounded-lg border-stone-300 dark:border-stone-700 gap-1.5"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            تنظیمات عضویت
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DYNAMIC ROADMAP BUILDER */}
      {/* ======================================================== */}
      {activeTab === 'ROADMAP' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-white">مراحل و چک‌لیست نقشه راه پذیرش</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                مراحل سنجش، تأییدیه مربیان دروس و چالش ورودی که دانش‌آموز برای ورود به باشگاه باید طی کند. مجموع وزن‌ها
                باید ۱۰۰٪ باشد.
              </p>
            </div>
            <Button
              onClick={() => handleOpenMilestoneModal()}
              className="bg-[#8A38F5] hover:bg-[#7828E0] text-white font-bold text-xs h-10 rounded-xl gap-2 shadow-[2px_2px_0_#5B21B6] transition-all"
            >
              <Plus className="w-4 h-4" />
              افزودن مرحله جدید
            </Button>
          </div>

          {isMilestonesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : milestones.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 space-y-3">
              <Route className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">هنوز مرحله‌ای در نقشه راه تعریف نشده است</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone, idx) => (
                <div
                  key={milestone.id}
                  className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-[#8A38F5] transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#8A38F5] text-white font-black text-base flex items-center justify-center shrink-0 shadow-inner">
                      {toPersianDigits(idx + 1)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-stone-900 dark:text-white text-base">{milestone.title}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-[#8A38F5]/10 text-[#8A38F5] dark:text-[#C084FC]">
                          وزن: {toPersianDigits(milestone.weight)}%
                        </span>
                        {milestone.isRequired && (
                          <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                            الزامی
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                          {milestone.type}
                        </span>
                      </div>
                      {milestone.description && (
                        <p className="text-xs text-stone-500 leading-relaxed">{milestone.description}</p>
                      )}
                      {milestone.lesson && (
                        <div className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 pt-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          درس متصل شده: {milestone.lesson.name} ({milestone.lesson.code})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <Button
                      onClick={() => handleOpenMilestoneModal(milestone)}
                      variant="outline"
                      className="h-9 text-xs font-bold rounded-xl border-stone-300 dark:border-stone-700 gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      ویرایش
                    </Button>
                    <Button
                      onClick={() => handleDeleteMilestone(milestone.id)}
                      variant="outline"
                      className="h-9 text-xs font-bold rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CHALLENGES CRUD */}
      {/* ======================================================== */}
      {activeTab === 'CHALLENGES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-white">کاتالوگ چالش‌ها و پروژه‌ها</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                تعریف پروژه‌های ورودی تعیین سطح، مأموریت‌های ماهانه و چالش‌های ارتقای گرید به رُکاد استودیو.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={challengeDeptFilter}
                onChange={(e) => setChallengeDeptFilter(e.target.value)}
                className="text-xs font-bold h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              >
                <option value="ALL">همه دپارتمان‌ها</option>
                <option value="ENGINEER">مهندسا</option>
                <option value="ARTIST">آرتیستا</option>
                <option value="JACK_OF_ALL_TRADES">آچار فرانسه‌ها</option>
              </select>

              <Button
                onClick={() => handleOpenChallengeModal()}
                className="bg-[#8A38F5] hover:bg-[#7828E0] text-white font-bold text-xs h-10 rounded-xl gap-2 shadow-[2px_2px_0_#5B21B6] transition-all"
              >
                <Plus className="w-4 h-4" />
                تعریف چالش جدید
              </Button>
            </div>
          </div>

          {isChallengesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {challenges
                .filter((c) => challengeDeptFilter === 'ALL' || c.department === challengeDeptFilter)
                .map((ch) => (
                  <div
                    key={ch.id}
                    className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {ch.department === 'ENGINEER' && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                              💻 مهندسا
                            </span>
                          )}
                          {ch.department === 'ARTIST' && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300">
                              🎨 آرتیستا
                            </span>
                          )}
                          {ch.department === 'JACK_OF_ALL_TRADES' && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              ⚡ آچار فرانسه‌ها
                            </span>
                          )}

                          <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            {ch.type === 'PLACEMENT' ? 'تعیین سطح' : ch.type === 'GRADE_UPGRADE' ? 'ارتقای گرید' : 'مأموریت ماهانه'}
                          </span>
                        </div>

                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                            ch.isPublished
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {ch.isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                        </span>
                      </div>

                      <h3 className="font-bold text-stone-900 dark:text-white text-base pt-1">{ch.title}</h3>
                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{ch.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800 text-xs">
                      <div className="flex items-center gap-3 text-stone-500">
                        <span>مهلت: {toPersianDigits(ch.maxDays)} روز</span>
                        <span>حداکثر نمره: {toPersianDigits(ch.maxScore)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={() => handleOpenChallengeModal(ch)}
                          variant="ghost"
                          className="h-8 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg p-2"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteChallenge(ch.id)}
                          variant="ghost"
                          className="h-8 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SUBMISSIONS GRADING HUB */}
      {/* ======================================================== */}
      {activeTab === 'SUBMISSIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
            <div>
              <h2 className="text-base font-black text-stone-900 dark:text-white">کارتابل داوری و ارزیابی پروژه‌ها</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                بررسی لینک مخزن گیت‌هاب، طراحی فیگما و دموی زنده دانش‌آموزان. ثبت نمره بر اساس استاندارد (<span className="font-bold text-amber-600">نمره بالای ۸۰ ⬅ ارتقا به گرید A و رُکاد استودیو</span>).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={submissionStatusFilter}
                onChange={(e) => {
                  setSubmissionStatusFilter(e.target.value);
                  setTimeout(fetchSubmissions, 10);
                }}
                className="text-xs font-bold h-10 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
              >
                <option value="ALL">همه ارسال‌ها</option>
                <option value="SUBMITTED">در انتظار داوری (SUBMITTED)</option>
                <option value="GRADED">نمره داده شده (GRADED)</option>
                <option value="IN_PROGRESS">در حال انجام (IN_PROGRESS)</option>
              </select>
              <Button onClick={fetchSubmissions} className="h-10 text-xs font-bold bg-amber-500 text-stone-950 rounded-xl px-4">
                بروزرسانی
              </Button>
            </div>
          </div>

          {isSubmissionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 space-y-3">
              <Award className="w-12 h-12 text-stone-400 mx-auto" />
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">هیچ پروژه‌ای در این وضعیت ارسال نشده است</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:border-amber-400 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center font-bold text-stone-700 dark:text-stone-300">
                        {sub.student?.avatarUrl ? (
                          <img src={sub.student.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          `${sub.student?.firstName?.[0] || ''} ${sub.student?.lastName?.[0] || ''}`
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 dark:text-white text-sm">
                          {sub.student?.firstName} {sub.student?.lastName}
                        </div>
                        <div className="text-xs text-stone-500 font-mono">
                          چالش: <span className="font-bold text-amber-600">{sub.challenge?.title}</span> (
                          {sub.challenge?.department})
                        </div>
                      </div>
                    </div>

                    {/* Links */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {sub.repositoryUrl && (
                        <a
                          href={sub.repositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-mono font-bold hover:bg-stone-200"
                        >
                          <Github className="w-3.5 h-3.5" />
                          مخزن گیت‌هاب
                        </a>
                      )}
                      {sub.figmaUrl && (
                        <a
                          href={sub.figmaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-100"
                        >
                          <Figma className="w-3.5 h-3.5" />
                          طرح فیگما
                        </a>
                      )}
                      {sub.demoUrl && (
                        <a
                          href={sub.demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          دموی زنده
                        </a>
                      )}
                    </div>

                    {sub.submissionNotes && (
                      <p className="text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-200/50 dark:border-stone-700/50">
                        <span className="font-bold">یادداشت دانش‌آموز:</span> {sub.submissionNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:self-center">
                    <div className="text-left space-y-1">
                      {sub.status === 'GRADED' ? (
                        <div>
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            نمره: {toPersianDigits(sub.score || 0)} / ۱۰۰
                          </div>
                          <div className="text-xs font-bold text-stone-500">
                            گرید اعطا شده:{' '}
                            <span className="text-amber-500 font-black">{sub.awardedGrade || 'C'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          منتظر ارزیابی و ثبت نمره
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleOpenGradingModal(sub)}
                      className="bg-[#8A38F5] hover:bg-[#7828E0] text-white font-bold text-xs h-10 px-5 rounded-xl gap-2 shadow-[2px_2px_0_#5B21B6] shrink-0 transition-all"
                    >
                      <Award className="w-4 h-4" />
                      {sub.status === 'GRADED' ? 'ویرایش نمره' : 'داوری و ثبت نمره'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: MEMBER EDIT & CHECKLIST */}
      {/* ======================================================== */}
      {selectedMember && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedMember(null)}
          title={`مدیریت سطح و عضویت: ${selectedMember.user?.firstName || selectedMember.firstName || ''} ${selectedMember.user?.lastName || selectedMember.lastName || ''}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">دپارتمان تخصصی:</label>
                <select
                  value={memberFormData.department}
                  onChange={(e) => setMemberFormData({ ...memberFormData, department: e.target.value })}
                  className="w-full text-xs font-bold h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="">بدون دپارتمان</option>
                  <option value="ENGINEER">مهندسا (ENGINEER)</option>
                  <option value="ARTIST">آرتیستا (ARTIST)</option>
                  <option value="JACK_OF_ALL_TRADES">آچار فرانسه‌ها (JACK_OF_ALL_TRADES)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">گرید و رتبه:</label>
                <select
                  value={memberFormData.grade}
                  onChange={(e) => setMemberFormData({ ...memberFormData, grade: e.target.value })}
                  className="w-full text-xs font-bold h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="">تعیین نشده</option>
                  <option value="A">گرید A (رُکاد استودیو)</option>
                  <option value="B">گرید B (پیشرفته)</option>
                  <option value="C">گرید C (پایه‌ای)</option>
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">وضعیت عضویت:</label>
                <select
                  value={memberFormData.status}
                  onChange={(e) => setMemberFormData({ ...memberFormData, status: e.target.value })}
                  className="w-full text-xs font-bold h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="LOCKED">قفل شده (LOCKED)</option>
                  <option value="IN_ROADMAP">در حال طی نقشه راه (IN_ROADMAP)</option>
                  <option value="ACTIVE_MEMBER">عضو رسمی باشگاه (ACTIVE_MEMBER)</option>
                  <option value="STUDIO_READY">ورود به استارتاپ استودیو (STUDIO_READY)</option>
                  <option value="SUSPENDED">تعلیق موقت (SUSPENDED)</option>
                </select>
              </div>
            </div>

            {/* Checklist items toggle */}
            {selectedMember.milestoneProgress && selectedMember.milestoneProgress.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-200 dark:border-stone-700">
                <label className="text-xs font-black text-stone-800 dark:text-stone-200">
                  وضعیت مراحل نقشه راه دانش‌آموز (تغییر سریع):
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedMember.milestoneProgress.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 text-xs border border-stone-200 dark:border-stone-700"
                    >
                      <div className="font-medium text-stone-800 dark:text-stone-200">
                        {p.milestone?.title || 'مرحله نقشه راه'}
                      </div>
                      <Button
                        onClick={() => handleToggleMilestone(p.milestoneId)}
                        className={`h-7 px-3 text-[11px] font-bold rounded-lg ${
                          p.status === 'APPROVED'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {p.status === 'APPROVED' ? 'تأیید شده ✓' : 'در انتظار'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">یادداشت مدیریت:</label>
              <textarea
                value={memberFormData.adminNotes}
                onChange={(e) => setMemberFormData({ ...memberFormData, adminNotes: e.target.value })}
                rows={2}
                placeholder="یادداشت‌های داخلی و ارزیابی مصاحبه..."
                className="w-full text-xs p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <Button variant="ghost" onClick={() => setSelectedMember(null)} className="h-9 text-xs">
                انصراف
              </Button>
              <Button onClick={handleSaveMember} className="h-9 text-xs font-bold bg-[#8A38F5] hover:bg-[#7828E0] text-white shadow-[2px_2px_0_#5B21B6]">
                ذخیره تغییرات
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ROADMAP MILESTONE CREATE/EDIT */}
      {/* ======================================================== */}
      {milestoneModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setMilestoneModalOpen(false)}
          title={editingMilestone ? 'ویرایش مرحله نقشه راه' : 'افزودن مرحله جدید به نقشه راه'}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">عنوان مرحله:</label>
              <Input
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                placeholder="مثال: تأییدیه صلاحیت درس کارگاه وب و رابط کاربری"
                className="text-xs h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">نوع مرحله:</label>
                <select
                  value={milestoneForm.type}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, type: e.target.value as ClubMilestoneType })}
                  className="w-full text-xs font-bold h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="TEACHER_APPROVAL">تأییدیه مربی درس (TEACHER_APPROVAL)</option>
                  <option value="PLACEMENT_CHALLENGE">چالش ورودی تعیین سطح (PLACEMENT_CHALLENGE)</option>
                  <option value="ADMIN_CHECKLIST">چک‌لیست مصاحبه لید (ADMIN_CHECKLIST)</option>
                  <option value="LESSON_GRADE">نمره کلاسی درس (LESSON_GRADE)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">وزن در پیشرفت (درصد):</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={milestoneForm.weight}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, weight: Number(e.target.value) })}
                  className="text-xs h-10 rounded-xl"
                />
              </div>
            </div>

            {(milestoneForm.type === 'TEACHER_APPROVAL' || milestoneForm.type === 'LESSON_GRADE') && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">درس متصل:</label>
                <select
                  value={milestoneForm.lessonId}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, lessonId: e.target.value })}
                  className="w-full text-xs font-bold h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="">انتخاب درس...</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">توضیحات راهنما:</label>
              <textarea
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                rows={2}
                placeholder="توضیح مرحله برای دانش‌آموز..."
                className="w-full text-xs p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="milestoneRequired"
                checked={milestoneForm.isRequired}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, isRequired: e.target.checked })}
                className="rounded border-stone-300 text-amber-500 focus:ring-amber-400"
              />
              <label htmlFor="milestoneRequired" className="text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
                این مرحله الزامی است (بدون آن پیشرفت کامل نمی‌شود)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <Button variant="ghost" onClick={() => setMilestoneModalOpen(false)} className="h-9 text-xs">
                انصراف
              </Button>
              <Button onClick={handleSaveMilestone} className="h-9 text-xs font-bold bg-[#8A38F5] hover:bg-[#7828E0] text-white shadow-[2px_2px_0_#5B21B6]">
                {editingMilestone ? 'بروزرسانی مرحله' : 'ایجاد مرحله'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CHALLENGE CREATE/EDIT */}
      {/* ======================================================== */}
      {challengeModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setChallengeModalOpen(false)}
          title={editingChallenge ? 'ویرایش چالش' : 'تعریف چالش جدید'}
        >
          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">عنوان چالش:</label>
              <Input
                value={challengeForm.title}
                onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                placeholder="مثال: پیاده‌سازی سیستم مدیریت تسک‌های آنی"
                className="text-xs h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">دپارتمان:</label>
                <select
                  value={challengeForm.department}
                  onChange={(e) => setChallengeForm({ ...challengeForm, department: e.target.value as ClubDepartment })}
                  className="w-full text-xs font-bold h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="ENGINEER">مهندسا (ENGINEER)</option>
                  <option value="ARTIST">آرتیستا (ARTIST)</option>
                  <option value="JACK_OF_ALL_TRADES">آچار فرانسه‌ها (JACK_OF_ALL_TRADES)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">نوع چالش:</label>
                <select
                  value={challengeForm.type}
                  onChange={(e) => setChallengeForm({ ...challengeForm, type: e.target.value as ClubChallengeType })}
                  className="w-full text-xs font-bold h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
                >
                  <option value="PLACEMENT">چالش ورودی تعیین سطح</option>
                  <option value="GRADE_UPGRADE">ارتقای سطح به گرید A و استودیو</option>
                  <option value="MONTHLY_MISSION">مأموریت ماهانه</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">مهلت انجام (روز):</label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={challengeForm.maxDays}
                  onChange={(e) => setChallengeForm({ ...challengeForm, maxDays: Number(e.target.value) })}
                  className="text-xs h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">حداکثر نمره داوری:</label>
                <Input
                  type="number"
                  min="10"
                  max="100"
                  value={challengeForm.maxScore}
                  onChange={(e) => setChallengeForm({ ...challengeForm, maxScore: Number(e.target.value) })}
                  className="text-xs h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">خلاصه چالش (Description):</label>
              <textarea
                value={challengeForm.description}
                onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                rows={2}
                placeholder="خلاصه هدف چالش..."
                className="w-full text-xs p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">شرح مأموریت (Mission Brief):</label>
              <textarea
                value={challengeForm.missionBrief}
                onChange={(e) => setChallengeForm({ ...challengeForm, missionBrief: e.target.value })}
                rows={4}
                placeholder="جزئیات فنی پروژه، فیچرهای مورد انتظار و ددلاین‌ها..."
                className="w-full text-xs p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">قوانین و استانداردهای داوری (Rules):</label>
              <textarea
                value={challengeForm.rules}
                onChange={(e) => setChallengeForm({ ...challengeForm, rules: e.target.value })}
                rows={3}
                placeholder="قوانین کدنویسی تمیز، لینک فیگما، رعایت معماری..."
                className="w-full text-xs p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="challengePublished"
                checked={challengeForm.isPublished}
                onChange={(e) => setChallengeForm({ ...challengeForm, isPublished: e.target.checked })}
                className="rounded border-stone-300 text-amber-500 focus:ring-amber-400"
              />
              <label htmlFor="challengePublished" className="text-xs font-bold text-stone-700 dark:text-stone-300 cursor-pointer">
                انتشار عمومی چالش در کاتالوگ دانش‌آموزان
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <Button variant="ghost" onClick={() => setChallengeModalOpen(false)} className="h-9 text-xs">
                انصراف
              </Button>
              <Button onClick={handleSaveChallenge} className="h-9 text-xs font-bold bg-[#8A38F5] hover:bg-[#7828E0] text-white shadow-[2px_2px_0_#5B21B6]">
                {editingChallenge ? 'ذخیره تغییرات چالش' : 'ایجاد چالش'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: GRADING SUBMISSION */}
      {/* ======================================================== */}
      {gradingModalOpen && gradingSubmission && (
        <Modal
          isOpen={true}
          onClose={() => setGradingModalOpen(false)}
          title={`داوری و ثبت نمره پروژه: ${gradingSubmission.student?.firstName} ${gradingSubmission.student?.lastName}`}
        >
          <div className="space-y-4">
            <div className="bg-stone-50 dark:bg-stone-800/80 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs space-y-2">
              <div className="font-bold text-stone-900 dark:text-white">
                پروژه: {gradingSubmission.challenge?.title}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {gradingSubmission.repositoryUrl && (
                  <a
                    href={gradingSubmission.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 underline font-mono"
                  >
                    گیت‌هاب ↗
                  </a>
                )}
                {gradingSubmission.figmaUrl && (
                  <a
                    href={gradingSubmission.figmaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-600 underline"
                  >
                    فیگما ↗
                  </a>
                )}
                {gradingSubmission.demoUrl && (
                  <a
                    href={gradingSubmission.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 underline"
                  >
                    دموی زنده ↗
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">نمره داوری (۰ تا ۱۰۰):</label>
                <span className="text-xs font-black text-amber-600">
                  گرید محاسبه‌شده سیستمی: <span className="text-base font-black">{calculatedGradeForScore}</span>
                </span>
              </div>
              <Input
                type="number"
                min="0"
                max="100"
                value={gradingForm.score}
                onChange={(e) => setGradingForm({ ...gradingForm, score: Number(e.target.value) })}
                className="text-sm h-11 rounded-xl font-bold"
              />
              <p className="text-[11px] text-stone-500">
                فرمول: نمره کمتر از ۵۰ ⬅ گرید C | نمره ۵۰ تا ۸۰ ⬅ گرید B | نمره بالای ۸۰ ⬅ گرید A (استودیو استارتاپ)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                تغییر دستی گرید (اختیاری):
              </label>
              <select
                value={gradingForm.overrideGrade}
                onChange={(e) => setGradingForm({ ...gradingForm, overrideGrade: e.target.value as '' | ClubGrade })}
                className="w-full text-xs font-bold h-10 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              >
                <option value="">محاسبه خودکار سیستمی بر اساس نمره</option>
                <option value="A">گرید A (رُکاد استودیو)</option>
                <option value="B">گرید B (پیشرفته)</option>
                <option value="C">گرید C (پایه‌ای)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300">بازخورد و نکات داور:</label>
              <textarea
                value={gradingForm.feedback}
                onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                rows={3}
                placeholder="تحلیل کیفیت کد، نقاط قوت، استانداردهای رعایت‌شده و گام‌های بعدی..."
                className="w-full text-xs p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <Button variant="ghost" onClick={() => setGradingModalOpen(false)} className="h-9 text-xs">
                انصراف
              </Button>
              <Button onClick={handleSaveGrading} className="h-9 text-xs font-bold bg-[#8A38F5] hover:bg-[#7828E0] text-white shadow-[2px_2px_0_#5B21B6]">
                ثبت نهایی نمره و گرید
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
