import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const activitiesData = [
  // ==========================================
  // ۲-۱. فعالیت‌های آموزشی (Educational Activities)
  // ==========================================
  {
    parent: 'فعالیت‌های آموزشی',
    name: 'معدل نوبت اول',
    order: 1,
    description: 'معدل کل کارنامه نوبت اول × ۵ (سقف ۱۰۰ امتیاز)',
    valueInput: { type: 'number', label: 'معدل کل نوبت اول (۰ تا ۲۰ با گام ۰.۲۵)', required: true, numberMin: 0, numberMax: 20, step: 0.25 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 5, min: 0, max: 100 },
  },
  {
    parent: 'فعالیت‌های آموزشی',
    name: 'معدل نوبت دوم',
    order: 2,
    description: 'معدل کل کارنامه نوبت دوم × ۱۰ (سقف ۲۰۰ امتیاز)',
    valueInput: { type: 'number', label: 'معدل کل نوبت دوم (۰ تا ۲۰ با گام ۰.۲۵)', required: true, numberMin: 0, numberMax: 20, step: 0.25 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 10, min: 0, max: 200 },
  },
  {
    parent: 'فعالیت‌های آموزشی',
    name: 'سطح مهارت ۱',
    order: 3,
    description: 'نمره کسب‌شده در چالش تعیین سطح مهارت ۱ (سقف ۱۰۰ امتیاز)',
    valueInput: { type: 'number', label: 'نمره چالش سطح مهارت ۱ (۰ تا ۱۰۰)', required: true, numberMin: 0, numberMax: 100, step: 1 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 1, min: 0, max: 100 },
  },
  {
    parent: 'فعالیت‌های آموزشی',
    name: 'سطح مهارت ۲',
    order: 4,
    description: 'نمره کسب‌شده در چالش تعیین سطح مهارت ۲ (سقف ۱۰۰ امتیاز)',
    valueInput: { type: 'number', label: 'نمره چالش سطح مهارت ۲ (۰ تا ۱۰۰)', required: true, numberMin: 0, numberMax: 100, step: 1 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 1, min: 0, max: 100 },
  },
  {
    parent: 'فعالیت‌های آموزشی',
    name: 'رتبه المپیاد و مسابقات علمی',
    order: 5,
    description: 'کسب رتبه در المپیادهای ملی، استانی یا منطقه‌ای (سقف ۸۰ امتیاز)',
    valueInput: { type: 'select', label: 'سطح رتبه مسابقات علمی', required: true },
    scoreDefinition: {
      inputType: 'select_from_enum',
      enumOptions: [
        { label: 'رتبه اول استانی / کشوری (۸۰ امتیاز)', value: 80 },
        { label: 'رتبه دوم استانی (۶۰ امتیاز)', value: 60 },
        { label: 'رتبه سوم استانی (۴۰ امتیاز)', value: 40 },
        { label: 'رتبه برتر منطقه / ناحیه (۲۵ امتیاز)', value: 25 },
      ],
    },
  },

  // ==========================================
  // ۲-۲. فعالیت داوطلبانه و توسعه فردی (Voluntary & Personal Development)
  // ==========================================
  {
    parent: 'فعالیت‌های داوطلبانه و توسعه فردی',
    name: 'تعداد جلسات کوچینگ',
    order: 1,
    description: 'به ازای هر جلسه کوچینگ فردی ۵ امتیاز (۱ تا ۵ جلسه، سقف ۲۵ امتیاز)',
    valueInput: { type: 'number', label: 'تعداد جلسات شرکت‌شده (۱ تا ۵)', required: true, numberMin: 1, numberMax: 5 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 5, min: 5, max: 25 },
  },
  {
    parent: 'فعالیت‌های داوطلبانه و توسعه فردی',
    name: 'کیفیت حضور در کوچینگ',
    order: 2,
    description: 'ارزیابی کیفیت حضور و تعامل توسط کوچ (۱ تا ۵ امتیاز کیفی)',
    valueInput: { type: 'number', label: 'امتیاز کیفی کوچ (۱ تا ۵)', required: true, numberMin: 1, numberMax: 5 },
    scoreDefinition: { inputType: 'number_in_range', multiplier: 1, min: 1, max: 5 },
  },
  {
    parent: 'فعالیت‌های داوطلبانه و توسعه فردی',
    name: 'شرکت در رویدادهای برون‌مدرسه‌ای',
    order: 3,
    description: 'به ازای هر رویداد رسمی برون‌مدرسه‌ای ۱۵ امتیاز (۱ تا ۵ رویداد، سقف ۷۵ امتیاز)',
    valueInput: { type: 'number', label: 'تعداد رویداد برون‌مدرسه‌ای (۱ تا ۵)', required: true, numberMin: 1, numberMax: 5 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 15, min: 15, max: 75 },
  },
  {
    parent: 'فعالیت‌های داوطلبانه و توسعه فردی',
    name: 'شرکت در رویدادهای درون‌مدرسه‌ای',
    order: 4,
    description: 'به ازای هر رویداد علمی یا مهارتی درون‌مدرسه‌ای ۱۰ امتیاز (۱ تا ۵ رویداد، سقف ۵۰ امتیاز)',
    valueInput: { type: 'number', label: 'تعداد رویداد درون‌مدرسه‌ای (۱ تا ۵)', required: true, numberMin: 1, numberMax: 5 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 10, min: 10, max: 50 },
  },
  {
    parent: 'فعالیت‌های داوطلبانه و توسعه فردی',
    name: 'دوره‌های آموزشی برون‌مدرسه‌ای',
    order: 5,
    description: 'گواهینامه دوره‌های تخصصی زبان یا مهارت برون‌مدرسه‌ای (هر دوره ۱۰ امتیاز، سقف ۵۰ امتیاز)',
    valueInput: { type: 'number', label: 'تعداد دوره‌های گذرانده‌شده (۱ تا ۵)', required: true, numberMin: 1, numberMax: 5 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 10, min: 10, max: 50 },
  },
  {
    parent: 'فعالیت‌های داوطلبانه و توسعه فردی',
    name: 'امتیاز در لیگ‌های درون‌مدرسه‌ای',
    order: 6,
    description: 'امتیازات لیگ‌های بازی و ورزش (امتیاز لیگ × ۰.۰۵، سقف ۵۰ امتیاز)',
    valueInput: { type: 'number', label: 'امتیاز کسب‌شده در لیگ (۲۰ تا ۱۰۰۰)', required: true, numberMin: 20, numberMax: 1000 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 0.05, min: 1, max: 50 },
  },
  {
    parent: 'فعالیت‌های داوطلبانه و توسعه فردی',
    name: 'کتابخوانی و خلاصه‌نویسی',
    order: 7,
    description: 'مطالعه و خلاصه کتاب‌های تخصصی و مهارتی (سقف ۲۰ امتیاز)',
    valueInput: { type: 'select', label: 'میزان مطالعه و خلاصه کتاب', required: true },
    scoreDefinition: {
      inputType: 'select_from_enum',
      enumOptions: [
        { label: 'بیش از ۲۰۰ صفحه کتاب تخصصی (۲۰ امتیاز)', value: 20 },
        { label: 'بین ۱۰۰ تا ۲۰۰ صفحه کتاب تخصصی (۱۰ امتیاز)', value: 10 },
      ],
    },
  },
  {
    parent: 'فعالیت‌های داوطلبانه و توسعه فردی',
    name: 'کسب رتبه در رویدادها و جشنواره‌ها',
    order: 8,
    description: 'رتبه‌های رسمی جشنواره‌ها و مسابقات (سقف ۵۰ امتیاز)',
    valueInput: { type: 'select', label: 'سطح رویداد و رتبه کسب‌شده', required: true },
    scoreDefinition: {
      inputType: 'select_from_enum',
      enumOptions: [
        { label: 'رتبه اول کشوری / معادل (۵۰ امتیاز)', value: 50 },
        { label: 'رتبه دوم کشوری / اول استانی (۴۰ امتیاز)', value: 40 },
        { label: 'رتبه دوم استانی / اول منطقه (۳۰ امتیاز)', value: 30 },
        { label: 'رتبه دوم و سوم منطقه (۲۰ امتیاز)', value: 20 },
      ],
    },
  },
  {
    parent: 'فعالیت‌های داوطلبانه و توسعه فردی',
    name: 'همکاری در رویدادها و کارگاه‌ها',
    order: 9,
    description: 'همکاری اجرایی، ارائه کارگاه و مستندسازی در هنرستان (سقف ۳۵ امتیاز)',
    valueInput: { type: 'select', label: 'نوع نقش و سطح همکاری', required: true },
    scoreDefinition: {
      inputType: 'select_from_enum',
      enumOptions: [
        { label: 'ارائه کارگاه آموزشی / انتقال تجربه (۳۵ امتیاز)', value: 35 },
        { label: 'کادر اجرایی و مدیریت فضای مجازی (۲۰ امتیاز)', value: 20 },
        { label: 'مستندسازی و پشتیبانی رسانه‌ای (۱۵ امتیاز)', value: 15 },
      ],
    },
  },

  // ==========================================
  // ۲-۳. فعالیت‌های شغلی (Job & Professional Activities)
  // ==========================================
  {
    parent: 'فعالیت‌های شغلی',
    name: 'پروژه واقعی برای کارفرما',
    order: 1,
    description: 'انجام پروژه واقعی عملیاتی برای کارفرما (ساعت کارکرد × ۲، سقف ۱۰۰ امتیاز)',
    valueInput: { type: 'number', label: 'تعداد ساعات کار روی پروژه (۱ تا ۵۰ ساعت)', required: true, numberMin: 1, numberMax: 50 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: 2, min: 2, max: 100 },
  },
  {
    parent: 'فعالیت‌های شغلی',
    name: 'کارآموزی و کارورزی در شرکت‌ها',
    order: 2,
    description: 'کارآموزی در شرکت‌های صنعتی یا دانش‌بنیان (سطح A+: ۵۰ / سطح B: ۳۰ امتیاز)',
    valueInput: { type: 'select', label: 'سطح شرکت کارآموزی', required: true },
    scoreDefinition: {
      inputType: 'select_from_enum',
      enumOptions: [
        { label: 'شرکت سطح A+ (دانش‌بنیان / بین‌المللی) (۵۰ امتیاز)', value: 50 },
        { label: 'شرکت سطح B (داخلی / معتبر) (۳۰ امتیاز)', value: 30 },
      ],
    },
  },
  {
    parent: 'فعالیت‌های شغلی',
    name: 'پروژه‌های درآمدی (فریلنسری)',
    order: 3,
    description: 'پروژه فریلنسری با درآمد مستند (سطح A+: ۱۵ / سطح B+: ۱۰ / سطح C+: ۵)',
    valueInput: { type: 'select', label: 'سطح پروژه فریلنسری', required: true },
    scoreDefinition: {
      inputType: 'select_from_enum',
      enumOptions: [
        { label: 'پروژه سطح A+ (۱۵ امتیاز)', value: 15 },
        { label: 'پروژه سطح B+ (۱۰ امتیاز)', value: 10 },
        { label: 'پروژه سطح C+ (۵ امتیاز)', value: 5 },
      ],
    },
  },
  {
    parent: 'فعالیت‌های شغلی',
    name: 'قراردادهای استخدامی رسمی',
    order: 4,
    description: 'استخدام رسمی یا پاره‌وقت در شرکت‌ها (سطح A+: ۷۰ / سطح B+: ۵۰ امتیاز)',
    valueInput: { type: 'select', label: 'سطح قرارداد استخدامی', required: true },
    scoreDefinition: {
      inputType: 'select_from_enum',
      enumOptions: [
        { label: 'استخدام در شرکت سطح A+ (۷۰ امتیاز)', value: 70 },
        { label: 'استخدام در شرکت سطح B+ (۵۰ امتیاز)', value: 50 },
      ],
    },
  },

  // ==========================================
  // ۲-۴. موارد کسر امتیاز (Deductions)
  // ==========================================
  {
    parent: 'موارد کسر امتیاز',
    name: 'غیبت غیرموجه در کلاس',
    order: 1,
    description: 'کسر به ازای هر جلسه غیبت کلاسی غیرموجه (-۱ امتیاز)',
    valueInput: { type: 'number', label: 'تعداد جلسات غیبت غیرموجه (۱ تا ۱۰)', required: true, numberMin: 1, numberMax: 10 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: -1, max: -1, min: -10 },
  },
  {
    parent: 'موارد کسر امتیاز',
    name: 'تأخیر غیرموجه در کلاس',
    order: 2,
    description: 'کسر به ازای هر بار تأخیر کلاسی غیرموجه (-۰.۵ امتیاز)',
    valueInput: { type: 'number', label: 'تعداد دفعات تأخیر غیرموجه (۱ تا ۲۰)', required: true, numberMin: 1, numberMax: 20 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: -0.5, max: -0.5, min: -10 },
  },
  {
    parent: 'موارد کسر امتیاز',
    name: 'سایر موارد انضباطی',
    order: 3,
    description: 'کسر امتیاز به ازای هر مورد انضباطی در مدرسه (-۲ امتیاز)',
    valueInput: { type: 'number', label: 'تعداد موارد انضباطی (۱ تا ۵)', required: true, numberMin: 1, numberMax: 5 },
    scoreDefinition: { inputType: 'calculated_from_value', multiplier: -2, max: -2, min: -10 },
  },
  {
    parent: 'موارد کسر امتیاز',
    name: 'تأخیر در تحویل پروژه کارگاهی',
    order: 4,
    description: 'کسر امتیاز بابت عدم تحویل به موقع پروژه‌های عملی کارگاه',
    valueInput: { type: 'select', label: 'بازه زمانی تأخیر در تحویل پروژه', required: true },
    scoreDefinition: {
      inputType: 'select_from_enum',
      enumOptions: [
        { label: 'تأخیر تا ۱ هفته (-۱۰ امتیاز)', value: -10 },
        { label: 'تأخیر بیش از ۱ هفته (-۲۵ امتیاز)', value: -25 },
      ],
    },
  },
];

async function seedKaActivities() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();

    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
    if (tenants.length === 0) {
      console.warn('⚠️ No tenants found in database.');
      return;
    }

    console.log(`Found ${tenants.length} tenants. Syncing updated Ka activities for each...`);

    for (const tenant of tenants) {
      // پاک کردن فعالیت‌های قبلی این تننت
      await prisma.kaActivity.deleteMany({
        where: { tenantId: tenant.id },
      });

      for (const act of activitiesData) {
        await prisma.kaActivity.create({
          data: {
            tenantId: tenant.id,
            parent: act.parent,
            name: act.name,
            order: act.order || 0,
            description: act.description,
            valueInput: act.valueInput as any,
            scoreDefinition: act.scoreDefinition as any,
          },
        });
      }
      console.log(`✅ Seeded ${activitiesData.length} updated activities for tenant: ${tenant.name}`);
    }

    console.log('🎉 Ka Activities seed successfully updated with 22 official activities!');
  } catch (error) {
    console.error('Error seeding Ka Activities:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedKaActivities();
