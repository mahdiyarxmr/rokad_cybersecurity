import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/auth/auth-store';
import { apiClient } from '../../lib/api/client';
import { toPersianDigits, cleanUserFullName } from '../../lib/utils';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  CreditCard,
  CalendarDays,
  Award,
  Clock,
  ArrowUpRight,
  Users,
  GraduationCap,
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: childrenData, isLoading: isLoadingChildren } = useQuery({
    queryKey: ['parent-my-children'],
    queryFn: async () => {
      const res: any = await apiClient.get('/members/my-children');
      return res?.data || res || [];
    },
  });

  const { data: feeOverview } = useQuery({
    queryKey: ['parent-fee-overview'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/fee/contracts/my-overview');
        return res?.data || res || null;
      } catch {
        return null;
      }
    },
  });

  const { data: attendanceHistory } = useQuery({
    queryKey: ['parent-my-attendance'],
    queryFn: async () => {
      try {
        const res: any = await apiClient.get('/attendance/my-attendance');
        return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      } catch {
        return [];
      }
    },
  });

  const primaryLink = Array.isArray(childrenData) ? childrenData[0] : null;
  const student = primaryLink?.student;
  const studentUser = student?.user;
  const childFullName = studentUser 
    ? cleanUserFullName(studentUser.firstName, studentUser.lastName)
    : (isLoadingChildren ? 'در حال دریافت اطلاعات...' : 'فرزند ثبت‌شده');
  const classroomName = student?.enrollments?.[0]?.classroom?.name;
  const studentCode = student?.studentCode || student?.nationalCode;

  // Compute fee summary
  const contracts = feeOverview?.contracts || (Array.isArray(feeOverview) ? feeOverview : []);
  const totalRemaining = contracts.reduce((acc: number, c: any) => acc + Number(c.remainingAmount || 0), 0);
  const totalPaid = contracts.reduce((acc: number, c: any) => acc + Number(c.paidAmount || 0), 0);

  // Compute attendance stats
  const attendances = Array.isArray(attendanceHistory) ? attendanceHistory : [];
  const absentCount = attendances.filter((a: any) => a.status === 'ABSENT' || a.status === 'UNEXCUSED_ABSENCE').length;
  const presentCount = attendances.filter((a: any) => a.status === 'PRESENT').length;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="relative overflow-hidden rokad-card p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-ink-darker dark:text-white">
              پرتال اولیاء: {cleanUserFullName(user?.firstName, user?.lastName, user?.username || user?.phone) || 'ولی گرامی'}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="female" className="text-[11px] flex items-center gap-1">
                <GraduationCap className="h-3 w-3 inline" />
                <span>فرزند: {childFullName}</span>
              </Badge>
              {classroomName && (
                <Badge variant="neutral" className="text-[10px]">
                  کلاس {classroomName}
                </Badge>
              )}
              {studentCode && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  کد ملی / شناسه: {toPersianDigits(studentCode)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/parent/visits')}
            className="flex-1 sm:flex-none"
          >
            <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>ملاقات با مربیان</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/parent/fees')}
            className="flex-1 sm:flex-none"
          >
            <span>امور شهریه</span>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Tuition */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">وضعیت شهریه و مالی</span>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-ink-darker dark:text-white font-mono">
              {totalRemaining > 0 ? (
                <>
                  {toPersianDigits((totalRemaining / 10000000).toLocaleString('fa-IR'))}{' '}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">میلیون تومان مانده</span>
                </>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 text-lg">فاقد بدهی معوق</span>
              )}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <Badge variant={totalRemaining > 0 ? 'warning' : 'success'} className="text-[10px]">
                {contracts.length > 0 ? `${toPersianDigits(contracts.length)} قرارداد ثبت‌شده` : 'پرونده مالی تسویه'}
              </Badge>
              <span className="text-gray-500 dark:text-gray-400">
                {totalPaid > 0 ? `پرداختی: ${toPersianDigits((totalPaid / 10000000).toLocaleString('fa-IR'))} م.ت` : 'سال ۱۴۰۵-۱۴۰۶'}
              </span>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/app/parent/fees')}
            className="w-full mt-4 text-xs font-bold"
          >
            جزئیات و پرداخت شهریه
          </Button>
        </Card>

        {/* Card 2: Attendance */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">وضعیت حضور و غیاب</span>
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {absentCount === 0 ? 'حضور منظم (بدون غیبت)' : `${toPersianDigits(absentCount)} غیبت ثبت‌شده`}
            </div>
            <div className="mt-2.5 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>جلسات حاضر: <strong className="text-ink-darker dark:text-white font-mono">{toPersianDigits(presentCount)}</strong></div>
              <div>غیبت غیرموجه: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{toPersianDigits(absentCount)}</strong></div>
            </div>
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/app/parent/reports')}
            className="w-full mt-4 text-xs font-bold"
          >
            گزارش تردد و حضور
          </Button>
        </Card>

        {/* Card 3: Academic Standing */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">وضعیت تحصیلی و کلاسی</span>
              <Award className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-primary font-mono">
              {classroomName ? `کلاس ${classroomName}` : 'سال ۱۴۰۵-۱۴۰۶'}
            </div>
            <div className="mt-2.5 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>دوره تحصیلی: <strong className="text-ink-darker dark:text-white">نیم‌سال اول</strong></div>
              <div>وضعیت انضباطی: <strong className="text-emerald-600 dark:text-emerald-400">عادی (پرونده منظم)</strong></div>
            </div>
          </div>
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/app/student/grades')}
            className="w-full mt-4 text-xs font-bold"
          >
            مشاهده سوابق و کارنامه
          </Button>
        </Card>
      </div>
    </div>
  );
};
