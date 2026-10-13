import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../../../lib/api/client';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
import { MobileDataTable, ColumnDef } from '../../../components/ui/MobileDataTable';
import {
  Users,
  GraduationCap,
  Briefcase,
  Plus,
  Search,
  UserPlus,
  Shield,
  AlertCircle,
  BookOpen,
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  UserCheck,
  Eye,
  Phone,
  MapPin,
  Home,
  HeartPulse,
  CreditCard,
  FileText,
  Calendar,
  Edit3,
  Save,
  KeyRound,
  Trash2,
  Lock,
  Filter,
} from 'lucide-react';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import { useTenantStore } from '../../../lib/auth/tenant-store';
import { toPersianDigits, formatToJalali } from '../../../lib/utils';
import { PasswordRevealModal, TargetMember } from '../vault/PasswordRevealModal';
import { toast } from '../../../components/ui/toast/toast';

import { read, utils, writeFile } from 'xlsx';
import jalaali from 'jalaali-js';

export const MembersPage: React.FC = () => {
  const { currentTenant } = useTenantStore();
  const branchPrefix = (() => {
    const slug = (currentTenant?.slug || '').toLowerCase();
    const theme = (currentTenant?.theme || '').toUpperCase();
    if (slug.includes('girl') || theme === 'FEMALE') return 'g';
    if (slug.includes('college') || theme === 'COLLEGE') return 'c';
    return 'b';
  })();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: 'STUDENTS' | 'TEACHERS' =
    tabParam === 'staff' || tabParam === 'teachers' || tabParam === 'kader'
      ? 'TEACHERS'
      : 'STUDENTS';

  useEffect(() => {
    setSearch('');
    setSelectedGrade('ALL');
    setIsFilterOpen(false);
  }, [activeTab]);

  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const getStudentGradeLevel = (student: any, allClassrooms: any[] = []): string => {
    if (!student) return 'دهم';

    const currentClassroomId =
      student.enrollments?.[0]?.classroomId ||
      student.enrollments?.[0]?.classroom?.id ||
      student.classroomId ||
      student.classroom?.id;

    const currentClassroom =
      allClassrooms.find((c) => c.id === currentClassroomId) ||
      student.enrollments?.[0]?.classroom ||
      student.classroom;

    const levelName = currentClassroom?.level?.name || '';
    if (levelName) {
      const clean = levelName.replace('پایه', '').trim();
      if (clean.includes('یازدهم')) return 'یازدهم';
      if (clean.includes('دوازدهم')) return 'دوازدهم';
      if (clean.includes('دهم')) return 'دهم';
      if (clean === '10' || clean === '۱۰') return 'دهم';
      if (clean === '11' || clean === '۱۱') return 'یازدهم';
      if (clean === '12' || clean === '۱۲') return 'دوازدهم';
      if (clean) return clean;
    }

    const className = currentClassroom?.name || '';
    if (className) {
      const clean = className.trim();
      if (clean.includes('یازدهم')) return 'یازدهم';
      if (clean.includes('دوازدهم')) return 'دوازدهم';
      if (clean.includes('دهم')) return 'دهم';

      const engDigits = clean.replace(/[۰-۹]/g, (d: string) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
      const match = engDigits.match(/\b(1\d{2}|2\d{2}|3\d{2})\b/) || engDigits.match(/(1\d{2}|2\d{2}|3\d{2})/);
      if (match) {
        const code = parseInt(match[1], 10);
        if (code >= 100 && code < 200) return 'دهم';
        if (code >= 200 && code < 300) return 'یازدهم';
        if (code >= 300 && code < 400) return 'دوازدهم';
      }
    }

    const rawGrade = student.gradeLevel || '';
    if (rawGrade) {
      const clean = String(rawGrade).replace('پایه', '').trim();
      if (clean.includes('یازدهم')) return 'یازدهم';
      if (clean.includes('دوازدهم')) return 'دوازدهم';
      if (clean.includes('دهم')) return 'دهم';
      if (clean === '10' || clean === '۱۰') return 'دهم';
      if (clean === '11' || clean === '۱۱') return 'یازدهم';
      if (clean === '12' || clean === '۱۲') return 'دوازدهم';
      if (clean) return clean;
    }

    return 'دهم';
  };

  const availableGrades = useMemo(() => {
    const gradesSet = new Set<string>();
    classrooms.forEach((c) => {
      const name = c.level?.name || '';
      const clean = name.replace('پایه', '').trim();
      if (clean) gradesSet.add(clean);
      const cName = c.name || '';
      if (cName.includes('دهم') || /1\d{2}/.test(cName)) gradesSet.add('دهم');
      if (cName.includes('یازدهم') || /2\d{2}/.test(cName)) gradesSet.add('یازدهم');
      if (cName.includes('دوازدهم') || /3\d{2}/.test(cName)) gradesSet.add('دوازدهم');
    });
    students.forEach((s) => {
      const g = getStudentGradeLevel(s, classrooms);
      if (g) gradesSet.add(g);
    });
    if (gradesSet.size === 0) {
      return ['دهم', 'یازدهم', 'دوازدهم'];
    }
    const order = ['دهم', 'یازدهم', 'دوازدهم'];
    const arr = Array.from(gradesSet);
    arr.sort((a, b) => {
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return arr;
  }, [classrooms, students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedGrade !== 'ALL') {
        const studentGrade = getStudentGradeLevel(s, classrooms);
        if (studentGrade !== selectedGrade) {
          return false;
        }
      }
      if (!search.trim()) return true;
      const query = search.trim().toLowerCase();
      const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
      const nationalCode = (s.nationalCode || '').toLowerCase();
      const studentNumber = (s.studentNumber || s.studentCode || '').toLowerCase();
      const currentClassroomId =
        s.enrollments?.[0]?.classroomId ||
        s.enrollments?.[0]?.classroom?.id ||
        s.classroomId ||
        s.classroom?.id;
      const currentClassroom =
        classrooms.find((c) => c.id === currentClassroomId) ||
        s.enrollments?.[0]?.classroom ||
        s.classroom;
      const classroom = (currentClassroom?.name || '').toLowerCase();
      const phone = (s.user?.phone || s.studentMobile || s.fatherPhone || '').toLowerCase();
      const father = (s.fatherName || s.fatherFullName || '').toLowerCase();
      const mother = (s.motherFullName || '').toLowerCase();
      return (
        fullName.includes(query) ||
        nationalCode.includes(query) ||
        studentNumber.includes(query) ||
        classroom.includes(query) ||
        phone.includes(query) ||
        father.includes(query) ||
        mother.includes(query)
      );
    });
  }, [students, classrooms, search, selectedGrade]);

  const filteredTeachers = useMemo(() => {
    if (!search.trim()) return teachers;
    const query = search.trim().toLowerCase();
    return teachers.filter((t) => {
      const fullName = `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.toLowerCase();
      const specialization = (t.specialization || '').toLowerCase();
      const personnelCode = (t.personnelCode || '').toLowerCase();
      const phone = (t.user?.phone || '').toLowerCase();
      const lessonsStr = (t.teacherLessons?.map((tl: any) => tl.lesson?.name).join(' ') || '').toLowerCase();
      return (
        fullName.includes(query) ||
        specialization.includes(query) ||
        personnelCode.includes(query) ||
        phone.includes(query) ||
        lessonsStr.includes(query)
      );
    });
  }, [teachers, search]);

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentModalTab, setStudentModalTab] = useState<'IDENTITY' | 'FATHER' | 'MOTHER' | 'CONTACT'>('IDENTITY');

  // Dossier Modal
  const [selectedStudentDossier, setSelectedStudentDossier] = useState<any | null>(null);
  const [dossierTab, setDossierTab] = useState<'IDENTITY' | 'FATHER' | 'MOTHER' | 'CONTACT'>('IDENTITY');
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [dossierEditForm, setDossierEditForm] = useState<any>({});
  const [vaultTarget, setVaultTarget] = useState<TargetMember | null>(null);

  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isEditLessonsModalOpen, setIsEditLessonsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [editingLessonIds, setEditingLessonIds] = useState<string[]>([]);

  // Teacher Full Edit & Delete States
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = useState(false);
  const [teacherEditTab, setTeacherEditTab] = useState<'INFO' | 'JOB' | 'CONTACT' | 'SECURITY' | 'LESSONS'>('INFO');
  const [teacherEditForm, setTeacherEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    username: '',
    nationalCode: '',
    personnelCode: '',
    degree: '',
    studyField: '',
    employmentType: 'FULL_TIME',
    homeAddress: '',
    landlinePhone: '',
    email: '',
    password: '',
    status: 'ACTIVE',
    lessonIds: [] as string[],
  });
  const [isDeleteTeacherModalOpen, setIsDeleteTeacherModalOpen] = useState(false);
  const [deletingTeacher, setDeletingTeacher] = useState<any | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  // Student Delete States
  const [isDeleteStudentModalOpen, setIsDeleteStudentModalOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<any | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Excel Bulk Import States
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [excelResult, setExcelResult] = useState<{
    total: number;
    success: number;
    created?: number;
    updated?: number;
    failed: number;
    errors?: string[];
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Forms
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatJalaliForExcel = (dateVal: any): string => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const j = jalaali.toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
    } catch {
      return '';
    }
  };

  const handleExportStudentsExcel = () => {
    if (!students || students.length === 0) {
      toast.error('هیچ دانش‌آموزی برای خروجی اکسل یافت نشد.');
      return;
    }

    const exportData = students.map((student) => {
      const currentClassroomId =
        student.enrollments?.[0]?.classroomId ||
        student.enrollments?.[0]?.classroom?.id ||
        '';
      const currentClassroom =
        classrooms.find((c) => c.id === currentClassroomId) ||
        student.enrollments?.[0]?.classroom;
      const currentGradeLevel = getStudentGradeLevel(student, classrooms);

      return {
        'کد ملی:': student.nationalCode || student.studentCode || '',
        'نام:': student.user?.firstName || '',
        'نام خانوادگی:': student.user?.lastName || '',
        'شماره کلاس:': currentClassroom?.name || '',
        'پایه تحصیلی:': currentGradeLevel || '',
        'شماره همراه دانش‌آموز:': student.studentMobile || student.user?.phone || '',
        'نام پدر:': student.fatherName || '',
        'تاریخ تولد:': formatJalaliForExcel(student.birthDate),
        'محل تولد:': student.birthPlace || '',
        'سریال شناسنامه:': student.certificateNumber || '',
        'سری حرفی:': student.certificateSeriesLetter || '',
        'سری عددی:': student.certificateSeriesNumber || '',
        'محل صدور:': student.issuePlace || '',
        'وضعیت جسمانی:': student.physicalCondition || student.medicalNotes || 'سالم',
        'نام و نام‌خانوادگی پدر:': student.fatherFullName || '',
        'کد ملی پدر:': student.fatherNationalId || '',
        'تحصیلات پدر:': student.fatherEducation || '',
        'شغل پدر:': student.fatherOccupation || '',
        'شماره همراه پدر:': student.fatherPhone || '',
        'آدرس محل کار پدر:': student.fatherWorkAddress || '',
        'نام و نام‌خانوادگی مادر:': student.motherFullName || '',
        'کد ملی مادر:': student.motherNationalId || '',
        'تحصیلات مادر:': student.motherEducation || '',
        'شغل مادر:': student.motherOccupation || '',
        'شماره همراه مادر:': student.motherPhone || '',
        'آدرس محل کار مادر:': student.motherWorkAddress || '',
        'آدرس منزل:': student.homeAddress || student.address || '',
        'شماره ثابت:': student.landlinePhone || '',
        'عکس پرسنلی:': student.user?.avatarUrl || '',
      };
    });

    const ws = utils.json_to_sheet(exportData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'دانش‌آموزان');
    const now = new Date();
    const jNow = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const dateStr = `${jNow.jy}${String(jNow.jm).padStart(2, '0')}${String(jNow.jd).padStart(2, '0')}`;
    writeFile(wb, `لیست_دانش‌آموزان_${dateStr}.xlsx`);
    toast.success(`خروجی اکسل با موفقیت برای ${toPersianDigits(students.length)} دانش‌آموز ایجاد شد.`);
  };

  const handleDownloadExcelSample = () => {
    // نمونه فایل ۲۸ ستونی استاندارد منطبق بر SAMPLE.xlsx با ۲ سطر نمونه
    const sampleData = [
      {
        'نام:': 'امیرعلی',
        'نام خانوادگی:': 'صادقی',
        'نام پدر:': 'رضا',
        'پایه تحصیلی:': 'دهم',
        'شماره کلاس:': '۱۰۱',
        'تاریخ تولد:': '1388/05/12',
        'محل تولد:': 'مشهد',
        'کد ملی:': '0921234567',
        'سریال شناسنامه:': '123456',
        'سری حرفی:': 'الف',
        'سری عددی:': '12',
        'محل صدور:': 'مشهد',
        'وضعیت جسمانی:': 'سالم',
        'نام و نام‌خانوادگی پدر:': 'رضا صادقی',
        'کد ملی پدر:': '0931234567',
        'تحصیلات پدر:': 'کارشناسی ارشد',
        'شغل پدر:': 'مهندس برق',
        'نام و نام‌خانوادگی مادر:': 'فاطمه حسینی',
        'کد ملی مادر:': '0941234567',
        'تحصیلات مادر:': 'کارشناسی',
        'شغل مادر:': 'معلم',
        'آدرس منزل:': 'مشهد، بلوار سجاد، خیابان بهار، پلاک ۱۲',
        'شماره ثابت:': '05137654321',
        'شماره همراه پدر:': '09151112233',
        'شماره همراه مادر:': '09154445566',
        'آدرس محل کار پدر:': 'مشهد، شهرک صنعتی طوس، فاز ۲',
        'آدرس محل کار مادر:': 'مشهد، دبستان اندیشه',
        'شماره همراه دانش‌آموز:': '09351234567',
        'عکس پرسنلی:': '',
      },
      {
        'نام:': 'سارا',
        'نام خانوادگی:': 'محمدی',
        'نام پدر:': 'علی',
        'پایه تحصیلی:': 'یازدهم',
        'شماره کلاس:': '۲۰۲',
        'تاریخ تولد:': '1387/08/25',
        'محل تولد:': 'تهران',
        'کد ملی:': '0012345678',
        'سریال شناسنامه:': '654321',
        'سری حرفی:': 'ب',
        'سری عددی:': '34',
        'محل صدور:': 'تهران',
        'وضعیت جسمانی:': 'سالم',
        'نام و نام‌خانوادگی پدر:': 'علی محمدی',
        'کد ملی پدر:': '0023456789',
        'تحصیلات پدر:': 'دکتری',
        'شغل پدر:': 'استاد دانشگاه',
        'نام و نام‌خانوادگی مادر:': 'مریم کریمی',
        'کد ملی مادر:': '0034567890',
        'تحصیلات مادر:': 'کارشناسی ارشد',
        'شغل مادر:': 'پزشک',
        'آدرس منزل:': 'تهران، سعادت‌آباد، خیابان سرو غربی، پلاک ۲۴',
        'شماره ثابت:': '02122334455',
        'شماره همراه پدر:': '09121112233',
        'شماره همراه مادر:': '09124445566',
        'آدرس محل کار پدر:': 'تهران، دانشگاه علم و صنعت',
        'آدرس محل کار مادر:': 'تهران، بیمارستان میلاد',
        'شماره همراه دانش‌آموز:': '09191234567',
        'عکس پرسنلی:': '',
      },
    ];
    const ws = utils.json_to_sheet(sampleData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'دانش‌آموزان');
    writeFile(wb, 'نمونه_استاندارد_ورود_دانش‌آموزان_رکاد.xlsx');
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      setExcelResult(null);
      const data = await file.arrayBuffer();
      const workbook = read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = utils.sheet_to_json(sheet);
      if (!rows || rows.length === 0) {
        setError('فایل اکسل انتخاب‌شده فاقد داده یا سطر است.');
        return;
      }
      setExcelFile(file);
      setExcelRows(rows);
    } catch (err: any) {
      setError('خطا در خواندن فایل اکسل: ' + (err.message || 'فایل نامعتبر است'));
    }
  };

  const handleSubmitExcel = async () => {
    if (!excelRows.length) {
      setError('لطفاً ابتدا یک فایل اکسل دارای اطلاعات انتخاب کنید.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await apiClient.post('/members/students/bulk-excel', { items: excelRows });
      setExcelResult(res.data);
      fetchData();
    } catch (err: any) {
      setError('خطا در ثبت اطلاعات: ' + (err.message || 'خطای غیرمنتظره'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialStudentFormState = {
    firstName: '',
    lastName: '',
    phone: '',
    nationalCode: '',
    studentNumber: '',
    classroomId: '',
    password: '',
    // 28 Fields from SAMPLE.xlsx
    fatherName: '',
    gradeLevel: 'دهم',
    birthDate: '',
    birthPlace: '',
    certificateNumber: '',
    certificateSeriesLetter: 'الف',
    certificateSeriesNumber: '',
    issuePlace: '',
    physicalCondition: 'سالم',
    // Father
    fatherFullName: '',
    fatherNationalId: '',
    fatherEducation: '',
    fatherOccupation: '',
    fatherPhone: '',
    fatherWorkAddress: '',
    // Mother
    motherFullName: '',
    motherNationalId: '',
    motherEducation: '',
    motherOccupation: '',
    motherPhone: '',
    motherWorkAddress: '',
    // Contact & Residence
    homeAddress: '',
    landlinePhone: '',
    studentMobile: '',
    avatarUrl: '',
  };

  const [studentForm, setStudentForm] = useState(initialStudentFormState);

  const [teacherForm, setTeacherForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    nationalCode: '',
    personnelCode: '',
    specialization: '',
    degree: '',
    studyField: '',
    landlinePhone: '',
    homeAddress: '',
    password: '',
    lessonIds: [] as string[],
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [studentsRes, teachersRes, classesRes, lessonsRes] = await Promise.all([
        apiClient.get('/members/students'),
        apiClient.get('/members/teachers'),
        apiClient.get('/classes/classrooms'),
        apiClient.get('/classes/lessons'),
      ]);
      setStudents(studentsRes.data || []);
      setTeachers(teachersRes.data || []);
      setClassrooms(classesRes.data || []);
      setLessons(lessonsRes.data || []);
      if (classesRes.data?.length > 0) {
        setStudentForm((prev) => ({ ...prev, classroomId: classesRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const derivedCode =
        studentForm.studentNumber.trim() ||
        studentForm.nationalCode.replace(/\D/g, '').replace(/^0+/, '') ||
        undefined;

      const payload = {
        firstName: studentForm.firstName.trim(),
        lastName: studentForm.lastName.trim(),
        phone: studentForm.studentMobile.trim() || studentForm.phone.trim() || studentForm.fatherPhone.trim() || studentForm.motherPhone.trim(),
        nationalCode: studentForm.nationalCode.trim() || undefined,
        studentCode: derivedCode,
        studentNumber: derivedCode,
        classroomId: studentForm.classroomId || undefined,
        password: studentForm.password || undefined,
        // 28 Fields from SAMPLE.xlsx
        fatherName: studentForm.fatherName.trim() || undefined,
        gradeLevel: studentForm.gradeLevel.trim() || undefined,
        birthDate: studentForm.birthDate.trim() || undefined,
        birthPlace: studentForm.birthPlace.trim() || undefined,
        certificateNumber: studentForm.certificateNumber.trim() || undefined,
        certificateSeriesLetter: studentForm.certificateSeriesLetter.trim() || undefined,
        certificateSeriesNumber: studentForm.certificateSeriesNumber.trim() || undefined,
        issuePlace: studentForm.issuePlace.trim() || undefined,
        physicalCondition: studentForm.physicalCondition.trim() || undefined,
        fatherFullName: studentForm.fatherFullName.trim() || undefined,
        fatherNationalId: studentForm.fatherNationalId.trim() || undefined,
        fatherEducation: studentForm.fatherEducation.trim() || undefined,
        fatherOccupation: studentForm.fatherOccupation.trim() || undefined,
        fatherPhone: studentForm.fatherPhone.trim() || undefined,
        fatherWorkAddress: studentForm.fatherWorkAddress.trim() || undefined,
        motherFullName: studentForm.motherFullName.trim() || undefined,
        motherNationalId: studentForm.motherNationalId.trim() || undefined,
        motherEducation: studentForm.motherEducation.trim() || undefined,
        motherOccupation: studentForm.motherOccupation.trim() || undefined,
        motherPhone: studentForm.motherPhone.trim() || undefined,
        motherWorkAddress: studentForm.motherWorkAddress.trim() || undefined,
        homeAddress: studentForm.homeAddress.trim() || undefined,
        landlinePhone: studentForm.landlinePhone.trim() || undefined,
        studentMobile: studentForm.studentMobile.trim() || undefined,
        avatarUrl: studentForm.avatarUrl.trim() || undefined,
      };

      await apiClient.post('/members/students', payload);
      setIsStudentModalOpen(false);
      setStudentForm(initialStudentFormState);
      fetchData();
    } catch (err: any) {
      setError(
        err.message ||
          (Array.isArray(err.message) ? err.message.join('، ') : 'خطا در ثبت‌نام دانش‌آموز.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDossier = (student: any) => {
    setSelectedStudentDossier(student);
    setDossierTab('IDENTITY');
    setIsEditingDossier(false);
    const currentClassroomId = student.enrollments?.[0]?.classroomId || student.enrollments?.[0]?.classroom?.id || '';
    const currentClassroom = classrooms.find((c) => c.id === currentClassroomId) || student.enrollments?.[0]?.classroom;
    const currentGradeLevel = student.gradeLevel || (currentClassroom?.level?.name ? (currentClassroom.level.name.includes('پایه') ? currentClassroom.level.name.replace('پایه', '').trim() : currentClassroom.level.name) : 'دهم');

    setDossierEditForm({
      firstName: student.user?.firstName || '',
      lastName: student.user?.lastName || '',
      phone: student.user?.phone || '',
      nationalCode: student.nationalCode || '',
      studentCode: student.studentCode || student.studentNumber || '',
      classroomId: currentClassroomId,
      gradeLevel: currentGradeLevel,
      fatherName: student.fatherName || '',
      birthDate: student.birthDate ? formatToJalali(student.birthDate) : '',
      birthPlace: student.birthPlace || '',
      certificateNumber: student.certificateNumber || '',
      certificateSeriesLetter: student.certificateSeriesLetter || 'الف',
      certificateSeriesNumber: student.certificateSeriesNumber || '',
      issuePlace: student.issuePlace || '',
      physicalCondition: student.physicalCondition || student.medicalNotes || 'سالم',
      fatherFullName: student.fatherFullName || '',
      fatherNationalId: student.fatherNationalId || '',
      fatherEducation: student.fatherEducation || '',
      fatherOccupation: student.fatherOccupation || '',
      fatherPhone: student.fatherPhone || '',
      fatherWorkAddress: student.fatherWorkAddress || '',
      motherFullName: student.motherFullName || '',
      motherNationalId: student.motherNationalId || '',
      motherEducation: student.motherEducation || '',
      motherOccupation: student.motherOccupation || '',
      motherPhone: student.motherPhone || '',
      motherWorkAddress: student.motherWorkAddress || '',
      homeAddress: student.homeAddress || student.address || '',
      landlinePhone: student.landlinePhone || '',
      studentMobile: student.studentMobile || student.user?.phone || '',
      avatarUrl: student.user?.avatarUrl || '',
    });
  };

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentDossier) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...dossierEditForm,
      };
      await apiClient.put(`/members/students/${selectedStudentDossier.id}`, payload);
      setIsEditingDossier(false);
      await fetchData();
      const updatedRes = await apiClient.get('/members/students');
      const found = (updatedRes.data || []).find((s: any) => s.id === selectedStudentDossier.id);
      if (found) setSelectedStudentDossier(found);
    } catch (err: any) {
      setError(err.message || 'خطا در به‌روزرسانی پرونده دانش‌آموز.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        firstName: teacherForm.firstName.trim(),
        lastName: teacherForm.lastName.trim(),
        phone: teacherForm.phone.trim(),
        nationalCode: teacherForm.nationalCode.trim() || undefined,
        personnelCode: teacherForm.personnelCode.trim() || undefined,
        specialization: teacherForm.specialization.trim() || undefined,
        speciality: teacherForm.specialization.trim() || undefined,
        degree: teacherForm.degree.trim() || undefined,
        studyField: teacherForm.studyField.trim() || undefined,
        landlinePhone: teacherForm.landlinePhone.trim() || undefined,
        homeAddress: teacherForm.homeAddress.trim() || undefined,
        password: teacherForm.password || undefined,
        lessonIds: teacherForm.lessonIds,
      };

      await apiClient.post('/members/teachers', payload);
      setIsTeacherModalOpen(false);
      setTeacherForm({
        firstName: '',
        lastName: '',
        phone: '',
        nationalCode: '',
        personnelCode: '',
        specialization: '',
        degree: '',
        studyField: '',
        landlinePhone: '',
        homeAddress: '',
        password: '',
        lessonIds: [],
      });
      fetchData();
    } catch (err: any) {
      setError(
        err.message ||
          (Array.isArray(err.message) ? err.message.join('، ') : 'خطا در ثبت مربی جدید.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditLessons = (teacher: any) => {
    setEditingTeacher(teacher);
    const currentLessonIds = teacher.teacherLessons?.map((tl: any) => tl.lessonId || tl.lesson?.id) || [];
    setEditingLessonIds(currentLessonIds);
    setIsEditLessonsModalOpen(true);
  };

  const handleSaveTeacherLessons = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.put(`/members/teachers/${editingTeacher.id}/lessons`, {
        lessonIds: editingLessonIds,
      });
      setIsEditLessonsModalOpen(false);
      setEditingTeacher(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره دروس مربی.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditTeacher = (teacher: any) => {
    setEditingTeacher(teacher);
    const assigned = teacher.teacherLessons?.map((tl: any) => tl.lessonId || tl.lesson?.id).filter(Boolean) || [];
    setTeacherEditForm({
      firstName: teacher.user?.firstName || '',
      lastName: teacher.user?.lastName || '',
      phone: teacher.user?.phone || '',
      username: teacher.user?.username || teacher.user?.phone || '',
      nationalCode: teacher.user?.nationalId || '',
      personnelCode: teacher.personnelCode || '',
      degree: teacher.degree || '',
      studyField: teacher.studyField || '',
      employmentType: teacher.employmentType || 'FULL_TIME',
      homeAddress: teacher.homeAddress || '',
      landlinePhone: teacher.landlinePhone || '',
      email: teacher.user?.email || '',
      password: '',
      status: teacher.user?.status || 'ACTIVE',
      lessonIds: assigned,
    });
    setTeacherEditTab('INFO');
    setError(null);
    setIsEditTeacherModalOpen(true);
  };

  const handleSaveEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        firstName: teacherEditForm.firstName.trim(),
        lastName: teacherEditForm.lastName.trim(),
        phone: teacherEditForm.phone.trim(),
        username: teacherEditForm.username.trim() || undefined,
        nationalCode: teacherEditForm.nationalCode.trim() || undefined,
        personnelCode: teacherEditForm.personnelCode.trim() || undefined,
        degree: teacherEditForm.degree.trim() || undefined,
        studyField: teacherEditForm.studyField.trim() || undefined,
        employmentType: teacherEditForm.employmentType,
        homeAddress: teacherEditForm.homeAddress.trim() || undefined,
        landlinePhone: teacherEditForm.landlinePhone.trim() || undefined,
        email: teacherEditForm.email.trim() || undefined,
        status: teacherEditForm.status,
        lessonIds: teacherEditForm.lessonIds,
      };
      if (teacherEditForm.password && teacherEditForm.password.trim()) {
        payload.password = teacherEditForm.password.trim();
      }

      await apiClient.put(`/members/teachers/${editingTeacher.id}`, payload);
      toast.success('اطلاعات مربی با موفقیت به‌روزرسانی شد');
      setIsEditTeacherModalOpen(false);
      setEditingTeacher(null);
      await fetchData();
    } catch (err: any) {
      setError(
        err.message ||
          (Array.isArray(err.message) ? err.message.join('، ') : 'خطا در به‌روزرسانی مشخصات مربی.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteTeacher = (teacher: any) => {
    setDeletingTeacher(teacher);
    setIsDeleteTeacherModalOpen(true);
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!deletingTeacher) return;
    setIsDeletingTeacher(true);
    try {
      await apiClient.delete(`/members/teachers/${deletingTeacher.id}`);
      toast.success(
        `مربی «${deletingTeacher.user?.firstName || ''} ${deletingTeacher.user?.lastName || ''}» با موفقیت از سیستم حذف شد`,
      );
      setIsDeleteTeacherModalOpen(false);
      setDeletingTeacher(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف مربی از کادر آموزشی');
    } finally {
      setIsDeletingTeacher(false);
    }
  };

  const handleOpenDeleteStudent = (student: any) => {
    setDeletingStudent(student);
    setIsDeleteStudentModalOpen(true);
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deletingStudent) return;
    setIsDeletingStudent(true);
    try {
      await apiClient.delete(`/members/students/${deletingStudent.id}`);
      toast.success(
        `دانش‌آموز «${deletingStudent.user?.firstName || ''} ${deletingStudent.user?.lastName || ''}» با موفقیت از سیستم حذف شد`,
      );
      setIsDeleteStudentModalOpen(false);
      setDeletingStudent(null);
      if (selectedStudentDossier && selectedStudentDossier.id === deletingStudent.id) {
        setSelectedStudentDossier(null);
        setIsEditingDossier(false);
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'خطا در حذف دانش‌آموز از سیستم');
    } finally {
      setIsDeletingStudent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      {activeTab === 'STUDENTS' ? (
        <ResponsivePageHeader
          icon={GraduationCap}
          title="دانش‌آموزان"
          actions={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* Primary Action Button (Full width on mobile) */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsStudentModalOpen(true)}
                className="w-full sm:w-auto px-4 sm:px-5 text-xs sm:text-sm justify-center font-black h-9.5 sm:h-9 shadow-sm order-1 sm:order-4"
              >
                <UserPlus className="h-4 w-4 ml-1.5 shrink-0" />
                <span>ثبت دانش‌آموز</span>
              </Button>

              {/* 3 Secondary Utility Buttons (3-column grid on mobile, horizontal flex on desktop) */}
              <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full sm:w-auto order-2 sm:order-1">
                <Link to="/app/admin/vault" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    className="w-full sm:w-auto text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold px-2 sm:px-3 text-[11px] sm:text-xs justify-center h-9"
                    title="گاوصندوق رمزها"
                  >
                    <KeyRound className="h-3.5 w-3.5 ml-1 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>رمزها</span>
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setIsExcelModalOpen(true);
                    setExcelResult(null);
                    setExcelFile(null);
                    setExcelRows([]);
                    setError(null);
                  }}
                  className="w-full sm:w-auto text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold px-2 sm:px-3 text-[11px] sm:text-xs justify-center h-9"
                  title="ورود گروهی اطلاعات با اکسل"
                >
                  <UploadCloud className="h-3.5 w-3.5 ml-1 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">ورود اکسل</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleExportStudentsExcel}
                  className="w-full sm:w-auto text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-bold px-2 sm:px-3 text-[11px] sm:text-xs justify-center h-9"
                  title="خروجی کامل اکسل از کلیه دانش‌آموزان"
                >
                  <Download className="h-3.5 w-3.5 ml-1 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">خروجی اکسل</span>
                </Button>
              </div>
            </div>
          }
        />
      ) : (
        <ResponsivePageHeader
          icon={Briefcase}
          title="کادر آموزشی"
          actions={
            <Button variant="primary" size="sm" onClick={() => setIsTeacherModalOpen(true)} className="w-full sm:w-auto justify-center font-bold">
              <Plus className="h-4 w-4 ml-1" />
              <span>ثبت کادر آموزشی</span>
            </Button>
          }
        />
      )}

      {/* Live Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Input
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'STUDENTS' ? 'جستجو در دانش‌آموزان...' : 'جستجو در کادر آموزشی...'}
              className="text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs p-1 cursor-pointer z-10"
                title="پاک کردن جستجو"
              >
                ✕
              </button>
            )}
          </div>

          {activeTab === 'STUDENTS' && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`h-[44px] w-[44px] rounded-xl border flex items-center justify-center transition-all shadow-2xs cursor-pointer ${
                  isFilterOpen || selectedGrade !== 'ALL'
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-ink-darker dark:hover:text-white'
                }`}
                title={isFilterOpen ? 'بستن فیلترها' : 'فیلتر بر اساس پایه'}
              >
                <Filter className="w-4 h-4" />
                {selectedGrade !== 'ALL' && !isFilterOpen && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-white dark:ring-[#151C28]" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Expandable Grade Filter Bar */}
        {activeTab === 'STUDENTS' && isFilterOpen && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedGrade('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border select-none ${
                  selectedGrade === 'ALL'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                همه ({toPersianDigits(students.length)})
              </button>
              {availableGrades.map((grade) => {
                const count = students.filter((s) => {
                  return getStudentGradeLevel(s, classrooms) === grade;
                }).length;
                const isSelected = selectedGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setSelectedGrade(isSelected ? 'ALL' : grade)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 select-none ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-white dark:bg-[#151C28] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span>{grade}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {toPersianDigits(count)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Students */}
      {activeTab === 'STUDENTS' && (
        <MobileDataTable
          data={filteredStudents}
          primaryField={(s) => (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-sm text-ink-dark">
                {s.user?.avatarUrl ? (
                  <img src={s.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  s.user?.firstName?.[0] || 'د'
                )}
              </div>
              <div className="space-y-1">
                <div className="font-black text-ink-darker dark:text-white text-sm">
                  {s.user?.firstName} {s.user?.lastName}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary-dark dark:text-primary-light border border-primary/20">
                    {getStudentGradeLevel(s, classrooms)}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-ink-normal dark:text-gray-200 border border-gray-200/80 dark:border-gray-700">
                    {s.enrollments?.[0]?.classroom?.name?.replace('کلاس', '').trim() || s.classroom?.name?.replace('کلاس', '').trim() || '—'}
                  </span>
                </div>
              </div>
            </div>
          )}
          cardActions={(s) => (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleOpenDossier(s)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-2xs border border-primary/20 cursor-pointer"
                title="مشاهده و ویرایش پرونده الکترونیکی"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>پرونده</span>
              </button>
              <button
                type="button"
                onClick={() => setVaultTarget(s)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-2xs border border-amber-500/20 cursor-pointer"
                title="مشاهده رمز عبور در گاوصندوق"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>رمز</span>
              </button>
            </div>
          )}
          columns={[
            {
              key: 'name',
              header: 'نام و نام خانوادگی',
              mobilePriority: 'hidden',
              render: (s) => (
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs text-ink-dark">
                    {s.user?.avatarUrl ? (
                      <img src={s.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      s.user?.firstName?.[0] || 'د'
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-ink-darker dark:text-white text-sm">
                      {s.user?.firstName} {s.user?.lastName}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span>پایه:</span>
                      <span className="font-bold text-primary">{getStudentGradeLevel(s, classrooms)}</span>
                      {s.fatherName && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span>فرزند: {s.fatherName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'classroom',
              header: 'کلاس درس',
              mobilePriority: 'hidden',
              render: (s) => (
                <span className="text-xs bg-primary/10 text-primary-dark dark:text-primary-light px-2.5 py-0.5 rounded-full font-bold">
                  {s.enrollments?.[0]?.classroom?.name || s.classroom?.name || 'کلاس عمومی'}
                </span>
              ),
            },
            {
              key: 'studentNumber',
              header: 'شماره دانش‌آموزی',
              mobilePriority: 'hidden',
              render: (s) => (
                <span className="font-mono text-xs font-bold text-ink-dark dark:text-gray-200">
                  {s.studentCode || s.studentNumber || '—'}
                </span>
              ),
            },
            {
              key: 'phone',
              header: 'شماره تماس',
              mobilePriority: 'secondary',
              render: (s) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400" dir="ltr">
                  {s.studentMobile || s.user?.phone || s.fatherPhone || '—'}
                </span>
              ),
            },
            {
              key: 'nationalCode',
              header: 'کد ملی',
              mobilePriority: 'secondary',
              render: (s) => <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{s.nationalCode || '—'}</span>,
            },
            {
              key: 'actions',
              header: 'عملیات',
              className: 'text-center',
              mobilePriority: 'hidden',
              render: (s) => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenDossier(s)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-2xs border border-primary/20 cursor-pointer"
                    title="مشاهده و ویرایش پرونده الکترونیکی"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>پرونده</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultTarget(s)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-2xs border border-amber-500/20 cursor-pointer"
                    title="مشاهده رمز عبور در گاوصندوق"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>رمز</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDeleteStudent(s)}
                    className="inline-flex items-center justify-center p-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-2xs border border-rose-500/20 cursor-pointer"
                    title="حذف دانش‌آموز"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
          emptyMessage="هنوز دانش‌آموزی ثبت‌نام نشده است."
        />
      )}

      {/* Tab 2: Teachers */}
      {activeTab === 'TEACHERS' && (
        <MobileDataTable
          data={filteredTeachers}
          primaryField={(t) => (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-sm text-ink-dark">
                {t.user?.avatarUrl ? (
                  <img src={t.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  t.user?.firstName?.[0] || 'د'
                )}
              </div>
              <div className="space-y-1">
                <div className="font-black text-ink-darker dark:text-white text-sm">
                  {t.user?.firstName} {t.user?.lastName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-gray-600 dark:text-gray-300">{t.degree || 'مربی'}</span>
                  {t.studyField && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span>رشته {t.studyField}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          cardActions={(t) => (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleOpenEditTeacher(t)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-2xs border border-blue-500/20 cursor-pointer"
                title="ویرایش کامل مشخصات مربی و دروس تدریسی"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ویرایش</span>
              </button>
              <button
                type="button"
                onClick={() => setVaultTarget(t)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-2xs border border-amber-500/20 cursor-pointer"
                title="مشاهده رمز عبور در گاوصندوق"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>رمز</span>
              </button>
            </div>
          )}
          columns={[
            {
              key: 'name',
              header: 'نام مربی / پرسنل',
              mobilePriority: 'hidden',
              render: (t) => (
                <div className="font-bold text-ink-darker text-sm">
                  {t.user?.firstName} {t.user?.lastName}
                </div>
              ),
            },
            {
              key: 'degreeAndField',
              header: 'مدرک و رشته',
              mobilePriority: 'secondary',
              render: (t) => {
                const parts = [t.degree, t.studyField].filter(Boolean);
                return (
                  <span className="text-xs text-gray-600 font-medium">
                    {parts.length > 0 ? parts.join(' - ') : '—'}
                  </span>
                );
              },
            },
            {
              key: 'personnelCode',
              header: 'کد پرسنلی',
              mobilePriority: 'secondary',
              render: (t) => <span className="font-mono text-xs font-bold">{t.personnelCode || '—'}</span>,
            },
            {
              key: 'lessons',
              header: 'دروس تخصیص‌یافته',
              mobilePriority: 'secondary',
              render: (t) => {
                const assignedLessons = t.teacherLessons?.map((tl: any) => tl.lesson) || [];
                if (assignedLessons.length === 0) {
                  return <span className="text-xs text-gray-400">بدون درس تخصیص‌یافته</span>;
                }
                return (
                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                    {assignedLessons.map((l: any) => (
                      <span
                        key={l.id}
                        className="inline-flex items-center gap-1 text-[11px] bg-primary/10 text-primary-dark font-bold px-2 py-0.5 rounded border border-primary/20"
                        title={`پایه ${l.level?.name || '—'} | رشته ${l.field?.name || 'عمومی'}`}
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        {l.name}
                        {l.level?.name && (
                          <span className="text-[9px] text-gray-500">({l.level.name})</span>
                        )}
                      </span>
                    ))}
                  </div>
                );
              },
            },
            {
              key: 'phone',
              header: 'شماره تماس',
              mobilePriority: 'detail',
              render: (t) => (
                <div className="text-xs flex items-center gap-2 flex-wrap justify-end">
                  <span className="font-mono text-gray-700 dark:text-gray-300 font-bold" dir="ltr">
                    {t.user?.phone || (t.user?.metadata as any)?.phone || '—'}
                  </span>
                  {t.landlinePhone && (
                    <span className="font-mono text-[10px] text-gray-500 bg-gray-200/70 dark:bg-gray-700 px-1.5 py-0.5 rounded" dir="ltr">ثابت: {t.landlinePhone}</span>
                  )}
                </div>
              ),
            },
            {
              key: 'contractStatus',
              header: 'وضعیت و نوع قرارداد',
              mobilePriority: 'detail',
              render: (t) => {
                const isSuspended = t.user?.status === 'SUSPENDED';
                const empTypeMap: Record<string, string> = {
                  FULL_TIME: 'تمام‌وقت',
                  PART_TIME: 'پاره‌وقت',
                  CONTRACT: 'قراردادی',
                  HOURLY: 'حق‌التدریس',
                };
                const empLabel = empTypeMap[t.employmentType] || 'مربی';
                return (
                  <div className="flex items-center gap-2 justify-end">
                    <Badge variant={isSuspended ? 'destructive' : 'male'} className="text-[10px] px-2 py-0.5">
                      {isSuspended ? 'حساب معلق' : 'مربی فعال'}
                    </Badge>
                    <span className="text-[11px] text-gray-600 dark:text-gray-300 font-bold">{empLabel}</span>
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: 'عملیات',
              className: 'text-center',
              mobilePriority: 'hidden',
              render: (t) => (
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditTeacher(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all shadow-2xs border border-blue-500/20 cursor-pointer"
                    title="ویرایش کامل مشخصات مربی"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>ویرایش</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditLessons(t)}
                    className="text-xs text-primary hover:text-primary-dark h-8 px-2"
                    title="ویرایش دروس تخصیص‌یافته"
                  >
                    <BookOpen className="h-3.5 w-3.5 ms-1" />
                    <span>دروس</span>
                  </Button>
                  <button
                    type="button"
                    onClick={() => setVaultTarget(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all shadow-2xs border border-amber-500/20 cursor-pointer"
                    title="مشاهده رمز عبور در گاوصندوق"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>رمز</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDeleteTeacher(t)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-2xs border border-red-500/20 cursor-pointer"
                    title="حذف مربی از کادر آموزشی"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>
              ),
            },
          ]}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyMessage="هنوز مربی‌ای ثبت نشده است."
        />
      )}

      {/* 1. Modal: Enroll Student */}
      <Modal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setError(null);
        }}
        title="ثبت‌نام دانش‌آموز جدید"
        description="ایجاد حساب کاربری، پرونده تحصیلی و انتساب به کلاس"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEnrollStudent} className="space-y-4">
        {/* Tab switcher inside Student Modal */}
        <div className="grid grid-cols-4 gap-1 p-1 mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-[11px] sm:text-xs font-bold">
          <button
            type="button"
            onClick={() => setStudentModalTab('IDENTITY')}
            className={`py-1.5 px-0.5 sm:px-2 rounded-lg transition-all text-center whitespace-nowrap ${
              studentModalTab === 'IDENTITY'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            اطلاعات پایه
          </button>
          <button
            type="button"
            onClick={() => setStudentModalTab('FATHER')}
            className={`py-1.5 px-0.5 sm:px-2 rounded-lg transition-all text-center whitespace-nowrap ${
              studentModalTab === 'FATHER'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            اطلاعات پدر
          </button>
          <button
            type="button"
            onClick={() => setStudentModalTab('MOTHER')}
            className={`py-1.5 px-0.5 sm:px-2 rounded-lg transition-all text-center whitespace-nowrap ${
              studentModalTab === 'MOTHER'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            اطلاعات مادر
          </button>
          <button
            type="button"
            onClick={() => setStudentModalTab('CONTACT')}
            className={`py-1.5 px-0.5 sm:px-2 rounded-lg transition-all text-center whitespace-nowrap ${
              studentModalTab === 'CONTACT'
                ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
            }`}
          >
            اطلاعات تماس
          </button>
        </div>

          {studentModalTab === 'IDENTITY' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="نام دانش‌آموز *"
                  placeholder="مثال: رضا"
                  value={studentForm.firstName}
                  onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })}
                  required
                />
                <Input
                  label="نام خانوادگی *"
                  placeholder="مثال: حسینی"
                  value={studentForm.lastName}
                  onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="نام پدر"
                  placeholder="مثال: علی"
                  value={studentForm.fatherName}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherName: e.target.value })}
                />
                <Select
                  label="پایه تحصیلی"
                  value={studentForm.gradeLevel}
                  onChange={(e) => setStudentForm({ ...studentForm, gradeLevel: e.target.value })}
                >
                  <option value="دهم">دهم</option>
                  <option value="یازدهم">یازدهم</option>
                  <option value="دوازدهم">دوازدهم</option>
                </Select>
                <Select
                  label="کلاس درس"
                  value={studentForm.classroomId}
                  onChange={(e) => setStudentForm({ ...studentForm, classroomId: e.target.value })}
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="کد ملی (نام کاربری سامانه ورود یکپارچه) *"
                  placeholder="مثال: 0012345678"
                  value={studentForm.nationalCode}
                  onChange={(e) => {
                    const nat = e.target.value;
                    const derived = nat.replace(/\D/g, '').replace(/^0+/, '');
                    setStudentForm((prev) => ({
                      ...prev,
                      nationalCode: nat,
                      studentNumber: derived,
                    }));
                  }}
                  required
                />
                <Input
                  label="شماره دانش‌آموزی (کد ملی بدون صفر)"
                  placeholder="مثال: 12345678"
                  value={studentForm.studentNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, studentNumber: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="تاریخ تولد (شمسی)"
                  placeholder="مثال: 1388/05/12"
                  value={studentForm.birthDate}
                  onChange={(e) => setStudentForm({ ...studentForm, birthDate: e.target.value })}
                />
                <Input
                  label="محل تولد"
                  placeholder="مثال: مشهد"
                  value={studentForm.birthPlace}
                  onChange={(e) => setStudentForm({ ...studentForm, birthPlace: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  label="سریال شناسنامه"
                  placeholder="مثال: 123456"
                  value={studentForm.certificateNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, certificateNumber: e.target.value })}
                />
                <Input
                  label="سری حرفی"
                  placeholder="مثال: الف"
                  value={studentForm.certificateSeriesLetter}
                  onChange={(e) => setStudentForm({ ...studentForm, certificateSeriesLetter: e.target.value })}
                />
                <Input
                  label="سری عددی"
                  placeholder="مثال: 12"
                  value={studentForm.certificateSeriesNumber}
                  onChange={(e) => setStudentForm({ ...studentForm, certificateSeriesNumber: e.target.value })}
                />
                <Input
                  label="محل صدور"
                  placeholder="مثال: مشهد"
                  value={studentForm.issuePlace}
                  onChange={(e) => setStudentForm({ ...studentForm, issuePlace: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="وضعیت جسمانی و سلامت"
                  placeholder="مثال: سالم، دارای آلرژی، ..."
                  value={studentForm.physicalCondition}
                  onChange={(e) => setStudentForm({ ...studentForm, physicalCondition: e.target.value })}
                />
                <Input
                  label="شماره همراه اولیه (پیش‌فرض) *"
                  placeholder="مثال: 09123333333"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                  required
                />
              </div>

              {/* Unified Credentials Card Preview */}
              <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-1 text-xs">
                <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-primary" />
                  <span>سامانه ورود یکپارچه (تولید خودکار اطلاعات ورود):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="bg-white dark:bg-[#1E293B] p-2 rounded border border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block">نام کاربری سامانه:</span>
                    <span className="font-mono font-bold text-ink-dark dark:text-white">
                      {studentForm.nationalCode ? studentForm.nationalCode : 'کد ملی دانش‌آموز'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-[#1E293B] p-2 rounded border border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block">رمز عبور خودکار:</span>
                    <span className="font-mono font-bold text-primary">
                      {studentForm.nationalCode
                        ? `${branchPrefix}${studentForm.nationalCode}`
                        : `${branchPrefix} + کد ملی`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {studentModalTab === 'FATHER' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="نام و نام‌خانوادگی پدر"
                  placeholder="مثال: رضا حسینی"
                  value={studentForm.fatherFullName}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherFullName: e.target.value })}
                />
                <Input
                  label="کد ملی پدر"
                  placeholder="مثال: 0041234567"
                  value={studentForm.fatherNationalId}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherNationalId: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="تحصیلات پدر"
                  placeholder="مثال: کارشناسی ارشد"
                  value={studentForm.fatherEducation}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherEducation: e.target.value })}
                />
                <Input
                  label="شغل پدر"
                  placeholder="مثال: مهندس مکانیک"
                  value={studentForm.fatherOccupation}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherOccupation: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="شماره همراه پدر"
                  placeholder="مثال: 09151112233"
                  value={studentForm.fatherPhone}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherPhone: e.target.value })}
                />
                <Input
                  label="آدرس محل کار پدر"
                  placeholder="مثال: مشهد، شهرک صنعتی طوس"
                  value={studentForm.fatherWorkAddress}
                  onChange={(e) => setStudentForm({ ...studentForm, fatherWorkAddress: e.target.value })}
                />
              </div>
            </div>
          )}

          {studentModalTab === 'MOTHER' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="نام و نام‌خانوادگی مادر"
                  placeholder="مثال: زهرا رضایی"
                  value={studentForm.motherFullName}
                  onChange={(e) => setStudentForm({ ...studentForm, motherFullName: e.target.value })}
                />
                <Input
                  label="کد ملی مادر"
                  placeholder="مثال: 0051234567"
                  value={studentForm.motherNationalId}
                  onChange={(e) => setStudentForm({ ...studentForm, motherNationalId: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="تحصیلات مادر"
                  placeholder="مثال: کارشناسی"
                  value={studentForm.motherEducation}
                  onChange={(e) => setStudentForm({ ...studentForm, motherEducation: e.target.value })}
                />
                <Input
                  label="شغل مادر"
                  placeholder="مثال: مربی"
                  value={studentForm.motherOccupation}
                  onChange={(e) => setStudentForm({ ...studentForm, motherOccupation: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="شماره همراه مادر"
                  placeholder="مثال: 09154445566"
                  value={studentForm.motherPhone}
                  onChange={(e) => setStudentForm({ ...studentForm, motherPhone: e.target.value })}
                />
                <Input
                  label="آدرس محل کار مادر"
                  placeholder="مثال: مشهد، خیابان راهنمایی"
                  value={studentForm.motherWorkAddress}
                  onChange={(e) => setStudentForm({ ...studentForm, motherWorkAddress: e.target.value })}
                />
              </div>
            </div>
          )}

          {studentModalTab === 'CONTACT' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="شماره همراه خود دانش‌آموز"
                  placeholder="مثال: 09351234567"
                  value={studentForm.studentMobile}
                  onChange={(e) => setStudentForm({ ...studentForm, studentMobile: e.target.value })}
                />
                <Input
                  label="شماره تلفن ثابت منزل"
                  placeholder="مثال: 05137654321"
                  value={studentForm.landlinePhone}
                  onChange={(e) => setStudentForm({ ...studentForm, landlinePhone: e.target.value })}
                />
              </div>
              <Input
                label="آدرس محل سکونت"
                placeholder="مثال: مشهد، بلوار سجاد، خیابان بهار، پلاک ۱۲"
                value={studentForm.homeAddress}
                onChange={(e) => setStudentForm({ ...studentForm, homeAddress: e.target.value })}
              />
              <Input
                label="آدرس لینک یا مسیر عکس پرسنلی"
                placeholder="مثال: https://... یا نام فایل تصویر"
                value={studentForm.avatarUrl}
                onChange={(e) => setStudentForm({ ...studentForm, avatarUrl: e.target.value })}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex gap-1.5">
              {studentModalTab !== 'IDENTITY' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (studentModalTab === 'CONTACT') setStudentModalTab('MOTHER');
                    else if (studentModalTab === 'MOTHER') setStudentModalTab('FATHER');
                    else if (studentModalTab === 'FATHER') setStudentModalTab('IDENTITY');
                  }}
                >
                  مرحله قبل
                </Button>
              )}
              {studentModalTab !== 'CONTACT' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (studentModalTab === 'IDENTITY') setStudentModalTab('FATHER');
                    else if (studentModalTab === 'FATHER') setStudentModalTab('MOTHER');
                    else if (studentModalTab === 'MOTHER') setStudentModalTab('CONTACT');
                  }}
                >
                  مرحله بعد
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsStudentModalOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                ثبت نهایی پرونده دانش‌آموز
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Dossier Modal: شناسنامه و پرونده کامل الکترونیکی دانش‌آموز */}
      {selectedStudentDossier && (
        <Modal
          isOpen={!!selectedStudentDossier}
          onClose={() => {
            setSelectedStudentDossier(null);
            setIsEditingDossier(false);
          }}
          title="پرونده دانش‌آموز"
          maxWidth="2xl"
        >
          {error && (
            <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dossier Header Summary Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 border-primary/30 bg-white dark:bg-[#151C28] flex items-center justify-center font-black text-lg sm:text-xl text-primary shrink-0 shadow-sm">
                {selectedStudentDossier.user?.avatarUrl ? (
                  <img src={selectedStudentDossier.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  selectedStudentDossier.user?.firstName?.[0] || 'د'
                )}
              </div>
              <h3 className="font-black text-base sm:text-lg text-ink-darker dark:text-white truncate">
                {selectedStudentDossier.user?.firstName} {selectedStudentDossier.user?.lastName}
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditingDossier(!isEditingDossier)}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-bold transition-all shadow-2xs border cursor-pointer ${
                  isEditingDossier
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white dark:bg-[#151C28] text-ink-normal dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-primary/10 hover:text-primary hover:border-primary/30'
                }`}
                title={isEditingDossier ? 'مشاهده پرونده' : 'ویرایش پرونده'}
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleOpenDeleteStudent(selectedStudentDossier)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-2xs border border-rose-500/20 cursor-pointer"
                title="حذف دانش‌آموز"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dossier Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-[11px] sm:text-xs font-bold">
            <button
              type="button"
              onClick={() => setDossierTab('IDENTITY')}
              className={`py-1.5 px-0.5 sm:px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                dossierTab === 'IDENTITY'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              اطلاعات پایه
            </button>
            <button
              type="button"
              onClick={() => setDossierTab('FATHER')}
              className={`py-1.5 px-0.5 sm:px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                dossierTab === 'FATHER'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              اطلاعات پدر
            </button>
            <button
              type="button"
              onClick={() => setDossierTab('MOTHER')}
              className={`py-1.5 px-0.5 sm:px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                dossierTab === 'MOTHER'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              اطلاعات مادر
            </button>
            <button
              type="button"
              onClick={() => setDossierTab('CONTACT')}
              className={`py-1.5 px-0.5 sm:px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                dossierTab === 'CONTACT'
                  ? 'bg-white dark:bg-[#151C28] text-primary shadow-xs'
                  : 'text-gray-500 hover:text-ink-darker dark:hover:text-white'
              }`}
            >
              اطلاعات تماس
            </button>
          </div>

          {isEditingDossier ? (
            <form onSubmit={handleSaveDossier} className="space-y-4">
              {dossierTab === 'IDENTITY' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="نام دانش‌آموز"
                      value={dossierEditForm.firstName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, firstName: e.target.value })}
                      required
                    />
                    <Input
                      label="نام خانوادگی"
                      value={dossierEditForm.lastName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="کد ملی دانش‌آموز"
                      value={dossierEditForm.nationalCode}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, nationalCode: e.target.value })}
                    />
                    <Input
                      label="شماره / کد دانش‌آموزی"
                      value={dossierEditForm.studentCode}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, studentCode: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="پایه تحصیلی"
                      value={dossierEditForm.gradeLevel}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, gradeLevel: e.target.value })}
                    >
                      <option value="دهم">دهم</option>
                      <option value="یازدهم">یازدهم</option>
                      <option value="دوازدهم">دوازدهم</option>
                    </Select>
                    <Select
                      label="کلاس و رشته تحصیلی"
                      value={dossierEditForm.classroomId}
                      onChange={(e) => {
                        const selClass = classrooms.find((c) => c.id === e.target.value);
                        setDossierEditForm({
                          ...dossierEditForm,
                          classroomId: e.target.value,
                          ...(selClass?.level?.name ? { gradeLevel: selClass.level.name.replace('پایه', '').trim() } : {}),
                        });
                      }}
                    >
                      <option value="">-- بدون انتساب به کلاس --</option>
                      {classrooms.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.field?.name ? `(${c.field.name})` : ''} {c.level?.name ? `- ${c.level.name}` : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="نام پدر"
                      value={dossierEditForm.fatherName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherName: e.target.value })}
                    />
                    <Input
                      label="وضعیت جسمانی و سلامت"
                      value={dossierEditForm.physicalCondition}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, physicalCondition: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="تاریخ تولد (شمسی)"
                      value={dossierEditForm.birthDate}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, birthDate: e.target.value })}
                      placeholder="مثال: 1387/05/14"
                    />
                    <Input
                      label="محل تولد"
                      value={dossierEditForm.birthPlace}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, birthPlace: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <Input
                      label="سریال شناسنامه"
                      value={dossierEditForm.certificateNumber}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, certificateNumber: e.target.value })}
                    />
                    <Input
                      label="سری حرفی"
                      value={dossierEditForm.certificateSeriesLetter}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, certificateSeriesLetter: e.target.value })}
                    />
                    <Input
                      label="سری عددی"
                      value={dossierEditForm.certificateSeriesNumber}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, certificateSeriesNumber: e.target.value })}
                    />
                    <Input
                      label="محل صدور"
                      value={dossierEditForm.issuePlace}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, issuePlace: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {dossierTab === 'FATHER' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="نام و نام‌خانوادگی پدر"
                      value={dossierEditForm.fatherFullName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherFullName: e.target.value })}
                    />
                    <Input
                      label="کد ملی پدر"
                      value={dossierEditForm.fatherNationalId}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherNationalId: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="تحصیلات پدر"
                      value={dossierEditForm.fatherEducation}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherEducation: e.target.value })}
                    />
                    <Input
                      label="شغل پدر"
                      value={dossierEditForm.fatherOccupation}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherOccupation: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="شماره همراه پدر"
                      value={dossierEditForm.fatherPhone}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherPhone: e.target.value })}
                    />
                    <Input
                      label="آدرس محل کار پدر"
                      value={dossierEditForm.fatherWorkAddress}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, fatherWorkAddress: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {dossierTab === 'MOTHER' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="نام و نام‌خانوادگی مادر"
                      value={dossierEditForm.motherFullName}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherFullName: e.target.value })}
                    />
                    <Input
                      label="کد ملی مادر"
                      value={dossierEditForm.motherNationalId}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherNationalId: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="تحصیلات مادر"
                      value={dossierEditForm.motherEducation}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherEducation: e.target.value })}
                    />
                    <Input
                      label="شغل مادر"
                      value={dossierEditForm.motherOccupation}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherOccupation: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="شماره همراه مادر"
                      value={dossierEditForm.motherPhone}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherPhone: e.target.value })}
                    />
                    <Input
                      label="آدرس محل کار مادر"
                      value={dossierEditForm.motherWorkAddress}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, motherWorkAddress: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {dossierTab === 'CONTACT' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="شماره همراه خود دانش‌آموز"
                      value={dossierEditForm.studentMobile}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, studentMobile: e.target.value })}
                    />
                    <Input
                      label="شماره ثابت منزل"
                      value={dossierEditForm.landlinePhone}
                      onChange={(e) => setDossierEditForm({ ...dossierEditForm, landlinePhone: e.target.value })}
                    />
                  </div>
                  <Input
                    label="آدرس منزل"
                    value={dossierEditForm.homeAddress}
                    onChange={(e) => setDossierEditForm({ ...dossierEditForm, homeAddress: e.target.value })}
                  />
                  <Input
                    label="لینک عکس پرسنلی"
                    value={dossierEditForm.avatarUrl}
                    onChange={(e) => setDossierEditForm({ ...dossierEditForm, avatarUrl: e.target.value })}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <Button type="button" variant="ghost" onClick={() => setIsEditingDossier(false)}>
                  انصراف
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  <Save className="w-3.5 h-3.5 ml-1" />
                  <span>ذخیره تغییرات پرونده</span>
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {dossierTab === 'IDENTITY' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">کد ملی:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono">
                      {selectedStudentDossier.nationalCode || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">کد / شماره دانش‌آموزی:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono">
                      {selectedStudentDossier.studentCode || selectedStudentDossier.studentNumber || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">پایه تحصیلی:</span>
                    <strong className="text-sm text-primary">
                      {selectedStudentDossier.enrollments?.[0]?.classroom?.level?.name || selectedStudentDossier.gradeLevel || 'دهم'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">رشته تحصیلی:</span>
                    <strong className="text-sm text-primary">
                      {selectedStudentDossier.enrollments?.[0]?.classroom?.field?.name || selectedStudentDossier.fieldOfStudy || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">کلاس انتصابی:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.enrollments?.[0]?.classroom?.name || 'بدون کلاس'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">نام پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherName || selectedStudentDossier.fatherFullName || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">تاریخ تولد:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.birthDate ? formatToJalali(selectedStudentDossier.birthDate) : '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">محل تولد:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.birthPlace || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">سریال و سری شناسنامه:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono">
                      {selectedStudentDossier.certificateNumber || '—'} {selectedStudentDossier.certificateSeriesLetter ? `(سری ${selectedStudentDossier.certificateSeriesLetter} / ${selectedStudentDossier.certificateSeriesNumber || ''})` : ''}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">محل صدور شناسنامه:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.issuePlace || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 sm:col-span-2">
                    <span className="text-gray-500 block mb-1">وضعیت جسمانی و سلامت:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.physicalCondition || selectedStudentDossier.medicalNotes || 'سالم'}
                    </strong>
                  </div>
                </div>
              )}

              {dossierTab === 'FATHER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">نام و نام‌خانوادگی پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherFullName || selectedStudentDossier.fatherName || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">کد ملی پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono">
                      {selectedStudentDossier.fatherNationalId || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">تحصیلات پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherEducation || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شغل پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherOccupation || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شماره همراه پدر:</span>
                    <strong className="text-sm text-primary font-mono" dir="ltr">
                      {selectedStudentDossier.fatherPhone || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">آدرس محل کار پدر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.fatherWorkAddress || '—'}
                    </strong>
                  </div>
                </div>
              )}

              {dossierTab === 'MOTHER' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">نام و نام‌خانوادگی مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.motherFullName || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">کد ملی مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono">
                      {selectedStudentDossier.motherNationalId || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">تحصیلات مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.motherEducation || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شغل مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.motherOccupation || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شماره همراه مادر:</span>
                    <strong className="text-sm text-primary font-mono" dir="ltr">
                      {selectedStudentDossier.motherPhone || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">آدرس محل کار مادر:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.motherWorkAddress || '—'}
                    </strong>
                  </div>
                </div>
              )}

              {dossierTab === 'CONTACT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شماره همراه دانش‌آموز:</span>
                    <strong className="text-sm text-primary font-mono" dir="ltr">
                      {selectedStudentDossier.studentMobile || selectedStudentDossier.user?.phone || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                    <span className="text-gray-500 block mb-1">شماره تلفن ثابت:</span>
                    <strong className="text-sm text-ink-darker dark:text-white font-mono" dir="ltr">
                      {selectedStudentDossier.landlinePhone || '—'}
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 sm:col-span-2">
                    <span className="text-gray-500 block mb-1">آدرس محل سکونت:</span>
                    <strong className="text-sm text-ink-darker dark:text-white">
                      {selectedStudentDossier.homeAddress || selectedStudentDossier.address || '—'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedStudentDossier(null);
                setIsEditingDossier(false);
              }}
            >
              بستن پرونده
            </Button>
          </div>
        </Modal>
      )}

      {/* 2. Modal: Create Teacher */}
      <Modal
        isOpen={isTeacherModalOpen}
        onClose={() => {
          setIsTeacherModalOpen(false);
          setError(null);
        }}
        title="ثبت مربی یا پرسنل جدید"
        description="ایجاد حساب کاربری آموزشی و ثبت کد پرسنلی"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateTeacher} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="نام *"
              placeholder="مثال: محمد"
              value={teacherForm.firstName}
              onChange={(e) => setTeacherForm({ ...teacherForm, firstName: e.target.value })}
              required
            />
            <Input
              label="نام خانوادگی *"
              placeholder="مثال: کاظمی"
              value={teacherForm.lastName}
              onChange={(e) => setTeacherForm({ ...teacherForm, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="کد پرسنلی"
              placeholder="مثال: TCH-1404-01 (اختیاری)"
              value={teacherForm.personnelCode}
              onChange={(e) => setTeacherForm({ ...teacherForm, personnelCode: e.target.value })}
            />
            <Input
              label="کد ملی"
              placeholder="مثال: 0012345678 (اختیاری)"
              value={teacherForm.nationalCode}
              onChange={(e) => setTeacherForm({ ...teacherForm, nationalCode: e.target.value })}
            />
          </div>

          <div>
            <Input
              label="شماره تماس *"
              placeholder="مثال: 09122222222"
              value={teacherForm.phone}
              onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="مدرک تحصیلی"
              placeholder="مثال: کارشناسی ارشد"
              value={teacherForm.degree}
              onChange={(e) => setTeacherForm({ ...teacherForm, degree: e.target.value })}
            />
            <Input
              label="رشته تحصیلی"
              placeholder="مثال: آموزش ریاضی / مهندسی کامپیوتر"
              value={teacherForm.studyField}
              onChange={(e) => setTeacherForm({ ...teacherForm, studyField: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="شماره تلفن ثابت"
              placeholder="مثال: 05137654321"
              value={teacherForm.landlinePhone}
              onChange={(e) => setTeacherForm({ ...teacherForm, landlinePhone: e.target.value })}
            />
            <Input
              label="آدرس محل سکونت"
              placeholder="مثال: مشهد، بلوار سجاد، خیابان بهار، پلاک ۱۲"
              value={teacherForm.homeAddress}
              onChange={(e) => setTeacherForm({ ...teacherForm, homeAddress: e.target.value })}
            />
          </div>

          {/* Teacher Unified Credentials Card */}
          <div className="p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-1 text-xs">
            <div className="font-bold text-ink-dark dark:text-white flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-primary" />
              <span>شناسه ورود یکپارچه مربی:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="bg-white dark:bg-[#1E293B] p-2 rounded border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">نام کاربری سامانه:</span>
                <span className="font-mono font-bold text-ink-dark dark:text-white">
                  {teacherForm.nationalCode ? teacherForm.nationalCode : (teacherForm.phone || 'کد ملی یا موبایل')}
                </span>
              </div>
              <div className="bg-white dark:bg-[#1E293B] p-2 rounded border border-gray-200 dark:border-gray-700">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">رمز عبور پیش‌فرض:</span>
                <span className="font-mono font-bold text-primary">
                  {teacherForm.nationalCode
                    ? `${branchPrefix}${teacherForm.nationalCode.replace(/^0+/, '') || teacherForm.nationalCode}`
                    : teacherForm.phone
                      ? `${branchPrefix}${teacherForm.phone}`
                      : `${branchPrefix} + کد ملی یا موبایل`}
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Select Lessons */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink-normal text-right">
              دروس تدریسی مربی (انتخاب یک یا چند درس)
            </label>
            <p className="text-[11px] text-gray-500">
              یک درس می‌تواند چندین مربی داشته باشد و این مربی هم می‌تواند چندین درس مختلف را تدریس کند:
            </p>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 space-y-1.5">
              {lessons.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">
                  هیچ درسی تعریف نشده است. ابتدا در بخش ساختار آموزشی دروس را تعریف کنید.
                </div>
              ) : (
                lessons.map((lesson) => {
                  const isSelected = teacherForm.lessonIds.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        setTeacherForm((prev) => ({
                          ...prev,
                          lessonIds: isSelected
                            ? prev.lessonIds.filter((id) => id !== lesson.id)
                            : [...prev.lessonIds, lesson.id],
                        }));
                      }}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-primary-50/60 border-primary shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-bold text-ink-dark">{lesson.name}</span>
                        <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {lesson.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        {lesson.level?.name && (
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                            پایه {lesson.level.name}
                          </span>
                        )}
                        {lesson.field?.name ? (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                            {lesson.field.name}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                            عمومی
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {teacherForm.lessonIds.length > 0 && (
              <div className="text-[11px] text-primary font-bold">
                {teacherForm.lessonIds.length} درس انتخاب شده است.
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsTeacherModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ثبت مربی
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Edit Teacher Lessons */}
      <Modal
        isOpen={isEditLessonsModalOpen}
        onClose={() => {
          setIsEditLessonsModalOpen(false);
          setEditingTeacher(null);
          setError(null);
        }}
        title={`مدیریت دروس تخصیص‌یافته به ${editingTeacher?.user?.firstName || ''} ${editingTeacher?.user?.lastName || ''}`}
        description="تخصیص، افزودن یا حذف دروس تدریسی این مربی"
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSaveTeacherLessons} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-ink-normal text-right">
              دروس تدریسی مربی
            </label>
            <p className="text-[11px] text-gray-500">
              هر کدام از درس‌های زیر را می‌توانید برای این مربی فعال یا غیرفعال کنید:
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 space-y-1.5">
              {lessons.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">درسی تعریف نشده است.</div>
              ) : (
                lessons.map((lesson) => {
                  const isSelected = editingLessonIds.includes(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      onClick={() => {
                        setEditingLessonIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== lesson.id)
                            : [...prev, lesson.id],
                        );
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-md cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-primary-50/60 border-primary shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-bold text-ink-dark">{lesson.name}</span>
                        <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {lesson.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        {lesson.level?.name && (
                          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                            پایه {lesson.level.name}
                          </span>
                        )}
                        {lesson.field?.name ? (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                            {lesson.field.name}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                            عمومی
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="text-[11px] text-primary font-bold">
              {editingLessonIds.length} درس انتخاب شده است.
            </div>
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditLessonsModalOpen(false);
                setEditingTeacher(null);
              }}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              ذخیره دروس
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal: Bulk Excel Import for Students */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => {
          setIsExcelModalOpen(false);
          setExcelFile(null);
          setExcelRows([]);
          setExcelResult(null);
          setError(null);
        }}
        title="ورود گروهی دانش‌آموزان از طریق اکسل"
        description="بارگذاری دسته‌جمعی مشخصات دانش‌آموزان با استفاده از فایل اکسل (.xlsx یا .xls)"
        maxWidth="md"
      >
        <div className="space-y-5">
          {/* Download Template & Export Current Roster Banner */}
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-col gap-3">
            <div className="flex items-center space-x-2.5 space-x-reverse">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  قالب استاندارد اکسل و خروجی داده‌ها
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  می‌توانید نمونه خام را دریافت کرده یا اطلاعات فعلی دانش‌آموزان را خروجی گرفته، ویرایش و مجدداً بارگذاری نمایید.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadExcelSample}
                className="text-xs bg-white dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100"
              >
                <Download className="h-3.5 w-3.5 ml-1" />
                <span>دانلود نمونه خام</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportStudentsExcel}
                className="text-xs bg-white dark:bg-emerald-900/50 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 ml-1 text-emerald-600 dark:text-emerald-400" />
                <span>خروجی اطلاعات فعلی ({toPersianDigits(students.length)} دانش‌آموز)</span>
              </Button>
            </div>
          </div>

          {/* Smart Upsert & Unified Login Standard Notice for Excel */}
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs space-y-2">
            <div className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>به‌روزرسانی هوشمند و سامانه ورود یکپارچه:</span>
            </div>
            <ul className="text-[11px] text-blue-800 dark:text-blue-300 space-y-1 pr-3 list-disc list-inside leading-relaxed">
              <li>
                <strong>به‌روزرسانی خودکار:</strong> دانش‌آموزان موجود (بر اساس کد ملی / شماره دانش‌آموزی) شناسایی شده، مشخصات و کلاس آن‌ها به‌روزرسانی می‌شود و خطای تکراری رخ نخواهد داد.
              </li>
              <li>
                <strong>نام کاربری:</strong> کد ملی ۱۰ رقمی دانش‌آموز
              </li>
              <li>
                <strong>رمز عبور پیش‌فرض:</strong> پیش‌وند شعبه + کد ملی (<strong>{branchPrefix}</strong> + کد ملی، مثال: <strong>{branchPrefix}0012345678</strong>)
              </li>
            </ul>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={handleExcelFileChange}
          />

          {/* Upload Drop/Click Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/60 hover:bg-emerald-50/30"
          >
            <UploadCloud className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-ink-darker">
              {excelFile ? excelFile.name : 'برای انتخاب فایل اکسل کلیک کنید'}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              فرمت‌های مجاز: .xlsx یا .xls
            </p>
            {excelRows.length > 0 && (
              <div className="mt-3 inline-flex items-center space-x-1 space-x-reverse bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{excelRows.length} دانش‌آموز در فایل شناسایی شد</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Result Message with Detailed Metrics */}
          {excelResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-3">
              <div className="font-bold flex items-center space-x-1.5 space-x-reverse text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>عملیات پردازش فایل اکسل با موفقیت انجام شد:</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-white/90 dark:bg-emerald-900/40 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/60 text-center">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">مجموع ردیف‌ها</span>
                  <span className="font-black text-sm text-gray-800 dark:text-gray-200">{toPersianDigits(excelResult.total || 0)}</span>
                </div>
                <div className="bg-white/90 dark:bg-emerald-900/40 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/60 text-center">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mb-1">دانش‌آموز جدید</span>
                  <span className="font-black text-sm text-emerald-700 dark:text-emerald-300">{toPersianDigits(excelResult.created ?? excelResult.success ?? 0)}</span>
                </div>
                <div className="bg-white/90 dark:bg-emerald-900/40 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/60 text-center">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 block mb-1">به‌روزرسانی‌شده</span>
                  <span className="font-black text-sm text-blue-700 dark:text-blue-300">{toPersianDigits(excelResult.updated || 0)}</span>
                </div>
                <div className="bg-white/90 dark:bg-emerald-900/40 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-800/60 text-center">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block mb-1">ناموفق / خطا</span>
                  <span className="font-black text-sm text-amber-700 dark:text-amber-400">{toPersianDigits(excelResult.failed || 0)}</span>
                </div>
              </div>

              {excelResult.errors && excelResult.errors.length > 0 && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-[11px] text-red-700 dark:text-red-300 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                    <span>گزارش خطاهای رخ‌داده ({toPersianDigits(excelResult.errors.length)} مورد):</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[10px] dir-ltr text-right">
                    {excelResult.errors.map((err, idx) => (
                      <div key={idx}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex justify-end space-x-2 space-x-reverse pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsExcelModalOpen(false);
                setExcelFile(null);
                setExcelRows([]);
                setExcelResult(null);
                setError(null);
              }}
            >
              بستن
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmitExcel}
              disabled={excelRows.length === 0}
              isLoading={isSubmitting}
            >
              ثبت نهایی {excelRows.length > 0 ? `(${excelRows.length} دانش‌آموز)` : ''}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. Modal: Full Edit Teacher */}
      <Modal
        isOpen={isEditTeacherModalOpen}
        onClose={() => {
          setIsEditTeacherModalOpen(false);
          setEditingTeacher(null);
          setError(null);
        }}
        title={`ویرایش مشخصات مربی: ${editingTeacher?.user?.firstName || ''} ${editingTeacher?.user?.lastName || ''}`}
        description="ویرایش جامع اطلاعات هویتی، پرسنلی، شغلی، امنیت و دروس تخصیص‌یافته"
        maxWidth="2xl"
      >
        {error && (
          <div className="mb-4 flex items-center space-x-2 space-x-reverse rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setTeacherEditTab('INFO')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherEditTab === 'INFO'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>اطلاعات فردی</span>
          </button>
          <button
            type="button"
            onClick={() => setTeacherEditTab('JOB')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherEditTab === 'JOB'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>شغلی و مدارک</span>
          </button>
          <button
            type="button"
            onClick={() => setTeacherEditTab('CONTACT')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherEditTab === 'CONTACT'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>تماس و آدرس</span>
          </button>
          <button
            type="button"
            onClick={() => setTeacherEditTab('SECURITY')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherEditTab === 'SECURITY'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>امنیت و وضعیت</span>
          </button>
          <button
            type="button"
            onClick={() => setTeacherEditTab('LESSONS')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              teacherEditTab === 'LESSONS'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>دروس تدریسی ({teacherEditForm.lessonIds.length})</span>
          </button>
        </div>

        <form onSubmit={handleSaveEditTeacher} className="space-y-4">
          {/* Tab 1: Personal Info */}
          {teacherEditTab === 'INFO' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="نام *"
                  value={teacherEditForm.firstName}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, firstName: e.target.value })}
                  required
                />
                <Input
                  label="نام خانوادگی *"
                  value={teacherEditForm.lastName}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="شماره تماس (موبایل) *"
                  value={teacherEditForm.phone}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, phone: e.target.value })}
                  required
                />
                <Input
                  label="کد ملی (اختیاری)"
                  value={teacherEditForm.nationalCode}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, nationalCode: e.target.value })}
                  placeholder="مثال: 0012345678"
                />
              </div>
              <div>
                <Input
                  label="نام کاربری ورود سامانه"
                  value={teacherEditForm.username}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, username: e.target.value })}
                  placeholder="پیش‌فرض: شماره همراه"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  در صورت خالی گذاشتن، همان شماره همراه به عنوان نام کاربری در نظر گرفته خواهد شد.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Job & Education */}
          {teacherEditTab === 'JOB' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="کد پرسنلی"
                  value={teacherEditForm.personnelCode}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, personnelCode: e.target.value })}
                  placeholder="مثال: TCH-1404-01"
                />
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    نوع همکاری / قرارداد
                  </label>
                  <Select
                    value={teacherEditForm.employmentType}
                    onChange={(e) => setTeacherEditForm({ ...teacherEditForm, employmentType: e.target.value as any })}
                    options={[
                      { value: 'FULL_TIME', label: 'تمام‌وقت' },
                      { value: 'PART_TIME', label: 'پاره‌وقت' },
                      { value: 'CONTRACT', label: 'قراردادی' },
                      { value: 'HOURLY', label: 'حق‌التدریس / ساعتی' },
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="مدرک تحصیلی"
                  value={teacherEditForm.degree}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, degree: e.target.value })}
                  placeholder="مثال: کارشناسی ارشد"
                />
                <Input
                  label="رشته تحصیلی"
                  value={teacherEditForm.studyField}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, studyField: e.target.value })}
                  placeholder="مثال: آموزش ریاضی / مهندسی کامپیوتر"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Contact & Address */}
          {teacherEditTab === 'CONTACT' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="شماره تلفن ثابت"
                  value={teacherEditForm.landlinePhone}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, landlinePhone: e.target.value })}
                  placeholder="مثال: 05137654321"
                />
                <Input
                  label="آدرس ایمیل"
                  type="email"
                  value={teacherEditForm.email}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, email: e.target.value })}
                  placeholder="مثال: teacher@rokadschool.ir"
                />
              </div>
              <div>
                <Input
                  label="آدرس محل سکونت"
                  value={teacherEditForm.homeAddress}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, homeAddress: e.target.value })}
                  placeholder="مثال: مشهد، بلوار سجاد، خیابان بهار، پلاک ۱۲"
                />
              </div>
            </div>
          )}

          {/* Tab 4: Security & Status */}
          {teacherEditTab === 'SECURITY' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  وضعیت حساب کاربری
                </label>
                <Select
                  value={teacherEditForm.status}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, status: e.target.value })}
                  options={[
                    { value: 'ACTIVE', label: 'فعال (دسترسی کامل به پنل)' },
                    { value: 'SUSPENDED', label: 'معلق / غیرفعال (مسدودسازی ورود)' },
                  ]}
                />
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2">
                <div className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>تغییر رمز عبور مربی:</span>
                </div>
                <Input
                  label="رمز عبور جدید"
                  type="text"
                  value={teacherEditForm.password}
                  onChange={(e) => setTeacherEditForm({ ...teacherEditForm, password: e.target.value })}
                  placeholder="در صورت عدم تمایل به تغییر رمز، این فیلد را خالی بگذارید"
                />
                <p className="text-[10px] text-amber-800 dark:text-amber-300">
                  ⚠️ اگر این فیلد را پر کنید، رمز عبور مربی تغییر کرده و در گاوصندوق رمزهای سامانه نیز به‌روز خواهد شد.
                </p>
              </div>
            </div>
          )}

          {/* Tab 5: Lessons Assignment */}
          {teacherEditTab === 'LESSONS' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                دروس تخصیص‌یافته به مربی
              </label>
              <p className="text-[11px] text-gray-500">
                دروس مورد نظر را برای این مربی انتخاب کنید:
              </p>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800/40 p-2.5 space-y-1.5">
                {lessons.length === 0 ? (
                  <div className="text-xs text-gray-400 py-3 text-center">هیچ درسی تعریف نشده است.</div>
                ) : (
                  lessons.map((lesson) => {
                    const isSelected = teacherEditForm.lessonIds.includes(lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          setTeacherEditForm((prev) => ({
                            ...prev,
                            lessonIds: isSelected
                              ? prev.lessonIds.filter((id) => id !== lesson.id)
                              : [...prev.lessonIds, lesson.id],
                          }));
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary-dark font-bold shadow-xs'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-bold">{lesson.name}</span>
                          <span className="font-mono text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                            {lesson.code}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 space-x-reverse">
                          {lesson.level?.name && (
                            <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                              پایه {lesson.level.name}
                            </span>
                          )}
                          {lesson.field?.name ? (
                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                              {lesson.field.name}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                              عمومی
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenDeleteTeacher(editingTeacher)}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40"
            >
              <Trash2 className="w-3.5 h-3.5 ml-1" />
              <span>حذف مربی</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditTeacherModalOpen(false);
                  setEditingTeacher(null);
                }}
              >
                انصراف
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                <Save className="w-3.5 h-3.5 ml-1" />
                <span>ذخیره تغییرات</span>
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* 6. Modal: Delete Teacher Confirmation */}
      <Modal
        isOpen={isDeleteTeacherModalOpen}
        onClose={() => {
          setIsDeleteTeacherModalOpen(false);
          setDeletingTeacher(null);
        }}
        title="حذف مربی از کادر آموزشی"
        description="تایید عملیات حذف حساب و پروفایل مربی"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start space-x-2.5 space-x-reverse">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 dark:text-red-300 space-y-1">
              <div className="font-bold">هشدار حذف مربی:</div>
              <p className="leading-relaxed">
                آیا از حذف مربی{' '}
                <strong>
                  {deletingTeacher?.user?.firstName} {deletingTeacher?.user?.lastName}
                </strong>{' '}
                اطمینان دارید؟ با تایید این عملیات، پروفایل آموزشی، تخصیص دروس و دسترسی ورود ایشان حذف خواهد شد.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span className="text-gray-500">نام و نام‌خانوادگی:</span>
              <strong className="text-ink-darker dark:text-white">
                {deletingTeacher?.user?.firstName} {deletingTeacher?.user?.lastName}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">شماره تماس (نام کاربری):</span>
              <strong className="font-mono text-ink-darker dark:text-white">
                {deletingTeacher?.user?.phone || '—'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">کد پرسنلی:</span>
              <strong className="font-mono text-ink-darker dark:text-white">
                {deletingTeacher?.personnelCode || '—'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">تعداد دروس تخصیص‌یافته:</span>
              <strong className="text-primary font-bold">
                {toPersianDigits(deletingTeacher?.teacherLessons?.length || 0)} درس
              </strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsDeleteTeacherModalOpen(false);
                setDeletingTeacher(null);
              }}
              disabled={isDeletingTeacher}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteTeacher}
              isLoading={isDeletingTeacher}
            >
              <Trash2 className="w-3.5 h-3.5 ml-1" />
              <span>بله، حذف قطعی مربی</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. Modal: Delete Student Confirmation */}
      <Modal
        isOpen={isDeleteStudentModalOpen}
        onClose={() => {
          setIsDeleteStudentModalOpen(false);
          setDeletingStudent(null);
        }}
        title="حذف پرونده دانش‌آموز"
        description="تایید عملیات حذف حساب و پرونده تحصیلی دانش‌آموز"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start space-x-2.5 space-x-reverse">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 dark:text-red-300 space-y-1">
              <div className="font-bold">هشدار حذف دانش‌آموز:</div>
              <p className="leading-relaxed">
                آیا از حذف دانش‌آموز{' '}
                <strong>
                  {deletingStudent?.user?.firstName} {deletingStudent?.user?.lastName}
                </strong>{' '}
                اطمینان دارید؟ با تایید این عملیات، پرونده تحصیلی، سوابق کلاسی و دسترسی ورود ایشان از این مدرسه حذف خواهد شد.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span className="text-gray-500">نام و نام‌خانوادگی:</span>
              <strong className="text-ink-darker dark:text-white">
                {deletingStudent?.user?.firstName} {deletingStudent?.user?.lastName}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">شماره دانش‌آموزی:</span>
              <strong className="font-mono text-ink-darker dark:text-white">
                {deletingStudent?.studentCode || deletingStudent?.studentNumber || '—'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">کد ملی:</span>
              <strong className="font-mono text-ink-darker dark:text-white">
                {deletingStudent?.nationalCode || '—'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">کلاس و پایه:</span>
              <strong className="text-primary font-bold">
                {deletingStudent?.enrollments?.[0]?.classroom?.name || deletingStudent?.classroom?.name || 'کلاس عمومی'} (
                {deletingStudent?.enrollments?.[0]?.classroom?.level?.name || deletingStudent?.gradeLevel || 'دهم'})
              </strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsDeleteStudentModalOpen(false);
                setDeletingStudent(null);
              }}
              disabled={isDeletingStudent}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteStudent}
              isLoading={isDeletingStudent}
            >
              <Trash2 className="w-3.5 h-3.5 ml-1" />
              <span>حذف دانش‌آموز</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Password Reveal Modal */}
      <PasswordRevealModal
        isOpen={!!vaultTarget}
        onClose={() => setVaultTarget(null)}
        targetMember={vaultTarget}
      />
    </div>
  );
};
