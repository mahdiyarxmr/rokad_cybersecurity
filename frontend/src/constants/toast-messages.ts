/**
 * مرجع کامل متن‌های Toast پلتفرم رکاد
 * هماهنگ با سند استانداردهای UX/UI و لحن مجهول/خنثی
 */

export const TOAST_MESSAGES = {
  // ۰. پیام‌های عمومی مشترک (Fallback)
  common: {
    networkError: 'اتصال اینترنت برقرار نیست. لطفاً دوباره تلاش کنید.',
    serverError: 'مشکلی در سرور پیش اومد. کمی بعد دوباره امتحان کنید.',
    forbidden: 'شما دسترسی لازم برای این عملیات رو ندارید.',
    notFound: 'موردی که دنبالش بودید پیدا نشد.',
    validationError: 'اطلاعات واردشده معتبر نیست. فرم رو بررسی کنید.',
    successFallback: 'انجام شد.',
    errorFallback: 'مشکلی پیش اومد، دوباره تلاش کنید.',
  },

  // ۱. احراز هویت (Auth)
  auth: {
    loginSuccess: (name: string) => `خوش اومدید، ${name}`,
    loginFailed: 'شماره موبایل یا رمز عبور اشتباهه.',
    accountSuspended: 'حساب شما غیرفعال شده. با راهبر مدرسه تماس بگیرید.',
    logout: 'با موفقیت خارج شدید.',
    sessionExpired: 'نشست شما منقضی شده. دوباره وارد بشید.',
    registerSchoolSuccess: 'مدرسه با موفقیت ثبت شد. خوش اومدید!',
    duplicateSubdomain: 'این آدرس قبلاً استفاده شده. یک آدرس دیگه انتخاب کنید.',
    passwordChanged: 'رمز عبور با موفقیت تغییر کرد.',
  },

  // ۲. سازنده نقش و دسترسی‌ها (RBAC)
  rbac: {
    roleCreated: (name: string) => `نقش «${name}» ساخته شد.`,
    roleUpdated: (name: string) => `تغییرات نقش «${name}» ذخیره شد.`,
    roleDeleted: (name: string) => `نقش «${name}» حذف شد.`,
    roleAssigned: (roleName: string, userName: string) =>
      `نقش «${roleName}» به ${userName} اضافه شد.`,
    roleInUse: (count: number) =>
      `این نقش به ${count} نفر اختصاص داده شده. اول نقش اونها رو تغییر بدید.`,
    cannotRevokeSelfManage: 'نمیتونید دسترسی مدیریت نقشها رو از خودتون بگیرید.',
    permissionToggled: (title: string, userName: string, isGranted: boolean) =>
      `دسترسی «${title}» برای ${userName} ${isGranted ? 'باز' : 'بسته'} شد.`,
    overrideRemoved: (title: string) => `استثنای مجوز «${title}» لغو شد.`,
  },

  // ۳. ساختار آموزشی (Academic & Classes)
  academic: {
    yearCreated: (title: string) => `سال تحصیلی ${title} ایجاد شد.`,
    currentYearUpdated: 'سال تحصیلی جاری به‌روزرسانی شد.',
    classCreated: (name: string) => `کلاس «${name}» ساخته شد.`,
    classCapacityFull: 'ظرفیت کلاس تکمیل شده.',
    scheduleConflict: 'این بازه زمانی با یک کلاس دیگه تداخل داره.',
    studentEnrolled: (name: string) => `${name} در کلاس ثبت‌نام شد.`,
  },

  // ۴. عملیات روزمره (Attendance, Homework, Calendar, Polls, Matters)
  operations: {
    attendanceBulkSaved: (className: string) => `حضور و غیاب ${className} ثبت شد.`,
    homeworkCreated: (title: string) => `تکلیف «${title}» برای کلاس ارسال شد.`,
    homeworkSubmitted: 'پاسخ شما ثبت شد.',
    homeworkDeadlinePassed: 'مهلت ارسال این تکلیف گذشته.',
    homeworkGraded: (score: number | string, studentName: string) =>
      `نمره ${score} برای ${studentName} ثبت شد.`,
    calendarEventCreated: (title: string) => `رویداد «${title}» به تقویم اضافه شد.`,
    calendarEventUpdated: (title: string) => `رویداد «${title}» به‌روزرسانی شد.`,
    calendarEventDeleted: (title: string) => `رویداد «${title}» حذف شد.`,
    pollVoted: 'رأی شما ثبت شد.',
    pollAlreadyVoted: 'شما قبلاً در این نظرسنجی رأی داده‌اید.',
    parentVisitBooked: (teacherName: string) => `نوبت ملاقات با ${teacherName} رزرو شد.`,
    parentVisitSlotFull: 'این بازه زمانی قبلاً رزرو شده. بازه دیگه‌ای انتخاب کنید.',
    matterCreated: (studentName: string) => `مورد جدید برای ${studentName} ثبت شد.`,
    noticeCreated: (title: string) => `اطلاعیه «${title}» منتشر شد.`,
    noticeDeleted: (title: string) => `اطلاعیه «${title}» حذف شد.`,
  },

  // ۵. سنجش و LMS (Exams, Question Bank, Gradebook, Lesson Plans)
  lms: {
    questionCreated: 'سوال به بانک سوالات اضافه شد.',
    questionsImporting: 'در حال بارگذاری سوالات...',
    questionsImportSuccess: (count: number) => `${count} سوال با موفقیت اضافه شد.`,
    questionsImportPartial: (successCount: number, failCount: number) =>
      `${successCount} سوال اضافه شد؛ ${failCount} مورد با خطا مواجه شد.`,
    examCreated: (title: string) => `آزمون «${title}» ایجاد شد.`,
    examStarted: 'آزمون شروع شد. موفق باشید!',
    examTimeWarning5Min: '۵ دقیقه تا پایان آزمون باقی مونده.',
    examTimeEnded: 'زمان آزمون به پایان رسید. پاسخ‌ها ثبت شدن.',
    examSubmitted: 'پاسخ‌های شما با موفقیت ثبت شد.',
    gradesBulkSaved: (className: string, lessonName: string) =>
      `نمرات ${className} - ${lessonName} ذخیره شد.`,
    gradeOutOfRange: (maxScore: number) =>
      `نمره واردشده باید بین ۰ تا ${maxScore} باشه.`,
    lessonPlanSaved: 'طرح درس ذخیره شد.',
    sessionMarkedDone: (title: string) => `جلسه «${title}» به‌عنوان برگزارشده ثبت شد.`,
  },

  // ۶. محتوا و ارتباطات (Storage, Learning Materials, Chat)
  communication: {
    uploadingFile: (fileName: string) => `در حال آپلود «${fileName}»...`,
    uploadSuccess: (fileName: string) => `«${fileName}» با موفقیت آپلود شد.`,
    fileSizeLimitExceeded: (limit: string) => `حجم فایل نباید بیشتر از ${limit} باشه.`,
    fileFormatInvalid: 'این نوع فایل پشتیبانی نمیشه.',
    materialPublished: (title: string) => `«${title}» برای کلاس منتشر شد.`,
    chatSendFailed: 'پیام ارسال نشد. دوباره تلاش کنید.',
    chatReconnected: 'اتصال چت برقرار شد.',
    postCreated: 'پست با موفقیت در رسانه منتشر شد.',
    postDeleted: (title?: string) => `پست «${title || 'رسانه'}» حذف شد.`,
    commentAdded: 'دیدگاه شما ثبت شد.',
    commentDeleted: 'نظر با موفقیت حذف شد.',
    shareLinkCopied: 'لینک اشتراک‌گذاری کپی شد.',
  },

  // ۷. مالی و پرسنلی (Finance, Payroll)
  finance: {
    contractIssued: (studentName: string) =>
      `قرارداد شهریه برای ${studentName} صادر شد.`,
    paymentConnecting: 'در حال اتصال به درگاه پرداخت...',
    paymentSuccess: 'پرداخت با موفقیت ثبت شد. رسید صادر شد.',
    paymentFailed: 'پرداخت ناموفق بود. مبلغی از حساب شما کسر نشده.',
    transactionPending: 'وضعیت تراکنش در حال بررسیه. نتیجه به‌زودی اعلام میشه.',
    payslipIssued: (month: string, staffName: string) =>
      `فیش حقوقی ${month} برای ${staffName} صادر شد.`,
    disbursementSaved: (trackingCode: string) =>
      `تسویه حساب با شماره پیگیری ${trackingCode} ثبت شد.`,
  },

  // ۸. سوپرادمین SaaS (Tenants, Feature Flags)
  saas: {
    tenantOnboarded: (schoolName: string) =>
      `مدرسه «${schoolName}» با موفقیت ایجاد شد.`,
    featureFlagToggled: (flagName: string, schoolName: string, isEnabled: boolean) =>
      `قابلیت «${flagName}» برای ${schoolName} ${isEnabled ? 'فعال' : 'غیرفعال'} شد.`,
    tenantSuspended: (schoolName: string) =>
      `دسترسی مدرسه «${schoolName}» موقتاً معلق شد.`,
    backupRestoring: 'در حال بازیابی نسخه پشتیبان...',
    backupRestoreSuccess: 'بازیابی با موفقیت انجام شد.',
  },

  // ۹. کوچینگ و اعلان‌ها (Coaching, Notifications)
  coaching: {
    sessionSaved: (studentName: string) => `جلسه کوچینگ با ${studentName} ثبت شد.`,
    noteSaved: 'یادداشت ذخیره شد.',
    notificationReceived: (title: string) => title,
  },
} as const;
