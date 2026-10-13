import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../../../lib/api/client';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { formatJalaliDisplay, toPersianDigits } from '../../../utils/jalali';
import { utils, writeFile } from 'xlsx';
import {
  Printer,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  Clock,
  GraduationCap,
  CalendarDays,
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award,
  ShieldCheck,
  Building2,
  Phone,
  User,
  Check,
} from 'lucide-react';

interface CoachingDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
}

const PERSIAN_DAY_NAMES = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export const CoachingDossierModal: React.FC<CoachingDossierModalProps> = ({
  isOpen,
  onClose,
  studentId,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sheet' | 'interactive'>('sheet');
  const printSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !studentId) return;

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/coaching/students/${studentId}/report`);
        if (res && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load coaching dossier report', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const studentFullName = data?.student
    ? `${data.student.firstName} ${data.student.lastName}`
    : 'دانش‌آموز';

  const issueDateStr = formatJalaliDisplay(new Date(), false);
  const fileTrackingCode = `COACH-${data?.student?.studentCode || '1404'}-${(data?.student?.id || '').slice(0, 4)}`;

  // ==========================================
  // Isolated High-Fidelity Print Engine
  // ==========================================
  const handlePrint = () => {
    if (!printSheetRef.current) return;

    const contentHtml = printSheetRef.current.innerHTML;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="fa" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>کارنامه و پرونده مربی‌گری - ${studentFullName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 12mm 12mm 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: 'IRANSansXFaNum', -apple-system, BlinkMacSystemFont, Tahoma, Arial, sans-serif;
              font-size: 11px;
              direction: rtl;
              line-height: 1.5;
            }
            .sheet-page {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
              background: #ffffff;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
              text-align: right;
              vertical-align: top;
            }
            th {
              background-color: #f1f5f9 !important;
              color: #0f172a !important;
              font-weight: 800;
              font-size: 11px;
            }
            td {
              font-size: 10.5px;
            }
            .header-box {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 6px 16px;
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              border-radius: 6px;
              padding: 10px 14px;
              margin-bottom: 14px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              border-bottom: 1px dashed #e2e8f0;
              padding-bottom: 3px;
            }
            .info-label {
              color: #475569;
              font-weight: bold;
            }
            .info-val {
              color: #0f172a;
              font-weight: 800;
            }
            .kpi-row {
              display: flex;
              gap: 8px;
              margin-bottom: 14px;
            }
            .kpi-box {
              flex: 1;
              border: 1px solid #cbd5e1;
              background-color: #f8fafc;
              border-radius: 6px;
              padding: 8px 6px;
              text-align: center;
            }
            .kpi-num {
              display: block;
              font-size: 16px;
              font-weight: 900;
              color: #0f172a;
            }
            .kpi-lbl {
              font-size: 10px;
              color: #64748b;
              font-weight: bold;
            }
            .badge-p {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9.5px;
              font-weight: bold;
              background: #ecfdf5;
              color: #065f46;
              border: 1px solid #a7f3d0;
            }
            .badge-a {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9.5px;
              font-weight: bold;
              background: #fef2f2;
              color: #991b1b;
              border: 1px solid #fecaca;
            }
            .badge-e {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9.5px;
              font-weight: bold;
              background: #fffbeb;
              color: #92400e;
              border: 1px solid #fde68a;
            }
            .badge-w {
              display: inline-block;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 9.5px;
              font-weight: bold;
              background: #f1f5f9;
              color: #475569;
              border: 1px solid #cbd5e1;
            }
            .signatures-row {
              display: flex;
              gap: 12px;
              margin-top: 24px;
              page-break-inside: avoid;
            }
            .sign-card {
              flex: 1;
              border: 1px solid #94a3b8;
              border-radius: 6px;
              padding: 8px 10px;
              min-height: 85px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              font-size: 10px;
            }
            .footer-note {
              margin-top: 14px;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="sheet-page">
            ${contentHtml}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 3000);
    }, 350);
  };

  // ==========================================
  // Excel (.xlsx) Export Engine
  // ==========================================
  const handleExportExcel = () => {
    if (!data) return;

    const wb = utils.book_new();

    // 1. Info Sheet Data
    const sheetData: any[][] = [
      ['جمهوری اسلامی ایران - وزارت آموزش و پرورش'],
      [`مجتمع آموزشی / هنرستان: ${data.tenant?.name || 'هنرستان هوشمند رکاد'}`],
      ['کارنامه و خلاصه پرونده مربی‌گری و هدایت تحصیلی (کوچینگ)'],
      [],
      ['نام و نام خانوادگی دانش‌آموز:', studentFullName, '', 'کد دانش‌آموزی:', data.student?.studentCode || '---'],
      ['کد ملی:', data.student?.nationalCode || '---', '', 'کلاس / پایه:', data.student?.classroom || '---'],
      ['نام مربی (کوچ):', data.activeCoach ? `${data.activeCoach.firstName} ${data.activeCoach.lastName}` : 'تعیین‌نشده', '', 'نام پدر:', data.student?.fatherName || '---'],
      ['تعداد کل جلسات ثبت‌شده:', data.stats?.totalSessions || 0, '', 'جلسات حضور یافته:', data.stats?.attended || 0],
      ['جلسات غیبت:', data.stats?.absent || 0, '', 'درصد نرخ حضور:', `${data.stats?.attendanceRate || 100}%`],
      [],
      ['ردیف', 'تاریخ جلسه (شمسی)', 'ساعت برگزاری', 'مدت (دقیقه)', 'نوع جلسه', 'وضعیت حضور', 'نام مربی', 'مباحث و مشاهدات مربی', 'اهداف و تکالیف دوره بعد'],
    ];

    // 2. Append Sessions Rows
    (data.sessions || []).forEach((s: any, idx: number) => {
      const jalaliDate = formatJalaliDisplay(s.scheduledDate, false);
      const time = new Date(s.scheduledDate).toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      let statusText = 'در انتظار برگزاری';
      if (s.attendanceStatus === 'PRESENT') statusText = 'حاضر';
      else if (s.attendanceStatus === 'ABSENT') statusText = 'غایب';
      else if (s.attendanceStatus === 'EXCUSED') statusText = 'غایب موجه';

      const sessionType = s.sessionType === 'EXTRA' ? 'فوق‌العاده' : 'عادی / دوره‌ای';
      const coachName = s.coach ? `${s.coach.firstName} ${s.coach.lastName}` : (data.activeCoach ? `${data.activeCoach.firstName} ${data.activeCoach.lastName}` : '---');

      sheetData.push([
        idx + 1,
        jalaliDate,
        time,
        s.durationMinutes || 45,
        sessionType,
        statusText,
        coachName,
        s.coachNotes || '---',
        s.actionItems || '---',
      ]);
    });

    const ws = utils.aoa_to_sheet(sheetData);

    // Column widths
    ws['!cols'] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 20 },
      { wch: 45 },
      { wch: 40 },
    ];

    // Right-to-Left View
    ws['!views'] = [{ rightToLeft: true }];

    utils.book_append_sheet(wb, ws, 'پرونده کوچینگ');
    const safeStudentName = `${data.student?.firstName || ''}_${data.student?.lastName || 'دانش‌آموز'}`.replace(/\s+/g, '_');
    writeFile(wb, `کارنامه_کوچینگ_${safeStudentName}.xlsx`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="پرونده جلسات هدایت تحصیلی و مربی‌گری"
      maxWidth="4xl"
    >
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-sm font-bold text-zinc-600 dark:text-zinc-300">
            در حال دریافت پرونده دانش‌آموز...
          </p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-sm font-bold text-zinc-500">
          اطلاعات پرونده در دسترس نیست.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top Control Bar: Tabs & Export Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setActiveTab('sheet')}
                className={`min-h-[40px] sm:min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'sheet'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>برگه رسمی (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('interactive')}
                className={`min-h-[40px] sm:min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'interactive'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>نمای کارتی</span>
              </button>
            </div>

            {/* Print & Excel Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleExportExcel}
                variant="outline"
                className="min-h-[40px] sm:min-h-[44px] gap-2 text-xs font-bold border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>خروجی اکسل</span>
              </Button>

              <Button
                type="button"
                onClick={handlePrint}
                className="min-h-[40px] sm:min-h-[44px] gap-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-[2px_2px_0px_0px_#18181b] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:shadow-none"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ / PDF</span>
              </Button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: OFFICIAL FORMAL A4 SHEET VIEW (Live & Print Source) */}
          {/* ========================================================= */}
          <div className={activeTab === 'sheet' ? 'block' : 'hidden'}>
            <div className="bg-zinc-200/80 dark:bg-zinc-950/60 p-2 sm:p-4 rounded-2xl border border-zinc-300 dark:border-zinc-800 overflow-x-auto">
              <div
                ref={printSheetRef}
                className="mx-auto w-full max-w-[820px] bg-white text-zinc-900 p-6 sm:p-8 rounded-xl shadow-lg border border-zinc-300"
                style={{ direction: 'rtl', minHeight: '1050px' }}
              >
                {/* 1. Official Government / School Letterhead */}
                <div className="header-box flex items-center justify-between border-b-2 border-zinc-900 pb-3 mb-4">
                  {/* Right: National / School Hierarchy */}
                  <div className="text-right space-y-0.5 text-[11px] font-bold text-zinc-800">
                    <div className="text-xs font-black text-zinc-900">جمهوری اسلامی ایران</div>
                    <div className="text-[10px] text-zinc-600">وزارت آموزش و پرورش</div>
                    <div className="text-[10px] text-zinc-600">اداره کل آموزش و پرورش استان</div>
                    <div className="text-xs font-extrabold text-indigo-950 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 inline text-indigo-700" />
                      <span>{data.tenant?.name || 'هنرستان تخصصی هوشمند رکاد'}</span>
                    </div>
                  </div>

                  {/* Center: Emblem & Official Document Title */}
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center justify-center w-11 h-11 rounded-full border-2 border-zinc-900 bg-zinc-50 mb-0.5 shadow-sm">
                      {data.tenant?.logoUrl ? (
                        <img
                          src={data.tenant.logoUrl}
                          alt="Logo"
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Award className="w-6 h-6 text-zinc-900" />
                      )}
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-zinc-950 leading-tight">
                      کارنامه و پرونده تحلیلی مربی‌گری و هدایت تحصیلی
                    </h2>
                    <p className="text-[11px] font-bold text-zinc-600">
                      دوره هدایت فردی و استعدادسنجی — سال تحصیلی ۱۴۰۴ - ۱۴۰۵
                    </p>
                  </div>

                  {/* Left: Administrative Tracking & Date */}
                  <div className="text-left space-y-1 text-[10.5px] font-bold text-zinc-700">
                    <div>
                      <span className="text-zinc-500">شماره پرونده: </span>
                      <span className="font-black text-zinc-900">{fileTrackingCode}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">تاریخ صدور: </span>
                      <span className="font-black text-zinc-900">{issueDateStr}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">طبقه‌بندی: </span>
                      <span className="px-1.5 py-0.2 bg-zinc-100 border border-zinc-300 rounded text-[9.5px] font-black text-zinc-800">
                        رسمی / محرمانه
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">پیوست: </span>
                      <span className="font-bold text-zinc-800">ریز سوابق جلسات</span>
                    </div>
                  </div>
                </div>

                {/* 2. Student & Mentor Profile Grid */}
                <div className="info-grid grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 border border-zinc-300 rounded-lg p-3 mb-4 text-[11px]">
                  <div className="space-y-0.5">
                    <span className="text-zinc-500 font-bold block text-[10px]">نام و نام خانوادگی:</span>
                    <span className="font-black text-zinc-950 text-xs">{studentFullName}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-zinc-500 font-bold block text-[10px]">شماره دانش‌آموزی:</span>
                    <span className="font-black text-zinc-950">
                      {toPersianDigits(data.student?.studentCode || '---')}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-zinc-500 font-bold block text-[10px]">کد ملی:</span>
                    <span className="font-black text-zinc-950">
                      {toPersianDigits(data.student?.nationalCode || data.student?.nationalId || '---')}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-zinc-500 font-bold block text-[10px]">نام پدر:</span>
                    <span className="font-black text-zinc-950">{data.student?.fatherName || '---'}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-zinc-500 font-bold block text-[10px]">کلاس و پایه تحصیلی:</span>
                    <span className="font-black text-zinc-950">{data.student?.classroom || 'کلاس عمومی'}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-zinc-500 font-bold block text-[10px]">مربی راهنما (کوچ تخصصی):</span>
                    <span className="font-black text-indigo-900">
                      {data.activeCoach
                        ? `${data.activeCoach.firstName} ${data.activeCoach.lastName}`
                        : 'هنوز تخصیص نیافته'}
                    </span>
                  </div>
                  <div className="space-y-0.5 col-span-2">
                    <span className="text-zinc-500 font-bold block text-[10px]">برنامه هفتگی ثابت جلسات:</span>
                    <span className="font-extrabold text-zinc-900">
                      {data.schedule
                        ? `هر دو هفته یک‌بار، روز ${PERSIAN_DAY_NAMES[data.schedule.slotDayOfWeek] || ''} ساعت ${toPersianDigits(data.schedule.slotStartTime)} الی ${toPersianDigits(data.schedule.slotEndTime)} (${toPersianDigits(data.schedule.slotDurationMinutes || 45)} دقیقه)`
                        : 'برنامه زمان‌بندی هفتگی ثبت نشده'}
                    </span>
                  </div>
                </div>

                {/* 3. Executive KPI Scorecards */}
                <div className="kpi-row grid grid-cols-4 gap-2 mb-4">
                  <div className="kpi-box border border-zinc-300 rounded-lg p-2.5 text-center bg-zinc-50">
                    <span className="kpi-num block text-lg font-black text-zinc-950">
                      {toPersianDigits(data.stats?.totalSessions || 0)}
                    </span>
                    <span className="kpi-lbl text-[10px] font-bold text-zinc-500">کل جلسات مقرر</span>
                  </div>
                  <div className="kpi-box border border-emerald-300 rounded-lg p-2.5 text-center bg-emerald-50/60">
                    <span className="kpi-num block text-lg font-black text-emerald-800">
                      {toPersianDigits(data.stats?.attended || 0)}
                    </span>
                    <span className="kpi-lbl text-[10px] font-bold text-emerald-700">جلسات حضور یافته</span>
                  </div>
                  <div className="kpi-box border border-rose-300 rounded-lg p-2.5 text-center bg-rose-50/60">
                    <span className="kpi-num block text-lg font-black text-rose-800">
                      {toPersianDigits(data.stats?.absent || 0)}
                    </span>
                    <span className="kpi-lbl text-[10px] font-bold text-rose-700">غیبت‌های ثبت‌شده</span>
                  </div>
                  <div className="kpi-box border border-indigo-300 rounded-lg p-2.5 text-center bg-indigo-50/60">
                    <span className="kpi-num block text-lg font-black text-indigo-900">
                      ٪{toPersianDigits(data.stats?.attendanceRate || 100)}
                    </span>
                    <span className="kpi-lbl text-[10px] font-bold text-indigo-700">نرخ حضور و انضباط</span>
                  </div>
                </div>

                {/* 4. Detailed Executive Sessions Table */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo-600" />
                      <span>جدول تفصیلی جلسات برگزار شده، شرح گفت‌وگو و ارزیابی مربی:</span>
                    </h4>
                    <span className="text-[10px] font-bold text-zinc-500">
                      تعداد رکوردهای ثبت‌شده: {toPersianDigits(data.sessions?.length || 0)} جلسه
                    </span>
                  </div>

                  <table className="executive-table w-full border-collapse text-right text-[10.5px]">
                    <thead>
                      <tr className="bg-zinc-100 border-b-2 border-zinc-400">
                        <th className="border border-zinc-300 p-2 font-black text-zinc-900 w-10 text-center">
                          ردیف
                        </th>
                        <th className="border border-zinc-300 p-2 font-black text-zinc-900 w-28">
                          تاریخ و روز
                        </th>
                        <th className="border border-zinc-300 p-2 font-black text-zinc-900 w-24">
                          ساعت و مدت
                        </th>
                        <th className="border border-zinc-300 p-2 font-black text-zinc-900 w-20 text-center">
                          نوع
                        </th>
                        <th className="border border-zinc-300 p-2 font-black text-zinc-900 w-20 text-center">
                          وضعیت حضور
                        </th>
                        <th className="border border-zinc-300 p-2 font-black text-zinc-900">
                          شرح گفت‌وگو و مشاهدات تحلیلی مربی
                        </th>
                        <th className="border border-zinc-300 p-2 font-black text-zinc-900 w-48">
                          اهداف و تکالیف تعیین‌شده
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(!data.sessions || data.sessions.length === 0) ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="border border-zinc-300 p-8 text-center text-xs font-bold text-zinc-500"
                          >
                            هیچ جلسه‌ای تاکنون برای این دانش‌آموز در سامانه ثبت نگردیده است.
                          </td>
                        </tr>
                      ) : (
                        data.sessions.map((s: any, idx: number) => {
                          const jalaliDate = formatJalaliDisplay(s.scheduledDate, true);
                          const time = new Date(s.scheduledDate).toLocaleTimeString('fa-IR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          let statusElem = (
                            <span className="badge-w inline-block px-2 py-0.5 rounded text-[9.5px] font-black bg-zinc-100 text-zinc-700 border border-zinc-300">
                              در انتظار
                            </span>
                          );
                          if (s.attendanceStatus === 'PRESENT') {
                            statusElem = (
                              <span className="badge-p inline-block px-2 py-0.5 rounded text-[9.5px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                                حاضر
                              </span>
                            );
                          } else if (s.attendanceStatus === 'ABSENT') {
                            statusElem = (
                              <span className="badge-a inline-block px-2 py-0.5 rounded text-[9.5px] font-black bg-rose-50 text-rose-800 border border-rose-300">
                                غایب
                              </span>
                            );
                          } else if (s.attendanceStatus === 'EXCUSED') {
                            statusElem = (
                              <span className="badge-e inline-block px-2 py-0.5 rounded text-[9.5px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                                موجه
                              </span>
                            );
                          }

                          return (
                            <tr key={s.id} className="border-b border-zinc-200">
                              <td className="border border-zinc-300 p-2 text-center font-bold text-zinc-800">
                                {toPersianDigits(idx + 1)}
                              </td>
                              <td className="border border-zinc-300 p-2 font-bold text-zinc-900 leading-snug">
                                {jalaliDate}
                              </td>
                              <td className="border border-zinc-300 p-2 text-zinc-700 font-medium">
                                ساعت {time}
                                <span className="block text-[9.5px] text-zinc-500">
                                  ({toPersianDigits(s.durationMinutes || 45)} دقیقه)
                                </span>
                              </td>
                              <td className="border border-zinc-300 p-2 text-center font-medium text-[10px]">
                                {s.sessionType === 'EXTRA' ? (
                                  <span className="font-bold text-purple-800">فوق‌العاده</span>
                                ) : (
                                  <span className="text-zinc-600">دوره‌ای</span>
                                )}
                              </td>
                              <td className="border border-zinc-300 p-2 text-center">
                                {statusElem}
                              </td>
                              <td className="border border-zinc-300 p-2 text-zinc-800 leading-relaxed">
                                {s.coachNotes ? (
                                  <div className="font-medium text-[10.5px]">{s.coachNotes}</div>
                                ) : (
                                  <span className="text-zinc-400 italic text-[10px]">
                                    یادداشتی درج نشده است.
                                  </span>
                                )}
                              </td>
                              <td className="border border-zinc-300 p-2 text-zinc-800 leading-relaxed bg-zinc-50/50">
                                {s.actionItems ? (
                                  <div className="font-semibold text-indigo-950 text-[10px]">
                                    {s.actionItems}
                                  </div>
                                ) : (
                                  <span className="text-zinc-400 italic text-[10px]">---</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 5. Strategic Coach Summary & Guidance */}
                <div className="mb-5 border border-zinc-300 rounded-lg p-3 bg-zinc-50/70">
                  <h5 className="text-[11px] font-black text-zinc-900 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span>جمع‌بندی تحلیلی و توصیه‌های راهبردی مربی برای دوره آتی:</span>
                  </h5>
                  <p className="text-[10.5px] text-zinc-700 leading-relaxed font-medium">
                    {data.stats?.attendanceRate >= 80
                      ? 'روند مشارکت و حضور دانش‌آموز در جلسات منظم و متعهدانه بوده است. استمرار پیگیری تکالیف و اهداف تعیین‌شده می‌تواند منجر به ارتقای مهارت‌های فردی و تحصیلی پایدار گردد.'
                      : data.stats?.attendanceRate >= 50
                      ? 'دانش‌آموز دارای پتانسیل مطلوب است لیکن به دلیل غیبت در برخی جلسات، نیازمند هماهنگی بیشتر با خانواده و تقویت نظم حضور می‌باشد.'
                      : 'به دلیل غیبت‌های مکرر در جلسات مربی‌گری، لزوم تشکیل جلسه ویژه با اولیا و بررسی موانع حضور احساس می‌گردد.'}
                  </p>
                </div>

                {/* 6. Triple Signatures & Official Stamp Grid */}
                <div className="signatures-row grid grid-cols-3 gap-3 pt-2">
                  <div className="sign-card border border-zinc-400 rounded-lg p-2.5 h-24 flex flex-col justify-between text-[10px]">
                    <span className="font-black text-zinc-900">
                      مربی راهنما (کوچ تحصیلی):{' '}
                      {data.activeCoach
                        ? `${data.activeCoach.firstName} ${data.activeCoach.lastName}`
                        : '---'}
                    </span>
                    <span className="text-[9px] text-zinc-400 italic">امضا و تاریخ:</span>
                  </div>

                  <div className="sign-card border border-zinc-400 rounded-lg p-2.5 h-24 flex flex-col justify-between text-[10px]">
                    <span className="font-black text-zinc-900">رویت و تایید اولیای محترم دانش‌آموز:</span>
                    <span className="text-[9px] text-zinc-500">
                      «مفاد این پرونده و گزارش جلسات رویت شد.»
                    </span>
                    <span className="text-[9px] text-zinc-400 italic">امضا و تاریخ:</span>
                  </div>

                  <div className="sign-card border border-zinc-400 rounded-lg p-2.5 h-24 flex flex-col justify-between text-[10px]">
                    <span className="font-black text-zinc-900">
                      مهر و امضای مدیریت آموزشگاه:
                    </span>
                    <span className="text-[9px] text-zinc-400 italic text-left pl-2">مهر رسمی</span>
                  </div>
                </div>

                {/* 7. Footer Note & Digital Verification Stamp */}
                <div className="footer-note flex items-center justify-between mt-4 pt-2 border-t border-zinc-200 text-[9px] text-zinc-500 font-medium">
                  <div>
                    <span>نشانی: {data.tenant?.address || 'تهران، مجتمع آموزشی رکاد'}</span>
                    {data.tenant?.phone && (
                      <span className="mr-3">تلفن: {toPersianDigits(data.tenant.phone)}</span>
                    )}
                  </div>
                  <div>
                    <span>شناسه دیجیتال یکپارچه رکاد — صادر شده به صورت سیستمی</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 2: INTERACTIVE SCREEN CARDS VIEW                      */}
          {/* ========================================================= */}
          <div className={activeTab === 'interactive' ? 'block' : 'hidden'}>
            <div className="space-y-4">
              {/* Header Card */}
              <div className="rounded-2xl border-2 border-zinc-900 bg-zinc-50 p-5 shadow-[3px_3px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-800/60 dark:shadow-[3px_3px_0px_0px_#f4f4f5]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 mb-1">
                      <Target className="w-4 h-4" />
                      <span>فرآیند هدایت فردی و مربی‌گری تحصیلی</span>
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
                      {studentFullName}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      <span>کلاس: {data.student?.classroom}</span>
                      {data.student?.studentCode && (
                        <span>شماره دانش‌آموزی: {toPersianDigits(data.student.studentCode)}</span>
                      )}
                      {data.activeCoach && (
                        <span className="text-primary font-black">
                          مربی تخصصی: {data.activeCoach.firstName} {data.activeCoach.lastName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fixed Schedule Slot */}
                {data.schedule && (
                  <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center gap-4 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                      <CalendarDays className="w-4 h-4" />
                      برنامه ثابت: هر دو هفته یک‌بار، {PERSIAN_DAY_NAMES[data.schedule.slotDayOfWeek] || 'نامشخص'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      ساعت {toPersianDigits(data.schedule.slotStartTime)} الی {toPersianDigits(data.schedule.slotEndTime)}
                    </span>
                    <span className="bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded text-[11px]">
                      جلسات {toPersianDigits(data.schedule.slotDurationMinutes || 45)} دقیقه‌ای
                    </span>
                  </div>
                )}
              </div>

              {/* KPI Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border-2 border-zinc-900 bg-white p-3 text-center shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900">
                  <span className="block text-2xl font-black text-zinc-900 dark:text-zinc-100">
                    {toPersianDigits(data.stats?.totalSessions || 0)}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-500">کل جلسات ثبت‌شده</span>
                </div>
                <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50 p-3 text-center shadow-[2px_2px_0px_0px_#059669] dark:bg-emerald-950/40">
                  <span className="block text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {toPersianDigits(data.stats?.attended || 0)}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">جلسات حضور یافته</span>
                </div>
                <div className="rounded-xl border-2 border-rose-600 bg-rose-50 p-3 text-center shadow-[2px_2px_0px_0px_#e11d48] dark:bg-rose-950/40">
                  <span className="block text-2xl font-black text-rose-700 dark:text-rose-300">
                    {toPersianDigits(data.stats?.absent || 0)}
                  </span>
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">جلسات غیبت</span>
                </div>
                <div className="rounded-xl border-2 border-indigo-600 bg-indigo-50 p-3 text-center shadow-[2px_2px_0px_0px_#4f46e5] dark:bg-indigo-950/40">
                  <span className="block text-2xl font-black text-indigo-700 dark:text-indigo-300">
                    ٪{toPersianDigits(data.stats?.attendanceRate || 100)}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">نرخ مشارکت و حضور</span>
                </div>
              </div>

              {/* Sessions List Cards */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>ریز جلسات و یادداشت‌های تفصیلی مربی:</span>
                </h4>

                {(!data.sessions || data.sessions.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-xs font-bold text-zinc-400">
                    هنوز جلسه‌ای برای این دانش‌آموز ثبت نشده است.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {data.sessions.map((s: any) => {
                      const jalaliDate = formatJalaliDisplay(s.scheduledDate, true);
                      const time = new Date(s.scheduledDate).toLocaleTimeString('fa-IR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      let statusBadge = (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-zinc-300 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          در انتظار برگزاری
                        </span>
                      );
                      if (s.attendanceStatus === 'PRESENT') {
                        statusBadge = (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            حاضر
                          </span>
                        );
                      } else if (s.attendanceStatus === 'ABSENT') {
                        statusBadge = (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            غایب
                          </span>
                        );
                      } else if (s.attendanceStatus === 'EXCUSED') {
                        statusBadge = (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            غایب موجه
                          </span>
                        );
                      }

                      return (
                        <div
                          key={s.id}
                          className="rounded-xl border-2 border-zinc-900 bg-white p-4 shadow-[2px_2px_0px_0px_#18181b] dark:border-zinc-200 dark:bg-zinc-900 dark:shadow-[2px_2px_0px_0px_#f4f4f5] space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                                {jalaliDate}
                              </span>
                              <span className="text-[11px] font-bold text-zinc-500">
                                ساعت {time} ({toPersianDigits(s.durationMinutes || 45)} دقیقه)
                              </span>
                              {s.sessionType === 'EXTRA' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black border border-purple-400 bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                  فوق‌العاده
                                </span>
                              )}
                            </div>
                            <div>{statusBadge}</div>
                          </div>

                          {/* Coach Notes */}
                          {s.coachNotes ? (
                            <div className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 leading-relaxed font-medium">
                              <span className="block font-black text-primary mb-1">
                                یادداشت و مشاهدات مربی:
                              </span>
                              {s.coachNotes}
                            </div>
                          ) : (
                            <p className="text-[11px] text-zinc-400 italic">
                              یادداشتی برای این جلسه درج نشده است.
                            </p>
                          )}

                          {/* Action items */}
                          {s.actionItems && (
                            <div className="text-xs text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 leading-relaxed font-bold">
                              <span>اهداف و تکالیف تعیین‌شده: </span>
                              <span>{s.actionItems}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
