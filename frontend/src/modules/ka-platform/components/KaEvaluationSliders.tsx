import React, { useState, useMemo } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { 
  GraduationCap, 
  HeartHandshake, 
  Briefcase, 
  AlertOctagon, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Award,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toPersianDigits } from '../../../lib/utils';

interface KaEvaluationSlidersProps {
  submissions?: any[];
}

export const KaEvaluationSliders: React.FC<KaEvaluationSlidersProps> = ({
  submissions = [],
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // استخراج امتیازات تایید شده در ۴ حوزه
  const categoryScores = useMemo(() => {
    let educational = 0;
    let voluntary = 0;
    let career = 0;
    let deductions = 0;

    submissions.forEach(sub => {
      if (sub.status !== 'APPROVED') return;
      const score = Number(sub.scoreAwarded || 0);
      const parent = sub.activity?.parent || '';

      if (parent.includes('آموزشی')) {
        educational += score;
      } else if (parent.includes('داوطلبانه') || parent.includes('توسعه فردی')) {
        voluntary += score;
      } else if (parent.includes('شغلی')) {
        career += score;
      } else if (parent.includes('کسر') || parent.includes('انضباطی') || score < 0) {
        deductions += Math.abs(score);
      }
    });

    return {
      educational,
      voluntary,
      career,
      deductions,
    };
  }, [submissions]);

  // تعریف ساختار ۴ دسته به همراه ریز فعالیت‌ها بر اساس جدول اکسل و پروداکت
  const categories = [
    {
      id: 'educational',
      title: 'فعالیت‌های آموزشی',
      subtitle: 'Educational Track',
      icon: GraduationCap,
      color: '#202A5A',
      accentColor: '#3B82F6',
      cardShadow: 'shadow-[3px_3px_0_#202A5A] dark:shadow-[3px_3px_0_#59BBAF]',
      badgeBg: 'bg-[#202A5A]/10 dark:bg-[#59BBAF]/15 text-[#202A5A] dark:text-[#59BBAF]',
      progressGradient: 'from-[#1E3A8A] via-[#2563EB] to-[#60A5FA]',
      earnedScore: categoryScores.educational,
      maxScore: 580,
      description: 'معدل‌های ترم، آزمون‌های تعیین سطح مهارت و رتبه مسابقات علمی',
      activitiesList: [
        { name: 'معدل نوبت اول', range: '۰ تا ۲۰ (گام ۰.۲۵)', formula: 'GPA × ۵', max: 100 },
        { name: 'معدل نوبت دوم', range: '۰ تا ۲۰ (گام ۰.۲۵)', formula: 'GPA × ۱۰', max: 200 },
        { name: 'سطح مهارت ۱', range: '۰ تا ۱۰۰ (گام ۱)', formula: 'نمره آزمون × ۱', max: 100 },
        { name: 'سطح مهارت ۲', range: '۰ تا ۱۰۰ (گام ۱)', formula: 'نمره آزمون × ۱', max: 100 },
        { name: 'رتبه المپیاد و مسابقات علمی', range: 'انتخابی سطحی', formula: 'رتبه اول استانی: ۸۰ | دوم: ۶۰ | سوم: ۴۰ | منطقه: ۲۵', max: 80 },
      ],
    },
    {
      id: 'voluntary',
      title: 'فعالیت‌های داوطلبانه و توسعه فردی',
      subtitle: 'Personal Growth & Voluntary',
      icon: HeartHandshake,
      color: '#652D90',
      accentColor: '#8B5CF6',
      cardShadow: 'shadow-[3px_3px_0_#652D90]',
      badgeBg: 'bg-[#652D90]/10 dark:bg-[#652D90]/25 text-[#652D90] dark:text-[#C084FC]',
      progressGradient: 'from-[#581C87] via-[#7E22CE] to-[#A855F7]',
      earnedScore: categoryScores.voluntary,
      maxScore: 360,
      description: 'جلسات کوچینگ، رویدادهای مدرسه‌ای و برون‌مدرسه‌ای، لیگ‌ها و کتابخوانی',
      activitiesList: [
        { name: 'تعداد جلسات کوچینگ', range: '۱ تا ۵ جلسه', formula: 'تعداد جلسات × ۵', max: 25 },
        { name: 'کیفیت حضور در کوچینگ', range: '۱ تا ۵ امتیاز کیفی', formula: 'امتیاز ارزیابی × ۱', max: 5 },
        { name: 'شرکت در رویدادهای برون‌مدرسه‌ای', range: '۱ تا ۵ رویداد', formula: 'تعداد رویداد × ۱۵', max: 75 },
        { name: 'شرکت در رویدادهای درون‌مدرسه‌ای', range: '۱ تا ۵ رویداد', formula: 'تعداد رویداد × ۱۰', max: 50 },
        { name: 'دوره‌های آموزشی برون‌مدرسه‌ای', range: '۱ تا ۵ دوره', formula: 'تعداد دوره‌ها × ۱۰', max: 50 },
        { name: 'امتیاز در لیگ‌های درون‌مدرسه‌ای', range: '۲۰ تا ۱۰۰۰ امتیاز لیگ', formula: 'امتیاز لیگ × ۰.۰۵', max: 50 },
        { name: 'کتابخوانی و خلاصه‌نویسی', range: '۱۰۰ تا ۵۰۰ صفحه', formula: 'بیش از ۲۰۰ صفحه: ۲۰ امت | ۱۰۰ تا ۲۰۰: ۱۰ امت', max: 20 },
        { name: 'کسب رتبه در جشنواره‌ها', range: 'انتخابی پلکانی', formula: 'کشوری (۴۰ تا ۵۰) | استانی (۳۰ تا ۴۰) | منطقه (۲۰ تا ۳۰)', max: 50 },
        { name: 'همکاری در رویدادها و کارگاه‌ها', range: 'انتخابی سطحی', formula: 'ارائه کارگاه: ۳۵ | اجرایی: ۲۰ | مستندسازی: ۱۵', max: 35 },
      ],
    },
    {
      id: 'career',
      title: 'فعالیت‌های شغلی و حرفه‌ای',
      subtitle: 'Professional & Career',
      icon: Briefcase,
      color: '#0D9488',
      accentColor: '#14B8A6',
      cardShadow: 'shadow-[3px_3px_0_#59BBAF]',
      badgeBg: 'bg-[#59BBAF]/15 dark:bg-[#59BBAF]/25 text-[#0F766E] dark:text-[#59BBAF]',
      progressGradient: 'from-[#0F766E] via-[#0D9488] to-[#2DD4BF]',
      earnedScore: categoryScores.career,
      maxScore: 235,
      description: 'پروژه‌های واقعی برای کارفرما، کارآموزی، فریلنسری و قراردادهای رسمی',
      activitiesList: [
        { name: 'پروژه واقعی برای کارفرما', range: '۱ تا ۵۰ ساعت کار', formula: 'ساعت کارکرد × ۲', max: 100 },
        { name: 'کارآموزی و کارورزی در شرکت‌ها', range: 'سطوح کیفی شرکت', formula: 'شرکت سطح A+ (دانش‌بنیان): ۵۰ | سطح B: ۳۰', max: 50 },
        { name: 'پروژه‌های فریلنسری (درآمدی)', range: 'سطوح کیفی پروژه', formula: 'سطح A+: ۱۵ | سطح B+: ۱۰ | سطح C+: ۵', max: 15 },
        { name: 'قراردادهای استخدامی رسمی', range: 'سطوح شرکتی', formula: 'استخدام در شرکت سطح A+: ۷۰ | سطح B+: ۵۰', max: 70 },
      ],
    },
    {
      id: 'deductions',
      title: 'موارد کسر امتیاز انضباطی',
      subtitle: 'Disciplinary Deductions',
      icon: AlertOctagon,
      color: '#E0195B',
      accentColor: '#F43F5E',
      cardShadow: 'shadow-[3px_3px_0_#E0195B]',
      badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
      progressGradient: 'from-[#BE123C] via-[#E11D48] to-[#FB7185]',
      earnedScore: categoryScores.deductions,
      maxScore: null,
      description: 'غیبت و تأخیر غیرموجه کلاسی، انضباطی و تاخیر در تحویل پروژه‌ها',
      activitiesList: [
        { name: 'غیبت غیرموجه در کلاس', range: '۱ تا ۱۰ جلسه', formula: 'تعداد غیبت × (۱-)', max: -10 },
        { name: 'تأخیر غیرموجه در کلاس', range: '۱ تا ۲۰ مرتبه', formula: 'تعداد تاخیر × (۰.۵-)', max: -10 },
        { name: 'سایر موارد انضباطی', range: '۱ تا ۵ مورد', formula: 'تعداد موارد × (۲-)', max: -10 },
        { name: 'تاخیر در تحویل پروژه کارگاهی', range: 'بازه تاخیر زمانی', formula: 'تا ۱ هفته تاخیر: ۱۰- | بیش از ۱ هفته: ۲۵-', max: -25 },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* هدر بخش وضعیت دسته‌بندی‌ها */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-gray-100 dark:border-gray-800/80 pb-4">
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            وضعیت دسته‌بندی فعالیت‌ها
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            روند پیشرفت شما در ۴ حوزه امتیازدهی (محاسبه خودکار بر اساس پرونده تأییدشده شما)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="text-xs font-bold border border-gray-200 dark:border-gray-700 py-1 px-3">
            ۴ حوزه ارزیابی کا
          </Badge>
        </div>
      </div>

      {/* شبکه ۲×۲ کارت‌های اسلایدر با طراحی مدرن نئوبروتالیسم */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isDeduction = cat.id === 'deductions';
          const percentage = cat.maxScore
            ? Math.min(Math.round((cat.earnedScore / cat.maxScore) * 100), 100)
            : cat.earnedScore > 0 ? 100 : 0;
          const isExpanded = expandedCategory === cat.id;

          return (
            <div
              key={cat.id}
              className={`rounded-3xl border-2 bg-white dark:bg-[#151C28] p-6 transition-all ${
                cat.cardShadow
              } ${
                isDeduction && cat.earnedScore > 0
                  ? 'border-rose-300 dark:border-rose-900/60 ring-2 ring-rose-500/10'
                  : 'border-gray-200 dark:border-gray-800/90 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className="space-y-5">
                {/* هدر کارت: آیکون، عنوان و بج نمره */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* آیکون در کادر دو لایه مدرن */}
                    <div 
                      className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-transform duration-300 hover:scale-105"
                      style={{ 
                        backgroundColor: `${cat.color}12`, 
                        borderColor: `${cat.color}35`,
                        color: cat.color 
                      }}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base text-gray-900 dark:text-white">
                          {cat.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* بج شاخص امتیاز */}
                  <div className={`px-3 py-1.5 rounded-2xl font-black text-xs shrink-0 flex items-center gap-1.5 border ${
                    isDeduction
                      ? cat.earnedScore > 0
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : `${cat.badgeBg} border-current/20`
                  }`}>
                    {isDeduction ? (
                      cat.earnedScore > 0 ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{toPersianDigits(cat.earnedScore)}- امتیاز</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>بدون کسر</span>
                        </>
                      )
                    ) : (
                      <>
                        <Award className="w-3.5 h-3.5 opacity-80" />
                        <span>{toPersianDigits(cat.earnedScore)}</span>
                        <span className="opacity-50 text-[10px]">/</span>
                        <span className="opacity-70">{toPersianDigits(cat.maxScore || 0)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* بازطراحی اسلایدر تعاملی نئوبروتالیسم (Neo-brutalist Physical Slider) */}
                <div className="space-y-2 bg-gray-50/70 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800">
                  {/* اطلاعات بالای اسلایدر */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>
                        {isDeduction
                          ? cat.earnedScore > 0
                            ? 'میزان کسر اعمال شده بر اساس پرونده'
                            : 'انضباط کلاسی: عالی'
                          : `درصد دستیابی: ${toPersianDigits(percentage)}%`}
                      </span>
                    </div>

                    {!isDeduction && (
                      <span className="text-[11px] font-semibold text-gray-500">
                        {toPersianDigits(cat.earnedScore)} از {toPersianDigits(cat.maxScore || 0)} امتیاز
                      </span>
                    )}
                  </div>

                  {/* نوار اصلی اسلایدر با ضخامت بهینه و افکت گلاسی */}
                  <div className="relative pt-1 pb-1">
                    {/* کانتینر تراک اسلایدر */}
                    <div className="relative h-4 w-full rounded-full bg-gray-200/80 dark:bg-gray-800 p-0.5 border border-gray-300 dark:border-gray-700 overflow-hidden shadow-inner">
                      {/* نوار پرشدگی با گرادیانت خیره‌کننده */}
                      <div
                        className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 relative ${
                          isDeduction
                            ? cat.earnedScore > 0
                              ? 'from-rose-500 via-rose-600 to-red-600'
                              : 'from-emerald-500 to-teal-500'
                            : cat.progressGradient
                        }`}
                        style={{
                          width: isDeduction
                            ? cat.earnedScore > 0 ? `${Math.min(cat.earnedScore * 5, 100)}%` : '100%'
                            : `${Math.max(percentage, 2)}%`,
                        }}
                      >
                        {/* خطوط هاشور خورده ظریف برای حس فیزیکی اسلایدر */}
                        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,rgba(255,255,255,0.4)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0.4)_75%,transparent_75%,transparent)] bg-[length:12px_12px]" />
                      </div>
                    </div>

                    {/* مقیاس‌های عددی زیر اسلایدر (Scale Ticks) */}
                    {!isDeduction && (
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono pt-1.5 px-1">
                        <span>۰</span>
                        <span>۲۵٪</span>
                        <span>۵۰٪</span>
                        <span>۷۵٪</span>
                        <span>۱۰۰٪</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* دکمه آکاردئون باز و بسته کردن ریز فرمول‌ها */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all group"
                  >
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                      {isExpanded ? 'بستن جدول قوانین و ضرایب' : `مشاهده ${toPersianDigits(cat.activitiesList.length)} فعالیت و فرمول‌های محاسباتی`}
                    </span>
                    <div className={`p-1 rounded-lg bg-gray-100 dark:bg-gray-800 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-primary' : 'text-gray-400'
                    }`}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* جدول شیک و مدرن ریز اقلام هر حوزه */}
                  {isExpanded && (
                    <div className="mt-3 overflow-hidden rounded-2xl border-2 border-gray-200 dark:border-gray-700/80 bg-gray-50/90 dark:bg-[#101622] p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="text-[11px] font-bold text-gray-500 border-b border-gray-200 dark:border-gray-800 pb-2 flex justify-between">
                        <span>عنوان فعالیت و دامنه ورودی</span>
                        <span>فرمول و سقف امتیاز</span>
                      </div>

                      <div className="divide-y divide-gray-200/60 dark:divide-gray-800/60">
                        {cat.activitiesList.map((item, i) => (
                          <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-white/50 dark:hover:bg-gray-800/30 px-1.5 rounded-lg transition-colors">
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs text-gray-800 dark:text-gray-200">
                                {toPersianDigits(i + 1)}. {item.name}
                              </span>
                              <div className="text-[10px] text-gray-500">
                                دامنه ورودی: <span className="font-semibold text-gray-600 dark:text-gray-400">{item.range}</span>
                              </div>
                            </div>

                            <div className="text-left sm:text-right shrink-0 flex items-center sm:flex-col sm:items-end justify-between gap-2">
                              <span className="text-[11px] font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-lg">
                                {item.formula}
                              </span>
                              {item.max !== undefined && (
                                <span className={`text-[10px] font-semibold ${
                                  item.max < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'
                                }`}>
                                  {item.max < 0 ? `اثر: ${toPersianDigits(item.max)} امت` : `سقف: ${toPersianDigits(item.max)} امت`}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
