import React, { useState } from 'react';
import {
  Send,
  Users,
  User,
  GraduationCap,
  PhoneCall,
  Sparkles,
  Search,
  Check,
  X,
  Layers,
  CheckCircle2,
  Tag,
  Clock,
  Filter,
  Calculator,
  CreditCard,
  Coins,
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';
import { toast } from 'sonner';

interface ManualSmsTabProps {
  classrooms: any[];
  usersList: any[];
  quickTemplates: any[];
  isSending: boolean;
  messageText: string;
  setMessageText: (text: string) => void;
  targetType: 'ROLE' | 'CLASS' | 'INDIVIDUAL' | 'DIRECT_PHONE';
  setTargetType: (t: 'ROLE' | 'CLASS' | 'INDIVIDUAL' | 'DIRECT_PHONE') => void;
  targetRole: 'ALL' | 'PARENTS' | 'STUDENTS' | 'TEACHERS' | 'STAFF';
  setTargetRole: (r: 'ALL' | 'PARENTS' | 'STUDENTS' | 'TEACHERS' | 'STAFF') => void;
  selectedClassroomId: string;
  setSelectedClassroomId: (id: string) => void;
  classAudience: 'PARENTS' | 'STUDENTS' | 'BOTH';
  setClassAudience: (a: 'PARENTS' | 'STUDENTS' | 'BOTH') => void;
  selectedUserIds: string[];
  setSelectedUserIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  directPhone: string;
  setDirectPhone: (p: string) => void;
  charCount: number;
  smsParts: number;
  charsRemainingInPart?: number;
  unitTariffTomans?: number;
  singleRecipientCostTomans?: number;
  totalCostTomans?: number;
  estimatedRecipients?: number;
  liveCreditTomans?: number;
  creditAfterSendTomans?: number;
  isConfigLoading?: boolean;
  onSendSms: () => void;
}

export const ManualSmsTab: React.FC<ManualSmsTabProps> = ({
  classrooms,
  usersList,
  quickTemplates,
  isSending,
  messageText,
  setMessageText,
  targetType,
  setTargetType,
  targetRole,
  setTargetRole,
  selectedClassroomId,
  setSelectedClassroomId,
  classAudience,
  setClassAudience,
  selectedUserIds,
  setSelectedUserIds,
  directPhone,
  setDirectPhone,
  charCount,
  smsParts,
  charsRemainingInPart = 0,
  unitTariffTomans = 0,
  singleRecipientCostTomans = 0,
  totalCostTomans = 0,
  estimatedRecipients = 0,
  liveCreditTomans = 0,
  creditAfterSendTomans = 0,
  isConfigLoading = false,
  onSendSms,
}) => {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'MANAGEMENT' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF'>('ALL');

  // Insert variable into message
  const insertVariable = (variableKey: string) => {
    setMessageText(messageText + variableKey);
  };

  // Filter users list for individual selection
  const filteredUsers = usersList.filter((u: any) => {
    const fullName = `${u.firstName || ''} ${u.lastName || ''} ${u.name || ''}`.toLowerCase();
    const phone = (u.phone || '').toLowerCase();
    const matchesSearch = fullName.includes(userSearchQuery.toLowerCase()) || phone.includes(userSearchQuery);

    if (!matchesSearch) return false;
    if (userRoleFilter === 'ALL') return true;
    if (userRoleFilter === 'MANAGEMENT') {
      return u.role === 'SUPER_ADMIN' || u.role === 'SCHOOL_ADMIN' || u.role === 'STAFF';
    }
    if (userRoleFilter === 'TEACHERS') return u.role === 'TEACHER';
    if (userRoleFilter === 'STUDENTS') return u.role === 'STUDENT';
    if (userRoleFilter === 'PARENTS') return u.role === 'PARENT';
    return true;
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev: string[]) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Target Type Selection (Neo-brutalist Segmented Selector) */}
      <div className="rokad-card p-5 sm:p-6 bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-800 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <div className="flex items-center gap-2 mb-4">
          <span className="p-1.5 rounded-xl bg-ecosystem-light dark:bg-ecosystem-darker/60 text-primary">
            <Users className="w-4 h-4" />
          </span>
          <h3 className="text-sm sm:text-base font-black text-sec dark:text-white">
            مرحله ۱: انتخاب جامعه مخاطبان و گیرندگان
          </h3>
        </div>

        {/* 4 Segmented Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setTargetType('ROLE')}
            className={`p-3.5 rounded-xl border-[1.5px] text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              targetType === 'ROLE'
                ? 'bg-primary-light/40 dark:bg-primary-darker/40 border-primary shadow-[2.5px_2.5px_0_#59BBAF]'
                : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl ${targetType === 'ROLE' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                <Users className="w-4 h-4" />
              </span>
              {targetType === 'ROLE' && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-black text-sec dark:text-white">گروهی و نقشی</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">ارسال به کل اولیا، همکاران یا دانش‌آموزان</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTargetType('CLASS')}
            className={`p-3.5 rounded-xl border-[1.5px] text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              targetType === 'CLASS'
                ? 'bg-primary-light/40 dark:bg-primary-darker/40 border-primary shadow-[2.5px_2.5px_0_#59BBAF]'
                : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl ${targetType === 'CLASS' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                <GraduationCap className="w-4 h-4" />
              </span>
              {targetType === 'CLASS' && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-black text-sec dark:text-white">بر اساس کلاس درس</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">ارسال اختصاصی به اولیا یا دانش‌آموزان یک کلاس</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTargetType('INDIVIDUAL')}
            className={`p-3.5 rounded-xl border-[1.5px] text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              targetType === 'INDIVIDUAL'
                ? 'bg-primary-light/40 dark:bg-primary-darker/40 border-primary shadow-[2.5px_2.5px_0_#59BBAF]'
                : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl ${targetType === 'INDIVIDUAL' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                <User className="w-4 h-4" />
              </span>
              {targetType === 'INDIVIDUAL' && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-black text-sec dark:text-white">انتخاب از مخاطبان</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">جستجو و گلچین افراد از دفترچه تلفن</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTargetType('DIRECT_PHONE')}
            className={`p-3.5 rounded-xl border-[1.5px] text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
              targetType === 'DIRECT_PHONE'
                ? 'bg-primary-light/40 dark:bg-primary-darker/40 border-primary shadow-[2.5px_2.5px_0_#59BBAF]'
                : 'bg-[#FAFAFA] dark:bg-[#1C2536] border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`p-2 rounded-xl ${targetType === 'DIRECT_PHONE' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                <PhoneCall className="w-4 h-4" />
              </span>
              {targetType === 'DIRECT_PHONE' && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-black text-sec dark:text-white">شماره همراه مستقیم</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">وارد کردن دستی شماره ۱۱ رقمی دلخواه</span>
            </div>
          </button>
        </div>

        {/* Dynamic Secondary Inputs based on selected Target Type */}
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          {targetType === 'ROLE' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                گروه هدف مورد نظر را انتخاب کنید:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { role: 'PARENTS', label: 'اولیای تمام دانش‌آموزان' },
                  { role: 'STUDENTS', label: 'تمام دانش‌آموزان' },
                  { role: 'TEACHERS', label: 'کادر آموزشی و مربیان' },
                  { role: 'STAFF', label: 'کادر اجرایی و اداری' },
                  { role: 'ALL', label: 'تمامی اعضای مدرسه' },
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setTargetRole(item.role as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      targetRole === item.role
                        ? 'bg-sec text-white border-sec shadow-[2px_2px_0_#0B0F1F]'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {targetType === 'CLASS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  کلاس درس مورد نظر:
                </label>
                <select
                  value={selectedClassroomId}
                  onChange={(e) => setSelectedClassroomId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs sm:text-sm font-medium focus:border-primary focus:outline-none transition"
                >
                  <option value="">-- لطفاً یک کلاس را انتخاب کنید --</option>
                  {classrooms.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.gradeLevel ? `(${c.gradeLevel})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  مخاطبان این کلاس:
                </label>
                <div className="flex gap-2">
                  {[
                    { key: 'PARENTS', label: 'فقط اولیای کلاس' },
                    { key: 'STUDENTS', label: 'فقط دانش‌آموزان' },
                    { key: 'BOTH', label: 'هم اولیا و هم دانش‌آموزان' },
                  ].map((aud) => (
                    <button
                      key={aud.key}
                      type="button"
                      onClick={() => setClassAudience(aud.key as any)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        classAudience === aud.key
                          ? 'bg-sec text-white border-sec shadow-[2px_2px_0_#0B0F1F]'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {targetType === 'INDIVIDUAL' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="جستجوی نام مخاطب، نام پدر یا شماره تماس..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs font-medium focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {[
                    { key: 'ALL', label: 'همه' },
                    { key: 'PARENTS', label: 'اولیا' },
                    { key: 'STUDENTS', label: 'دانش‌آموزان' },
                    { key: 'TEACHERS', label: 'مربیان' },
                    { key: 'MANAGEMENT', label: 'مدیریت' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setUserRoleFilter(f.key as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                        userRoleFilter === f.key
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Pills */}
              {selectedUserIds.length > 0 && (
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ml-2">
                    انتخاب‌شده‌ها ({toPersianDigits(selectedUserIds.length)}):
                  </span>
                  {selectedUserIds.map((uid) => {
                    const u = usersList.find((x: any) => x.id === uid);
                    const name = u ? `${u.firstName || ''} ${u.lastName || ''} ${u.name || ''}`.trim() : uid;
                    return (
                      <span
                        key={uid}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-light dark:bg-primary-darker/60 text-primary-darker dark:text-primary-light border border-primary/30"
                      >
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => toggleUserSelection(uid)}
                          className="hover:text-red-500 transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="text-[11px] text-red-500 font-bold hover:underline mr-auto"
                  >
                    پاکسازی همه
                  </button>
                </div>
              )}

              {/* Contacts Grid */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-[#FAFAFA] dark:bg-[#1C2536]">
                {filteredUsers.slice(0, 40).map((u: any) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const fullName = `${u.firstName || ''} ${u.lastName || ''} ${u.name || ''}`.trim() || 'بدون نام';
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUserSelection(u.id)}
                      className={`p-2 rounded-lg border text-right flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? 'bg-primary-light/50 dark:bg-primary-darker/40 border-primary'
                          : 'bg-white dark:bg-[#151C28] border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <span className="block text-xs font-bold text-sec dark:text-white truncate">
                          {fullName}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                          {toPersianDigits(u.phone || 'بدون شماره')}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {targetType === 'DIRECT_PHONE' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                شماره همراه گیرنده(ها):
              </label>
              <div className="relative max-w-lg">
                <PhoneCall className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                <textarea
                  rows={2}
                  placeholder="مثال: 09121234567 یا با اینتر و ویرگول چندین شماره وارد کنید..."
                  value={directPhone}
                  onChange={(e) => setDirectPhone(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-xs sm:text-sm font-mono text-left focus:border-primary focus:outline-none transition leading-relaxed resize-none"
                  dir="ltr"
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-400">
                می‌توانید یک شماره یا چند شماره (با خط جدید یا کاما) وارد کنید تا هزینه به تعداد گیرنده‌ها محاسبه شود.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Message Composer (Neo-brutalist Textarea & Tools) */}
      <div className="rokad-card p-5 sm:p-6 bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-800 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary-light dark:bg-primary-darker/60 text-primary">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-sm sm:text-base font-black text-sec dark:text-white">
              مرحله ۲: نگارش متن و ارسال پیامک
            </h3>
          </div>

          {/* Quick Clear Button */}
          {messageText.length > 0 && (
            <button
              type="button"
              onClick={() => setMessageText('')}
              className="text-xs text-red-500 font-bold hover:underline"
            >
              پاک کردن متن
            </button>
          )}
        </div>

        {/* Quick Template Pills Row */}
        {quickTemplates.length > 0 && (
          <div className="mb-3">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1.5">
              درج سریع از الگوهای آماده:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {quickTemplates.map((qt: any) => (
                <button
                  key={qt.id}
                  type="button"
                  onClick={() => {
                    setMessageText(qt.content);
                    toast.info(`الگوی «${qt.title}» درج گردید.`);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-[#1C2536] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary transition cursor-pointer truncate max-w-[200px]"
                  title={qt.content}
                >
                  {qt.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Variable Chips Row */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 ml-1">
            درج متغیر هوشمند:
          </span>
          {[
            { key: '{نام}', desc: 'نام مخاطب' },
            { key: '{کلاس}', desc: 'کلاس درس' },
            { key: '{تاریخ}', desc: 'تاریخ روز' },
            { key: '{مدرسه}', desc: 'نام مجتمع' },
          ].map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => insertVariable(v.key)}
              className="px-2 py-0.5 rounded-md bg-[#59BBAF]/15 hover:bg-[#59BBAF]/25 text-[#1F413D] dark:text-[#59BBAF] border border-primary/30 text-xs font-mono font-bold transition"
            >
              + {v.key}
            </button>
          ))}
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            rows={5}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="متن پیامک ارسالی را در این بخش بنویسید..."
            className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#FAFAFA] dark:bg-[#1C2536] text-ink-normal dark:text-white text-xs sm:text-sm leading-relaxed font-medium focus:border-primary focus:bg-white dark:focus:bg-[#1C2536] focus:outline-none transition-all shadow-inner"
          />
        </div>

        {/* Bottom Specs Bar */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-gray-600 dark:text-gray-300">
              کاراکترها: <strong className="text-sec dark:text-white font-mono">{toPersianDigits(charCount)}</strong>
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              ({toPersianDigits(charsRemainingInPart)} کاراکتر تا پارت بعدی)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-ecosystem-light dark:bg-ecosystem-darker/60 text-primary-darker dark:text-primary border border-primary/30 font-bold font-mono text-[11px]">
              {toPersianDigits(smsParts)} پارت پیامک
            </span>
          </div>
        </div>
      </div>

      {/* 3. Live Amoot Financial Estimation & Send Action */}
      <div className="rokad-card p-4 sm:p-5 bg-white dark:bg-[#151C28] border-[1.5px] border-gray-200 dark:border-gray-800 shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF]">
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-ecosystem-light dark:bg-ecosystem-darker/60 border border-primary/40 flex items-center justify-center text-primary shadow-[1.5px_1.5px_0_#59BBAF] shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-sec dark:text-white">
              برآورد هزینه و کسر اعتبار
            </h3>
          </div>

          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-[#FAFAFA] dark:bg-[#1C2536] border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-lg font-mono">
            {isConfigLoading || unitTariffTomans === 0
              ? 'در حال استعلام تعرفه...'
              : `تعرفه: ${toPersianDigits(unitTariffTomans)} ت / پارت`}
          </span>
        </div>

        {/* 4 Persona Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* 1. SMS Parts & Length */}
          <div className="rokad-card rounded-xl border-[1.5px] border-[#EAEAEA] dark:border-[#242F42] bg-[#FAFAFA] dark:bg-[#1C2536] p-3 text-right shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
              حجم پیامک
            </span>
            <div className="text-base sm:text-lg font-black text-sec dark:text-white font-mono">
              {toPersianDigits(smsParts)} پارت
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
              {toPersianDigits(charCount)} کاراکتر
            </div>
          </div>

          {/* 2. Single Recipient Cost */}
          <div className="rokad-card rounded-xl border-[1.5px] border-[#EAEAEA] dark:border-[#242F42] bg-[#FAFAFA] dark:bg-[#1C2536] p-3 text-right shadow-[2px_2px_0_#F8A41D]">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
              هزینه هر پیامک
            </span>
            <div className="text-base sm:text-lg font-black text-sec dark:text-white font-mono">
              {isConfigLoading || singleRecipientCostTomans === 0
                ? '...'
                : `${toPersianDigits(singleRecipientCostTomans.toLocaleString())} تومان`}
            </div>
            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
              برای هر گیرنده
            </div>
          </div>

          {/* 3. Total Cost */}
          <div className="rokad-card rounded-xl border-[1.5px] border-primary/40 dark:border-primary/50 bg-primary-light/40 dark:bg-primary-darker/40 p-3 text-right shadow-[2px_2px_0_#59BBAF]">
            <span className="text-[11px] font-bold text-primary-darker dark:text-primary-light block mb-1">
              مجموع کسر از حساب
            </span>
            <div className="text-base sm:text-lg font-black text-primary-darker dark:text-white font-mono">
              {isConfigLoading && estimatedRecipients > 0
                ? '...'
                : `${toPersianDigits(totalCostTomans.toLocaleString())} تومان`}
            </div>
            <div className="text-[10px] text-primary-darker/70 dark:text-primary-light/70 font-mono mt-0.5">
              {toPersianDigits(estimatedRecipients)} مخاطب
            </div>
          </div>

          {/* 4. Credit Remaining */}
          <div className="rokad-card rounded-xl border-[1.5px] border-[#EAEAEA] dark:border-[#242F42] bg-[#FAFAFA] dark:bg-[#1C2536] p-3 text-right shadow-[2px_2px_0_#202A5A] dark:shadow-[2px_2px_0_#59BBAF]">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
              مانده پس از ارسال
            </span>
            <div className="text-base sm:text-lg font-black font-mono">
              {isConfigLoading ? (
                <span className="text-sec dark:text-white">...</span>
              ) : creditAfterSendTomans < 0 ? (
                <span className="text-red-500 font-bold" title="کسری موجودی">
                  {toPersianDigits(Math.abs(creditAfterSendTomans).toLocaleString())}- تومان
                </span>
              ) : (
                <span className="text-sec dark:text-white">
                  {toPersianDigits(creditAfterSendTomans.toLocaleString())} تومان
                </span>
              )}
            </div>
            <div className="text-[10px] font-mono mt-0.5">
              {isConfigLoading ? (
                <span className="text-gray-400">در حال دریافت...</span>
              ) : creditAfterSendTomans < 0 ? (
                <span className="text-red-500 font-bold">کسری موجودی شارژ</span>
              ) : (
                <span className="text-gray-400">فعلی: {toPersianDigits(liveCreditTomans.toLocaleString())} ت</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            disabled={isSending || !messageText.trim()}
            onClick={onSendSms}
            className="rokad-btn-primary px-7 py-2.5 text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[2.5px_2.5px_0_#1F413D] w-full sm:w-auto"
          >
            {isSending ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>در حال ارسال...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>ارسال پیامک</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
