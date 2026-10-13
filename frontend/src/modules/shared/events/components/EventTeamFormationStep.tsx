import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { toast } from '../../../../components/ui/toast/toast';
import { useAuthStore } from '../../../../lib/auth/auth-store';
import { apiClient } from '../../../../lib/api/client';
import { toPersianDigits } from '../../../../utils/jalali';
import { EventIdea } from './EventIdeaSubmissionStep';
import { porscadClient } from '../../../../lib/porscad/porscad-client';
import { isOwnedByUser } from '../constants/event-access';
import {
  EVENT_609775C5_IDEAS,
  EVENT_609775C5_INITIAL_TEAMS,
  WINNING_IDEA_NUMBERS_609775C5,
} from '../constants/initial-ideas';
import {
  Users,
  User,
  UserPlus,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Unlock,
  Edit3,
  Trash2,
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Crown,
  Briefcase,
  ChevronDown,
  UserX,
  Plus,
  Check,
  X,
} from 'lucide-react';

export interface TeamMember {
  id: string;
  name: string;
  roleInTeam: string;
  addedBy: string;
  addedAt: string;
}

export interface IdeaTeam {
  ideaId: string;
  ideaNumber: number;
  ideaTitle: string;
  leaderName: string;
  members: TeamMember[];
  isApprovedByAdmin: boolean;
  approvedAt?: string;
}

interface EventTeamFormationStepProps {
  eventId: string;
  eventTitle: string;
  ideas: EventIdea[];
  isEventEnded?: boolean;
  onAddIdea?: (newIdea: EventIdea) => void;
  onUpdateIdea?: (updatedIdea: EventIdea) => void;
  onDeleteIdea?: (ideaId: string) => void;
}

// Default Fallback Database Students List (names only — no class labels)
export const FALLBACK_DB_STUDENTS = [
  // هنرستان پسرانه - شبکه و نرم‌افزار
  { id: 'std_101', name: 'امیرعلی رضایی' },
  { id: 'std_102', name: 'محمدحسین علیزاده' },
  { id: 'std_103', name: 'علیرضا حسینی' },
  { id: 'std_104', name: 'مهدی محمودی' },
  { id: 'std_105', name: 'رضا صبوری' },
  { id: 'std_106', name: 'سینا کاظمی' },
  { id: 'std_107', name: 'پارسا اوسطی' },
  { id: 'std_108', name: 'حسین اکبری' },
  { id: 'std_109', name: 'دانیال مهدوی' },
  { id: 'std_110', name: 'کیان سلطانی' },
  { id: 'std_111', name: 'بردیا کریمی' },
  { id: 'std_112', name: 'آرین شمس' },
  { id: 'std_113', name: 'نیما طاهری' },
  { id: 'std_114', name: 'سامان یزدانی' },
  { id: 'std_115', name: 'پویا صالحی' },

  // هنرستان دخترانه - شبکه و چندرسانه‌ای
  { id: 'std_201', name: 'ستایش مرادی' },
  { id: 'std_202', name: 'سارا احمدی' },
  { id: 'std_203', name: 'فاطمه موسوی' },
  { id: 'std_204', name: 'نرگس ابراهیمی' },
  { id: 'std_205', name: 'یکتا خسروی' },
  { id: 'std_206', name: 'رها سلیمانی' },
  { id: 'std_207', name: 'آوا قربانی' },
  { id: 'std_208', name: 'مبینا حسینی' },
  { id: 'std_209', name: 'هلیا رفیعی' },
  { id: 'std_210', name: 'دیانا نوری' },

  // کالج تخصصی و طراحی
  { id: 'std_301', name: 'امیررضا مختاری' },
  { id: 'std_302', name: 'شایان دهقان' },
  { id: 'std_303', name: 'ماهان فرهمند' },
  { id: 'std_304', name: 'نازنین زارع' },
  { id: 'std_305', name: 'غزل اکبریان' },
];

const TEAM_ROLES = [
  'ایده‌پرداز',
  'برنامه‌نویس',
  'گرافیست',
  'ارائه‌دهنده',
  'نیروی اجرایی',
] as const;

export const EventTeamFormationStep: React.FC<EventTeamFormationStepProps> = ({
  eventId,
  eventTitle,
  ideas,
  isEventEnded = false,
  onAddIdea,
  onUpdateIdea,
  onDeleteIdea,
}) => {
  const currentUser = useAuthStore((s) => s.user);
  const isManager = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STAFF'].includes(currentUser?.role || '');
  const isParent = currentUser?.role === 'PARENT';
  const isStudent = currentUser?.role === 'STUDENT';
  const currentUserName = currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : 'دانش‌آموز';

  // DB Students list state
  const [dbStudents, setDbStudents] = useState<Array<{ id: string; name: string }>>(FALLBACK_DB_STUDENTS);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');

  // Admin Custom Activated Teams State
  const customTeamsKey = `rokad_event_custom_teams_${eventId}`;
  const [customActiveIdeaIds, setCustomActiveIdeaIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(customTeamsKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(customTeamsKey, JSON.stringify(customActiveIdeaIds));
    } catch {}
  }, [customActiveIdeaIds, customTeamsKey]);

  const [showAllIdeasForAdmin, setShowAllIdeasForAdmin] = useState(false);

  // Change Leader Modal State
  const [isChangeLeaderModalOpen, setIsChangeLeaderModalOpen] = useState(false);
  const [activeIdeaForLeaderChange, setActiveIdeaForLeaderChange] = useState<EventIdea | null>(null);
  const [selectedNewLeaderName, setSelectedNewLeaderName] = useState('');
  const [customNewLeaderInput, setCustomNewLeaderInput] = useState('');
  const [leaderSearchQuery, setLeaderSearchQuery] = useState('');

  // Add Team Modal State
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [addTeamTab, setAddTeamTab] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [selectedExistingIdeaId, setSelectedExistingIdeaId] = useState('');
  const [newTeamTitle, setNewTeamTitle] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamLeaderStudentId, setNewTeamLeaderStudentId] = useState('');
  const [newTeamLeaderCustomName, setNewTeamLeaderCustomName] = useState('');
  const [newTeamIdeaNumber, setNewTeamIdeaNumber] = useState<number>(1);

  // Teams state per idea
  const teamsStorageKey = `rokad_event_teams_${eventId}`;
  const [teamsMap, setTeamsMap] = useState<Record<string, IdeaTeam>>(() => {
    let initial: Record<string, IdeaTeam> = {};
    if (eventId === '609775c5-ad77-43bb-8065-1aafc5bad547') {
      initial = { ...EVENT_609775C5_INITIAL_TEAMS };
    }
    try {
      const saved = localStorage.getItem(teamsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...initial, ...parsed };
      }
    } catch (e) {
      console.error('Failed to parse teams state', e);
    }
    return initial;
  });

  // Filter ideas to show top winning ideas if poll is closed, or all approved ideas if poll is open
  const winningIdeas = useMemo(() => {
    // 1. Deduplicate ideas by ideaNumber or title
    const dedupMap = new Map<number | string, EventIdea>();
    for (const idea of ideas) {
      const key = idea.ideaNumber ?? idea.title;
      if (!dedupMap.has(key)) {
        dedupMap.set(key, idea);
      } else {
        const existing = dedupMap.get(key)!;
        if (idea.id.startsWith('idea_609775c5_') || (teamsMap[idea.id]?.members?.length || 0) > (teamsMap[existing.id]?.members?.length || 0)) {
          dedupMap.set(key, idea);
        }
      }
    }
    const baseList = Array.from(dedupMap.values());

    // If manager toggles Show All Ideas, show all ideas in teams grid
    if (showAllIdeasForAdmin) {
      return [...baseList].sort((a, b) => (a.ideaNumber || 0) - (b.ideaNumber || 0));
    }

    // 2. If this is the specific girls event, strictly show winning teams + any custom added teams
    if (eventId === '609775c5-ad77-43bb-8065-1aafc5bad547') {
      const targetWinningNumbers = new Set(WINNING_IDEA_NUMBERS_609775C5);
      const filtered = baseList.filter(
        (i) => (i.ideaNumber && targetWinningNumbers.has(i.ideaNumber)) || customActiveIdeaIds.includes(i.id)
      );

      for (const winNum of WINNING_IDEA_NUMBERS_609775C5) {
        if (!filtered.some((i) => i.ideaNumber === winNum)) {
          const fallback = EVENT_609775C5_IDEAS.find((i) => i.ideaNumber === winNum);
          if (fallback) filtered.push(fallback);
        }
      }

      const normalized = filtered.map((idea) => {
        if (idea.ideaNumber === 29) {
          return { ...idea, authorName: 'محیا تقوی‌فرد' };
        }
        return idea;
      });

      return normalized.sort((a, b) => (a.ideaNumber || 0) - (b.ideaNumber || 0));
    }

    const poll = porscadClient.getLocalPollData(eventId);
    if (!poll || !poll.isClosed) {
      return [...baseList].sort((a, b) => {
        const aIsOwn = !!currentUser && isOwnedByUser(a.authorName, currentUser);
        const bIsOwn = !!currentUser && isOwnedByUser(b.authorName, currentUser);
        if (aIsOwn && !bIsOwn) return -1;
        if (!aIsOwn && bIsOwn) return 1;
        return (a.ideaNumber || 0) - (b.ideaNumber || 0);
      });
    }

    const winningOptionIds =
      poll.winningOptionIds || (poll.winningOptionId ? [poll.winningOptionId] : []);
    const topCount =
      Number(poll.topWinnersCount) > 0 ? Number(poll.topWinnersCount) : winningOptionIds.length || 1;

    const sortedOptions = [...(poll.options || [])].sort(
      (a, b) => (b.voteCount || 0) - (a.voteCount || 0)
    );
    const topWinningOptions = sortedOptions.slice(0, topCount);

    const winningIdeaIds = new Set<string>();
    for (const opt of topWinningOptions) {
      if (opt.ideaId) winningIdeaIds.add(opt.ideaId);
      if (opt.id) winningIdeaIds.add(opt.id);
    }
    for (const wId of winningOptionIds) {
      winningIdeaIds.add(wId);
    }

    const matched = baseList.filter(
      (idea) =>
        winningIdeaIds.has(idea.id) ||
        customActiveIdeaIds.includes(idea.id) ||
        Boolean(teamsMap[idea.id]?.members?.length) ||
        topWinningOptions.some((o) => o.text && o.text.includes(idea.title))
    );

    const finalList = matched.length > 0 ? matched : baseList.slice(0, topCount);

    // Sort: user's own idea first (if exists), then remaining ideas sorted by ideaNumber
    return [...finalList].sort((a, b) => {
      const aIsOwn = !!currentUser && isOwnedByUser(a.authorName, currentUser);
      const bIsOwn = !!currentUser && isOwnedByUser(b.authorName, currentUser);
      if (aIsOwn && !bIsOwn) return -1;
      if (!aIsOwn && bIsOwn) return 1;
      return (a.ideaNumber || 0) - (b.ideaNumber || 0);
    });
  }, [eventId, ideas, currentUser, teamsMap, customActiveIdeaIds, showAllIdeasForAdmin]);

  // Save teams state to localStorage & sync to server
  useEffect(() => {
    try {
      localStorage.setItem(teamsStorageKey, JSON.stringify(teamsMap));
      if (Object.keys(teamsMap).length > 0) {
        apiClient.put(`/calendar/events/${eventId}/teams`, { teams: teamsMap }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to save teams state', e);
    }
  }, [teamsMap, teamsStorageKey, eventId]);

  // Load teams from server on mount
  useEffect(() => {
    const fetchServerTeams = async () => {
      try {
        const res = await apiClient.get(`/calendar/events/${eventId}/wizard-data`);
        if (res.data?.teams && typeof res.data.teams === 'object' && Object.keys(res.data.teams).length > 0) {
          setTeamsMap((prev) => ({ ...res.data.teams, ...prev }));
        }
      } catch (err) {
        // offline fallback
      }
    };
    fetchServerTeams();
  }, [eventId]);

  // Fetch DB students from API (name only)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await apiClient.get('/users?role=STUDENT');
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((u: any) => ({
            id: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
          }));
          setDbStudents(mapped);
        }
      } catch (err) {
        // Safe offline fallback to FALLBACK_DB_STUDENTS
      }
    };
    fetchStudents();
  }, []);

  // Modal State for Adding/Editing Member
  const [activeIdeaIdForModal, setActiveIdeaIdForModal] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [memberRole, setMemberRole] = useState<string>('ایده‌پرداز');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const [customStudentName, setCustomStudentName] = useState('');

  // Close custom dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    if (isRoleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRoleDropdownOpen]);

  // Identify all assigned student names/IDs across ALL teams to enforce unique assignment!
  const assignedStudentMap = useMemo(() => {
    const map: Record<string, { ideaId: string; ideaNumber: number; ideaTitle: string }> = {};
    Object.values(teamsMap).forEach((team) => {
      team.members.forEach((m) => {
        map[m.id] = { ideaId: team.ideaId, ideaNumber: team.ideaNumber, ideaTitle: team.ideaTitle };
        map[m.name.trim().toLowerCase()] = { ideaId: team.ideaId, ideaNumber: team.ideaNumber, ideaTitle: team.ideaTitle };
      });
      // Leader is also assigned!
      map[team.leaderName.trim().toLowerCase()] = { ideaId: team.ideaId, ideaNumber: team.ideaNumber, ideaTitle: team.ideaTitle };
    });
    return map;
  }, [teamsMap]);

  // Get or initialize Team object for an idea
  const getIdeaTeam = (idea: EventIdea): IdeaTeam => {
    const numKey = `idea_609775c5_${idea.ideaNumber}`;
    let resolvedTeam: IdeaTeam | null = null;

    if (teamsMap[idea.id] && teamsMap[idea.id].members && teamsMap[idea.id].members.length > 0) {
      resolvedTeam = teamsMap[idea.id];
    } else if (teamsMap[numKey] && teamsMap[numKey].members && teamsMap[numKey].members.length > 0) {
      resolvedTeam = teamsMap[numKey];
    } else {
      const matchByNum = Object.values(teamsMap).find(
        (t) => t.ideaNumber === idea.ideaNumber && t.members && t.members.length > 0
      );
      if (matchByNum) {
        resolvedTeam = matchByNum;
      } else if (eventId === '609775c5-ad77-43bb-8065-1aafc5bad547' && EVENT_609775C5_INITIAL_TEAMS[numKey]) {
        resolvedTeam = EVENT_609775C5_INITIAL_TEAMS[numKey];
      } else if (teamsMap[idea.id]) {
        resolvedTeam = teamsMap[idea.id];
      }
    }

    if (resolvedTeam) {
      if (idea.ideaNumber === 29 && resolvedTeam.leaderName !== 'محیا تقوی‌فرد') {
        return { ...resolvedTeam, leaderName: 'محیا تقوی‌فرد' };
      }
      return resolvedTeam;
    }

    return {
      ideaId: idea.id,
      ideaNumber: idea.ideaNumber || 1,
      ideaTitle: idea.title,
      leaderName: idea.ideaNumber === 29 ? 'محیا تقوی‌فرد' : idea.authorName,
      members: [],
      isApprovedByAdmin: false,
    };
  };

  // Open change leader modal
  const handleOpenChangeLeaderModal = (idea: EventIdea, team: IdeaTeam) => {
    setActiveIdeaForLeaderChange(idea);
    setSelectedNewLeaderName(team.leaderName || idea.authorName);
    setCustomNewLeaderInput('');
    setLeaderSearchQuery('');
    setIsChangeLeaderModalOpen(true);
  };

  // Save leader change
  const handleSaveLeaderChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIdeaForLeaderChange) return;

    const newLeader = customNewLeaderInput.trim() || selectedNewLeaderName.trim();
    if (!newLeader) {
      toast.error('لطفاً نام سرگروه جدید را مشخص نمایید.');
      return;
    }

    const currentTeam = getIdeaTeam(activeIdeaForLeaderChange);
    // Remove new leader from member list if they were an existing member
    const updatedMembers = currentTeam.members.filter(
      (m) => m.name.trim().toLowerCase() !== newLeader.trim().toLowerCase()
    );

    const updatedTeam: IdeaTeam = {
      ...currentTeam,
      leaderName: newLeader,
      members: updatedMembers,
    };

    setTeamsMap((prev) => ({
      ...prev,
      [activeIdeaForLeaderChange.id]: updatedTeam,
    }));

    if (onUpdateIdea) {
      onUpdateIdea({
        ...activeIdeaForLeaderChange,
        authorName: newLeader,
      });
    }

    setIsChangeLeaderModalOpen(false);
    setActiveIdeaForLeaderChange(null);
    toast.success(`سرگروه تیم «${activeIdeaForLeaderChange.title}» با موفقیت به «${newLeader}» تغییر یافت.`);
  };

  // Add existing idea to team formation
  const handleAddExistingIdeaAsTeam = () => {
    if (!selectedExistingIdeaId) {
      toast.error('لطفاً یکی از ایده‌ها را انتخاب نمایید.');
      return;
    }
    const targetIdea = ideas.find((i) => i.id === selectedExistingIdeaId);
    if (!targetIdea) return;

    if (!customActiveIdeaIds.includes(targetIdea.id)) {
      setCustomActiveIdeaIds((prev) => [...prev, targetIdea.id]);
    }

    if (!teamsMap[targetIdea.id]) {
      setTeamsMap((prev) => ({
        ...prev,
        [targetIdea.id]: {
          ideaId: targetIdea.id,
          ideaNumber: targetIdea.ideaNumber || 1,
          ideaTitle: targetIdea.title,
          leaderName: targetIdea.authorName,
          members: [],
          isApprovedByAdmin: false,
        },
      }));
    }

    setIsAddTeamModalOpen(false);
    setSelectedExistingIdeaId('');
    toast.success(`ایده شماره ${toPersianDigits(targetIdea.ideaNumber || 1)} به لیست تیم‌های فعال افزوده شد.`);
  };

  // Create brand new idea and team directly
  const handleCreateBrandNewTeam = (e: React.FormEvent) => {
    e.preventDefault();
    const leaderStudent = dbStudents.find((s) => s.id === newTeamLeaderStudentId);
    const leaderName = leaderStudent ? leaderStudent.name : newTeamLeaderCustomName.trim();

    if (!newTeamTitle.trim()) {
      toast.error('لطفاً عنوان ایده/تیم را وارد کنید.');
      return;
    }
    if (!leaderName) {
      toast.error('لطفاً نام سرگروه تیم را مشخص کنید.');
      return;
    }

    const nextNum =
      newTeamIdeaNumber > 0
        ? newTeamIdeaNumber
        : Math.max(0, ...ideas.map((i) => i.ideaNumber || 0)) + 1;
    const newIdeaId = 'idea_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const newIdea: EventIdea = {
      id: newIdeaId,
      eventId,
      ideaNumber: nextNum,
      title: newTeamTitle.trim(),
      description: newTeamDescription.trim() || 'ایده ثبت‌شده در مرحله تشکیل تیم توسط ادمین',
      authorName: leaderName,
      authorRole: 'دانش‌آموز',
      createdAt: new Date().toISOString(),
      status: 'APPROVED',
      starRatings: [],
    };

    if (onAddIdea) {
      onAddIdea(newIdea);
    }

    setTeamsMap((prev) => ({
      ...prev,
      [newIdeaId]: {
        ideaId: newIdeaId,
        ideaNumber: nextNum,
        ideaTitle: newTeamTitle.trim(),
        leaderName: leaderName,
        members: [],
        isApprovedByAdmin: false,
      },
    }));

    setCustomActiveIdeaIds((prev) => [...prev, newIdeaId]);

    setIsAddTeamModalOpen(false);
    setNewTeamTitle('');
    setNewTeamDescription('');
    setNewTeamLeaderStudentId('');
    setNewTeamLeaderCustomName('');
    toast.success(`تیم و ایده جدید «${newIdea.title}» با سرگروهی «${leaderName}» ایجاد شد.`);
  };

  // Add Member to Idea Team
  const handleAddMember = (idea: EventIdea) => {
    if (isParent || (!isStudent && !isManager)) {
      toast.error('انتخاب و مدیریت اعضای تیم فقط مختص سرپرست تیم (دانش‌آموز) و مدیران است.');
      return;
    }

    const targetStudent = dbStudents.find((s) => s.id === selectedStudentId);
    const candidateName = targetStudent ? targetStudent.name : customStudentName.trim();
    const candidateId = targetStudent ? targetStudent.id : 'custom_' + Date.now();

    if (!candidateName) {
      toast.error('لطفاً یک دانش‌آموز را از لیست انتخاب کنید یا نام فرد را وارد نمایید.');
      return;
    }

    // Check unique constraint: Has this person already been assigned to another team?
    const existingAssignment = assignedStudentMap[candidateId] || assignedStudentMap[candidateName.toLowerCase()];
    if (existingAssignment && existingAssignment.ideaId !== idea.id) {
      toast.error(
        `خطا: «${candidateName}» قبلاً عضو تیم ایده #${toPersianDigits(existingAssignment.ideaNumber)} (${existingAssignment.ideaTitle}) شده است و نمی‌تواند همزمان عضو دو تیم باشد!`
      );
      return;
    }

    const currentTeam = getIdeaTeam(idea);

    // Prevent duplicate within same team
    if (currentTeam.members.some((m) => m.id === candidateId || m.name.toLowerCase() === candidateName.toLowerCase())) {
      toast.error(`«${candidateName}» قبلاً به این تیم اضافه شده است.`);
      return;
    }

    const newMember: TeamMember = {
      id: candidateId,
      name: candidateName,
      roleInTeam: memberRole || 'ایده‌پرداز',
      addedBy: currentUserName,
      addedAt: new Date().toISOString(),
    };

    const updatedTeam: IdeaTeam = {
      ...currentTeam,
      members: [...currentTeam.members, newMember],
    };

    setTeamsMap((prev) => ({
      ...prev,
      [idea.id]: updatedTeam,
    }));

    toast.success(`«${candidateName}» با نقش «${memberRole}» به تیم اضافه شد.`);
    setSelectedStudentId('');
    setCustomStudentName('');
  };

  // Add Member directly from list without closing modal
  const handleAddMemberDirectly = (idea: EventIdea, student: { id: string; name: string }) => {
    if (isParent || (!isStudent && !isManager)) {
      toast.error('انتخاب و مدیریت اعضای تیم فقط مختص سرپرست تیم (دانش‌آموز) و مدیران است.');
      return;
    }

    const candidateName = student.name;
    const candidateId = student.id;

    // Check unique constraint: Has this person already been assigned to another team?
    const existingAssignment = assignedStudentMap[candidateId] || assignedStudentMap[candidateName.toLowerCase()];
    if (existingAssignment && existingAssignment.ideaId !== idea.id) {
      toast.error(
        `خطا: «${candidateName}» قبلاً عضو تیم ایده شماره ${toPersianDigits(existingAssignment.ideaNumber)} (${existingAssignment.ideaTitle}) شده است و نمی‌تواند همزمان عضو دو تیم باشد!`
      );
      return;
    }

    const currentTeam = getIdeaTeam(idea);

    // Prevent duplicate within same team
    if (currentTeam.members.some((m) => m.id === candidateId || m.name.toLowerCase() === candidateName.toLowerCase())) {
      toast.error(`«${candidateName}» قبلاً به این تیم اضافه شده است.`);
      return;
    }

    const newMember: TeamMember = {
      id: candidateId,
      name: candidateName,
      roleInTeam: memberRole || 'ایده‌پرداز',
      addedBy: currentUserName,
      addedAt: new Date().toISOString(),
    };

    const updatedTeam: IdeaTeam = {
      ...currentTeam,
      members: [...currentTeam.members, newMember],
    };

    setTeamsMap((prev) => ({
      ...prev,
      [idea.id]: updatedTeam,
    }));

    toast.success(`«${candidateName}» به ترکیب تیم اضافه شد.`);
  };

  // Remove Member from Idea Team
  const handleRemoveMember = (ideaId: string, memberId: string, memberName: string) => {
    if (isParent || (!isStudent && !isManager)) {
      toast.error('ویرایش ترکیب تیم فقط مختص سرپرست تیم و مدیران است.');
      return;
    }

    const currentTeam = teamsMap[ideaId];
    if (!currentTeam) return;

    if (currentTeam.isApprovedByAdmin && !isManager) {
      toast.error('این ترکیب تیم توسط راهبر تایید نهایی شده و قابل ویرایش نیست.');
      return;
    }

    const updatedMembers = currentTeam.members.filter((m) => m.id !== memberId);
    setTeamsMap((prev) => ({
      ...prev,
      [ideaId]: {
        ...currentTeam,
        members: updatedMembers,
      },
    }));

    toast.info(`«${memberName}» از ترکیب تیم حذف شد.`);
  };

  // Admin Toggle Team Approval
  const handleToggleAdminApproval = (ideaId: string) => {
    if (!isManager) return;
    const currentTeam = teamsMap[ideaId];
    if (!currentTeam) return;

    const nextState = !currentTeam.isApprovedByAdmin;
    if (nextState && (!currentTeam.members || currentTeam.members.length === 0)) {
      toast.error('تیم هنوز عضوی ندارد؛ ابتدا حداقل یک عضو اضافه کنید.');
      return;
    }

    setTeamsMap((prev) => ({
      ...prev,
      [ideaId]: {
        ...currentTeam,
        isApprovedByAdmin: nextState,
        approvedAt: nextState ? new Date().toISOString() : undefined,
      },
    }));

    if (nextState) {
      toast.success(`ترکیب تیم ایده شماره ${toPersianDigits(currentTeam.ideaNumber)} توسط راهبر تایید نهایی و برای زیرمجموعه‌ها قفل شد.`);
    } else {
      toast.info(`تاییدیه ترکیب تیم ایده شماره ${toPersianDigits(currentTeam.ideaNumber)} توسط راهبر بازگشایی شد.`);
    }
  };

  const allTeamsApproved =
    winningIdeas.length > 0 && winningIdeas.every((idea) => teamsMap[idea.id]?.isApprovedByAdmin);

  // Check if current user's team is approved by admin
  const isCurrentUserTeamApproved = useMemo(() => {
    if (isManager) {
      return allTeamsApproved;
    }
    if (!currentUser) return false;
    for (const idea of winningIdeas) {
      const team = getIdeaTeam(idea);
      const isLeader = isOwnedByUser(idea.authorName, currentUser);
      const isMember = team.members.some(
        (m) =>
          isOwnedByUser(m.name, currentUser) ||
          m.name.trim().toLowerCase() === currentUserName.toLowerCase() ||
          (currentUser?.id && m.id === currentUser.id)
      );
      if (isLeader || isMember) {
        return !!team.isApprovedByAdmin;
      }
    }
    return false;
  }, [isManager, allTeamsApproved, currentUser, winningIdeas, teamsMap, currentUserName]);

  return (
    <div className="space-y-8">
      {/* Header Container */}
      <div className="rounded-2xl border-[1.5px] border-primary-dark/30 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#0B0F17] p-5 sm:p-7 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-lg md:text-xl font-black text-ink-darker dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-primary shrink-0" />
                <span>گام چهارم: تشکیل تیم</span>
              </h2>

              {winningIdeas.length > 0 && (
                isCurrentUserTeamApproved ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تایید شده</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>در انتظار تایید</span>
                  </span>
                )
              )}
            </div>
            <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
              اعضای تیم ایده خود را مشخص و ترکیب تیم را نهایی کنید.
            </p>
          </div>

          {isManager && !isEventEnded && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllIdeasForAdmin((prev) => !prev)}
                className="gap-1.5 text-xs font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>{showAllIdeasForAdmin ? 'نمایش فقط برگزیدگان' : 'نمایش تمام ایده‌ها'}</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsAddTeamModalOpen(true);
                  setNewTeamIdeaNumber(Math.max(0, ...ideas.map((i) => i.ideaNumber || 0)) + 1);
                }}
                className="gap-1.5 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن تیم جدید</span>
              </Button>
            </div>
          )}
        </div>

        {isManager && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10 text-primary text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>پنل راهبر: افزودن تیم جدید، تغییر سرگروه، ویرایش اعضا و تایید نهایی برای شما فعال است</span>
          </div>
        )}

        {isParent && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200 text-xs font-black">
            <Users className="w-4 h-4 text-blue-600" />
            <span>حالت مشاهده‌گر اولیاء: ترکیب تیم‌ها و اعضا در حالت نمایشی</span>
          </div>
        )}
      </div>

      {/* Ideas Teams List Grid (ONLY FOR WINNING IDEAS FROM STEP 3) */}
      {winningIdeas.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151C28] p-8 sm:p-12 text-center shadow-2xs space-y-3">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-2" />
          <h3 className="text-lg font-black text-ink-darker dark:text-white">
            در انتظار مشخص‌سازی ایده‌های برگزیده رویداد (گام سوم)
          </h3>
          <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
            بخش تشکیل تیم صرفاً برای ایده‌های منتخب پس از پایان نظرسنجی فعال می‌شود. پس از اتمام رای‌گیری و تعیین ایده‌های برتر توسط راهبر، ایده‌های برگزیده جهت تیم‌سازی در این بخش قرار خواهند گرفت.
          </p>
          {isManager && !isEventEnded && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddTeamModalOpen(true)}
                className="gap-1.5 text-xs font-bold mx-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن تیم جدید توسط ادمین</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {winningIdeas.map((idea) => {
            const team = getIdeaTeam(idea);
            const isLeader = isStudent && !!currentUser && isOwnedByUser(idea.authorName, currentUser);
            const canEditTeam = !isEventEnded && !isParent && (isManager || (isLeader && !team.isApprovedByAdmin));

            return (
              <div
                key={idea.id}
                className={`group relative rounded-2xl border-[1.5px] p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between space-y-5 ${
                  team.isApprovedByAdmin
                    ? 'border-emerald-500/50 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#10B981] dark:shadow-[2px_2px_0_#065F46]'
                    : isLeader
                    ? 'border-primary/50 bg-white dark:bg-[#151C28] shadow-[2px_2px_0_#59BBAF] dark:shadow-[2px_2px_0_#1F413D]'
                    : 'border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-2xs hover:shadow-xs hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Idea Number, Title & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2.5 py-1 rounded-xl border border-primary/20 bg-primary/10 text-primary font-bold text-xs shrink-0 shadow-2xs">
                        ایده شماره {toPersianDigits(idea.ideaNumber || 1)}
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-ink-darker dark:text-white truncate">
                        {idea.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLeader && (
                        <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary text-xs font-bold border border-primary/20 shadow-2xs">
                          تیم شما
                        </span>
                      )}

                      {team.isApprovedByAdmin && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تایید شده</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Leader Info */}
                  <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/80 to-amber-50/30 dark:from-amber-950/30 dark:to-transparent flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl border border-amber-400/40 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-2xs shrink-0">
                        <Crown className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-amber-800/80 dark:text-amber-400/80">
                          سرگروه / صاحب ایده:
                        </div>
                        <div className="text-xs sm:text-sm font-black text-ink-darker dark:text-white mt-0.5 truncate">
                          {team.leaderName || idea.authorName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isLeader && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-black border border-amber-500/30 shadow-2xs">
                          شما سرگروه هستید
                        </span>
                      )}

                      {isManager && !isEventEnded && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenChangeLeaderModal(idea, team)}
                          className="gap-1.5 text-xs font-bold py-1 px-2.5 rounded-xl h-8 border-amber-400/50 text-amber-800 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-950/50"
                          title="تغییر سرگروه این ایده/تیم"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span>تغییر سرگروه</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary" />
                        <span>اعضای تیم ({toPersianDigits(team.members.length + 1)} نفر شامل سرگروه):</span>
                      </h4>

                      {canEditTeam && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setActiveIdeaIdForModal(idea.id);
                            setSelectedStudentId('');
                            setCustomStudentName('');
                          }}
                          className="gap-1.5 text-xs font-bold py-1 px-3 rounded-xl h-8"
                        >
                          <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                          <span>افزودن عضو</span>
                        </Button>
                      )}
                    </div>

                    {team.members.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-center text-xs font-bold text-gray-400 bg-gray-50/50 dark:bg-[#1C2536]/30">
                        هنوز عضوی به این تیم اضافه نشده است.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {team.members.map((member) => (
                          <div
                            key={member.id}
                            className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-[#1C2536]/60 flex items-center justify-between shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg border border-primary/20 bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                {member.name.slice(0, 1)}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-ink-darker dark:text-white">
                                  {member.name}
                                </div>
                                <div className="text-xs font-medium text-gray-400">
                                  <span>نقش: {member.roleInTeam}</span>
                                </div>
                              </div>
                            </div>

                            {/* Remove button if permitted */}
                            {canEditTeam && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(idea.id, member.id, member.name)}
                                className="p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="حذف از ترکیب تیم"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Manager Final Approval Control */}
                {isManager && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-3">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      کنترل ادمین: تایید ترکیب تیم
                    </div>
                    <Button
                      onClick={() => handleToggleAdminApproval(idea.id)}
                      variant={team.isApprovedByAdmin ? 'outline' : 'primary'}
                      className={`gap-2 text-xs font-bold rounded-xl h-9 px-4 ${
                        team.isApprovedByAdmin ? 'text-rose-500 hover:bg-rose-50 border-rose-300 dark:border-rose-800' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      }`}
                    >
                      {team.isApprovedByAdmin ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>لغو تایید نهایی راهبر</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تایید نهایی و قفل ترکیب تیم</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD MEMBER TO TEAM WITH SEARCH & REAL-TIME STATE */}
      {activeIdeaIdForModal && (() => {
        const targetIdea = ideas.find((i) => i.id === activeIdeaIdForModal);
        if (!targetIdea) return null;

        const currentTeam = getIdeaTeam(targetIdea);
        const filteredStudents = dbStudents.filter((std) => {
          const q = searchStudentQuery.trim().toLowerCase();
          if (!q) return true;
          return std.name.toLowerCase().includes(q);
        });

        return (
          <Modal
            isOpen={!!activeIdeaIdForModal}
            onClose={() => {
              setActiveIdeaIdForModal(null);
              setIsRoleDropdownOpen(false);
            }}
            title={`افزودن عضو به تیم «${targetIdea.title}»`}
          >
            <div className="space-y-4 pt-1">
              {/* Role & Search Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-gray-50/70 dark:bg-[#1C2536]/40 shadow-2xs">
                {/* Role Dropdown */}
                <div ref={roleDropdownRef} className="relative">
                  <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    <span>نقش عضو انتخابی:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
                    className="w-full h-10 flex items-center justify-between px-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white text-xs font-bold focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs cursor-pointer select-none hover:border-gray-300 dark:hover:border-gray-600"
                  >
                    <span className="truncate">{memberRole}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                        isRoleDropdownOpen ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </button>

                  {isRoleDropdownOpen && (
                    <div className="absolute top-full right-0 left-0 mt-1.5 z-50 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-[#151C28] shadow-xl dark:shadow-[0_12px_28px_rgba(0,0,0,0.6)] p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                      {TEAM_ROLES.map((role) => {
                        const isSelected = memberRole === role;
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setMemberRole(role);
                              setIsRoleDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                              isSelected
                                ? 'bg-primary/10 text-primary font-black shadow-2xs'
                                : 'text-ink-darker dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-[#1C2536] hover:text-primary'
                            }`}
                          >
                            <span>{role}</span>
                            {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Search Input */}
                <div>
                  <label className="block text-xs font-bold text-ink-darker dark:text-white mb-1.5 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-primary" />
                    <span>جستجوی دانش‌آموز:</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="نام دانش‌آموز..."
                      value={searchStudentQuery}
                      onChange={(e) => setSearchStudentQuery(e.target.value)}
                      className="w-full h-10 pr-9 pl-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                    />
                    {searchStudentQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchStudentQuery('')}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md"
                        title="پاک کردن جستجو"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Students Cards List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-ink-darker dark:text-white px-0.5">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>لیست دانش‌آموزان</span>
                  </span>
                  <span className="text-[11px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                    {toPersianDigits(filteredStudents.length)} نفر
                  </span>
                </div>

                <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-2 pr-1 pl-0.5">
                  {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center text-xs font-medium text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/40 dark:bg-[#1C2536]/20 space-y-1.5">
                      <Search className="w-6 h-6 mx-auto text-gray-300 dark:text-gray-600" />
                      <p>دانش‌آموزی با این مشخصات یافت نشد.</p>
                    </div>
                  ) : (
                    filteredStudents.map((std) => {
                      const isMemberOfThisTeam = currentTeam.members.some(
                        (m) => m.id === std.id || m.name.toLowerCase() === std.name.toLowerCase()
                      );
                      const assignment = assignedStudentMap[std.id] || assignedStudentMap[std.name.toLowerCase()];
                      const isAssignedToOtherTeam = !!assignment && assignment.ideaId !== targetIdea.id;

                      return (
                        <div
                          key={std.id}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-150 ${
                            isMemberOfThisTeam
                              ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20'
                              : isAssignedToOtherTeam
                              ? 'border-gray-200/60 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 opacity-60'
                              : 'border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#151C28] shadow-2xs hover:shadow-xs hover:border-primary/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black text-xs shrink-0 shadow-2xs transition-colors ${
                              isMemberOfThisTeam
                                ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : isAssignedToOtherTeam
                                ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400'
                                : 'border-primary/20 bg-primary/10 text-primary dark:bg-primary/20'
                            }`}>
                              {isMemberOfThisTeam ? (
                                <UserCheck className="w-4 h-4" />
                              ) : (
                                <span>{std.name.trim().slice(0, 1)}</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h5 className="text-xs sm:text-sm font-bold text-ink-darker dark:text-white truncate">
                                {std.name}
                              </h5>
                              {isMemberOfThisTeam && (
                                <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>به ترکیب تیم افزوده شده است</span>
                                </p>
                              )}
                              {isAssignedToOtherTeam && (
                                <p className="text-[10px] font-medium text-rose-500 dark:text-rose-400 mt-0.5 truncate">
                                  عضو تیم ایده #{toPersianDigits(assignment.ideaNumber)} ({assignment.ideaTitle})
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 mr-2">
                            {isMemberOfThisTeam ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-2xs">
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>افزوده شد</span>
                              </span>
                            ) : isAssignedToOtherTeam ? (
                              <span className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/80 text-gray-400 dark:text-gray-500 text-xs font-bold">
                                غیرقابل انتخاب
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddMemberDirectly(targetIdea, std)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary text-primary hover:text-white dark:bg-primary/20 dark:hover:bg-primary dark:hover:text-white text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>افزودن</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Manual Name Entry Section (Admin Only) */}
              {isManager && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                  <label className="block text-xs font-bold text-ink-darker dark:text-white flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    <span>افزودن دستی نام دانش‌آموز:</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="نام و نام خانوادگی دانش‌آموز..."
                      value={customStudentName}
                      onChange={(e) => setCustomStudentName(e.target.value)}
                      className="flex-1 px-3.5 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                    />
                    <Button
                      variant="outline"
                      disabled={!customStudentName.trim()}
                      onClick={() => handleAddMember(targetIdea)}
                      className="text-xs font-bold px-4 h-10 rounded-xl shrink-0"
                    >
                      + افزودن دستی
                    </Button>
                  </div>
                </div>
              )}

              {/* Modal Action Footer */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end">
                <Button
                  variant="primary"
                  onClick={() => setActiveIdeaIdForModal(null)}
                  className="text-xs font-bold px-8 h-10 rounded-xl"
                >
                  تأیید
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ================= MODAL: CHANGE TEAM LEADER (ADMIN) ================= */}
      <Modal
        isOpen={isChangeLeaderModalOpen}
        onClose={() => {
          setIsChangeLeaderModalOpen(false);
          setActiveIdeaForLeaderChange(null);
        }}
        title={`تغییر سرگروه تیم «${activeIdeaForLeaderChange?.title || ''}»`}
      >
        {activeIdeaForLeaderChange && (() => {
          const currentTeam = getIdeaTeam(activeIdeaForLeaderChange);
          const filteredStudents = dbStudents.filter((std) =>
            std.name.toLowerCase().includes(leaderSearchQuery.trim().toLowerCase())
          );

          return (
            <form onSubmit={handleSaveLeaderChange} className="space-y-4 pt-1">
              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-black flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-600" />
                  <span>سرگروه فعلی: {currentTeam.leaderName || activeIdeaForLeaderChange.authorName}</span>
                </div>
                <p className="text-[11px] opacity-80">
                  با تغییر سرگروه، دسترسی‌های مدیریت این تیم در پنل دانش‌آموزی به سرگروه جدید منتقل خواهد شد.
                </p>
              </div>

              {/* Quick Select From Current Team Members */}
              {currentTeam.members.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-black text-ink-darker dark:text-white">
                    انتخاب از میان اعضای فعلی تیم:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {currentTeam.members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedNewLeaderName(m.name);
                          setCustomNewLeaderInput('');
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          selectedNewLeaderName === m.name && !customNewLeaderInput
                            ? 'border-primary bg-primary text-white shadow-2xs'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-ink-darker dark:text-white hover:border-primary/40'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>{m.name}</span>
                        <span className="text-[10px] opacity-70">({m.roleInTeam})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Select from DB Students */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-ink-darker dark:text-white">
                  یا جستجو و انتخاب دانش‌آموز دیگر از سامانه:
                </label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="جستجوی نام دانش‌آموز..."
                    value={leaderSearchQuery}
                    onChange={(e) => setLeaderSearchQuery(e.target.value)}
                    className="w-full pr-9 pl-3.5 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-medium text-ink-darker dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-xl p-1.5 space-y-1 bg-gray-50/50 dark:bg-[#1C2536]/30">
                  {filteredStudents.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400">دانش‌آموزی یافت نشد.</div>
                  ) : (
                    filteredStudents.map((std) => {
                      const isSelected = selectedNewLeaderName === std.name && !customNewLeaderInput;
                      return (
                        <button
                          key={std.id}
                          type="button"
                          onClick={() => {
                            setSelectedNewLeaderName(std.name);
                            setCustomNewLeaderInput('');
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all text-right cursor-pointer ${
                            isSelected
                              ? 'bg-primary/15 text-primary border border-primary/30'
                              : 'text-ink-darker dark:text-white hover:bg-gray-100 dark:hover:bg-[#151C28]'
                          }`}
                        >
                          <span>{std.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Manual Custom Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-ink-darker dark:text-white">
                  یا ورود دستی نام سرگروه جدید:
                </label>
                <input
                  type="text"
                  placeholder="نام و نام خانوادگی سرگروه جدید..."
                  value={customNewLeaderInput}
                  onChange={(e) => {
                    setCustomNewLeaderInput(e.target.value);
                    if (e.target.value) setSelectedNewLeaderName('');
                  }}
                  className="w-full px-3.5 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-medium text-ink-darker dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-2xs"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsChangeLeaderModalOpen(false);
                    setActiveIdeaForLeaderChange(null);
                  }}
                  className="text-xs font-bold"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs font-black gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>ثبت و تغییر سرگروه</span>
                </Button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* ================= MODAL: ADD TEAM (ADMIN) ================= */}
      <Modal
        isOpen={isAddTeamModalOpen}
        onClose={() => setIsAddTeamModalOpen(false)}
        title="افزودن و فعال‌سازی تیم جدید (ادمین)"
      >
        <div className="space-y-4 pt-1">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#1C2536] border border-gray-200/60 dark:border-gray-700/60">
            <button
              type="button"
              onClick={() => setAddTeamTab('EXISTING')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                addTeamTab === 'EXISTING'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs border border-primary/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              انتخاب از ایده‌های ثبت‌شده
            </button>
            <button
              type="button"
              onClick={() => setAddTeamTab('NEW')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                addTeamTab === 'NEW'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs border border-primary/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              ایجاد ایده و تیم جدید
            </button>
          </div>

          {addTeamTab === 'EXISTING' ? (
            /* Tab 1: Pick from existing ideas */
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                یکی از ایده‌های ثبت‌شده در رویداد را انتخاب نمایید تا به‌عنوان تیم فعال به این بخش اضافه گردد:
              </p>

              <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-800 rounded-xl p-2 bg-gray-50/50 dark:bg-[#1C2536]/30">
                {ideas.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">ایده‌ای در رویداد ثبت نشده است.</div>
                ) : (
                  ideas.map((idea) => {
                    const isAlreadyTeam = winningIdeas.some((w) => w.id === idea.id);
                    const isSelected = selectedExistingIdeaId === idea.id;

                    return (
                      <div
                        key={idea.id}
                        onClick={() => {
                          if (!isAlreadyTeam) setSelectedExistingIdeaId(idea.id);
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isAlreadyTeam
                            ? 'border-gray-200/60 dark:border-gray-800 bg-gray-100/60 dark:bg-gray-800/40 opacity-60'
                            : isSelected
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/30 cursor-pointer'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] hover:border-primary/40 cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                              ایده #{toPersianDigits(idea.ideaNumber || 1)}
                            </span>
                            <span className="text-xs font-bold text-ink-darker dark:text-white truncate">
                              {idea.title}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            سرگروه / صاحب ایده: {idea.authorName}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isAlreadyTeam ? (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>تیم فعال</span>
                            </span>
                          ) : isSelected ? (
                            <span className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-bold">
                              انتخاب شد
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-primary">انتخاب</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddTeamModalOpen(false)}
                  className="text-xs font-bold"
                >
                  انصراف
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!selectedExistingIdeaId}
                  onClick={handleAddExistingIdeaAsTeam}
                  className="text-xs font-black"
                >
                  افزودن ایده انتخابی به تیم‌ها
                </Button>
              </div>
            </div>
          ) : (
            /* Tab 2: Create Brand New Team and Idea */
            <form onSubmit={handleCreateBrandNewTeam} className="space-y-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-ink-darker dark:text-white mb-1">
                    شماره ایده:
                  </label>
                  <input
                    type="number"
                    value={newTeamIdeaNumber}
                    onChange={(e) => setNewTeamIdeaNumber(Number(e.target.value))}
                    className="w-full px-3.5 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-medium text-ink-darker dark:text-white focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-ink-darker dark:text-white mb-1">
                    عنوان ایده و تیم:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="عنوان تیم یا پروژه..."
                    value={newTeamTitle}
                    onChange={(e) => setNewTeamTitle(e.target.value)}
                    className="w-full px-3.5 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-medium text-ink-darker dark:text-white focus:border-primary outline-none"
                  />
                </div>
              </div>

              {/* Select Leader */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-ink-darker dark:text-white">
                  سرگروه تیم (انتخاب از لیست دانش‌آموزان):
                </label>
                <select
                  value={newTeamLeaderStudentId}
                  onChange={(e) => {
                    setNewTeamLeaderStudentId(e.target.value);
                    if (e.target.value) setNewTeamLeaderCustomName('');
                  }}
                  className="w-full px-3.5 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-medium text-ink-darker dark:text-white focus:border-primary outline-none"
                >
                  <option value="">انتخاب از لیست دانش‌آموزان...</option>
                  {dbStudents.map((std) => (
                    <option key={std.id} value={std.id}>
                      {std.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Or manual leader name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-ink-darker dark:text-white">
                  یا ورود دستی نام سرگروه:
                </label>
                <input
                  type="text"
                  placeholder="نام و نام خانوادگی سرگروه..."
                  value={newTeamLeaderCustomName}
                  onChange={(e) => {
                    setNewTeamLeaderCustomName(e.target.value);
                    if (e.target.value) setNewTeamLeaderStudentId('');
                  }}
                  className="w-full px-3.5 h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-medium text-ink-darker dark:text-white focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-ink-darker dark:text-white mb-1">
                  شرح و توضیحات ایده:
                </label>
                <textarea
                  rows={3}
                  placeholder="توضیحات کوتاه درباره ایده و تیم..."
                  value={newTeamDescription}
                  onChange={(e) => setNewTeamDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#151C28] text-xs font-medium text-ink-darker dark:text-white focus:border-primary outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddTeamModalOpen(false)}
                  className="text-xs font-bold"
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="text-xs font-black"
                >
                  ایجاد و ثبت تیم
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
