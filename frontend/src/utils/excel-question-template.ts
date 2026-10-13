import { read, utils, writeFile } from 'xlsx';

export interface ParsedQuestionRow {
  rowIndex: number;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'DESCRIPTIVE';
  score: number;
  options?: Array<{ text: string; isCorrect: boolean }>;
  correctOptionIndex?: number;
  solutionExplanation?: string;
  isValid: boolean;
  validationError?: string;
}

/**
 * Downloads a pre-formatted Persian Excel template with sample questions and guidelines.
 */
export const downloadQuestionExcelTemplate = () => {
  const sampleData = [
    {
      'ردیف': 1,
      'نوع سوال': 'تستی',
      'متن صورت سوال': 'مشتق تابع f(x) = x^3 - 3x در نقطه x = 1 کدام است؟',
      'بارم نمره': 2.0,
      'گزینه ۱': '0',
      'گزینه ۲': '3',
      'گزینه ۳': '-3',
      'گزینه ۴': '6',
      'شماره گزینه صحیح (۱ تا ۴)': 1,
      'پاسخ تشریحی یا راهنما': "f'(x) = 3x^2 - 3 => f'(1) = 0",
    },
    {
      'ردیف': 2,
      'نوع سوال': 'تستی',
      'متن صورت سوال': 'کدام‌یک از اجزای سخت‌افزاری زیر وظیفه پردازش مرکزی داده‌ها را بر عهده دارد؟',
      'بارم نمره': 1.5,
      'گزینه ۱': 'حافظه رم (RAM)',
      'گزینه ۲': 'دیسک سخت (SSD)',
      'گزینه ۳': 'واحد پردازش مرکزی (CPU)',
      'گزینه ۴': 'منبع تغذیه (Power)',
      'شماره گزینه صحیح (۱ تا ۴)': 3,
      'پاسخ تشریحی یا راهنما': 'سی‌پی‌یو مغز متفکر و پردازنده مرکزی سیستم‌های کامپیوتری است.',
    },
    {
      'ردیف': 3,
      'نوع سوال': 'تشریحی',
      'متن صورت سوال': 'قانون دوم نیوتن را توضیح دهید و رابطه فرمولی آن را با ذکر یکای هر کمیت بنویسید.',
      'بارم نمره': 3.0,
      'گزینه ۱': '',
      'گزینه ۲': '',
      'گزینه ۳': '',
      'گزینه ۴': '',
      'شماره گزینه صحیح (۱ تا ۴)': '',
      'پاسخ تشریحی یا راهنما': 'F = m.a که در آن F نیرو برحسب نیوتن، m جرم برحسب کیلوگرم و a شتاب است.',
    },
  ];

  const ws = utils.json_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 },  // ردیف
    { wch: 12 }, // نوع سوال
    { wch: 45 }, // متن صورت سوال
    { wch: 10 }, // بارم نمره
    { wch: 22 }, // گزینه ۱
    { wch: 22 }, // گزینه ۲
    { wch: 22 }, // گزینه ۳
    { wch: 22 }, // گزینه ۴
    { wch: 25 }, // شماره گزینه صحیح
    { wch: 35 }, // پاسخ تشریحی
  ];

  // Set RTL direction
  ws['!views'] = [{ rightToLeft: true }];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'نمونه سوالات آزمون');
  writeFile(wb, 'نمونه_فایل_اکسل_سوالات_آزمون_رکاد.xlsx');
};

/**
 * Normalizes Persian / Arabic numerals to standard English digits.
 */
const normalizeDigits = (val: any): string => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
};

/**
 * Parses an uploaded Excel file (.xlsx or .xls) into a list of questions with client-side validation.
 */
export const parseQuestionsFromExcel = async (file: File): Promise<ParsedQuestionRow[]> => {
  const data = await file.arrayBuffer();
  const workbook = read(data);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('شیت معتبری در فایل اکسل یافت نشد.');
  }

  const rawRows: any[] = utils.sheet_to_json(sheet);

  if (!rawRows || rawRows.length === 0) {
    throw new Error('فایل اکسل انتخاب‌شده فاقد داده یا سطر است.');
  }

  return rawRows.map((row, idx): ParsedQuestionRow => {
    const rowIndex = idx + 1;

    // Resolve text
    const text = (
      row['متن صورت سوال'] ||
      row['متن سوال'] ||
      row['صورت سوال'] ||
      row['سوال'] ||
      row['text'] ||
      row['Question'] ||
      ''
    ).toString().trim();

    // Resolve type
    const rawType = (
      row['نوع سوال'] ||
      row['نوع'] ||
      row['type'] ||
      'تستی'
    ).toString().trim();

    const isDescriptive =
      rawType.includes('تشریحی') ||
      rawType.toUpperCase() === 'DESCRIPTIVE' ||
      rawType.includes('تشریح');

    const type: 'MULTIPLE_CHOICE' | 'DESCRIPTIVE' = isDescriptive ? 'DESCRIPTIVE' : 'MULTIPLE_CHOICE';

    // Resolve score
    const rawScore = normalizeDigits(
      row['بارم نمره'] || row['بارم'] || row['نمره'] || row['score'] || '2'
    );
    const parsedScore = parseFloat(rawScore);
    const score = !isNaN(parsedScore) && parsedScore > 0 ? parsedScore : 2.0;

    // Resolve solution explanation
    const solutionExplanation = (
      row['پاسخ تشریحی یا راهنما'] ||
      row['پاسخ تشریحی'] ||
      row['راهنما'] ||
      row['solutionExplanation'] ||
      ''
    ).toString().trim() || undefined;

    // Validation
    let isValid = true;
    let validationError: string | undefined;

    if (!text) {
      isValid = false;
      validationError = 'متن صورت سوال خالی است.';
      return {
        rowIndex,
        text: '',
        type,
        score,
        solutionExplanation,
        isValid,
        validationError,
      };
    }

    if (type === 'MULTIPLE_CHOICE') {
      const opt1 = (row['گزینه ۱'] || row['گزینه 1'] || row['option1'] || row['الف'] || '').toString().trim();
      const opt2 = (row['گزینه ۲'] || row['گزینه 2'] || row['option2'] || row['ب'] || '').toString().trim();
      const opt3 = (row['گزینه ۳'] || row['گزینه 3'] || row['option3'] || row['ج'] || '').toString().trim();
      const opt4 = (row['گزینه ۴'] || row['گزینه 4'] || row['option4'] || row['د'] || '').toString().trim();

      const rawCorrect = normalizeDigits(
        row['شماره گزینه صحیح (۱ تا ۴)'] ||
        row['شماره گزینه صحیح'] ||
        row['گزینه صحیح'] ||
        row['پاسخ صحیح'] ||
        row['correctOption'] ||
        '1'
      );

      let correctIndex = parseInt(rawCorrect, 10);
      if (isNaN(correctIndex) || correctIndex < 1 || correctIndex > 4) {
        correctIndex = 1;
      }

      const rawOpts = [opt1, opt2, opt3, opt4];
      const validOptions = rawOpts.filter((o) => o.length > 0);

      if (validOptions.length < 2) {
        isValid = false;
        validationError = 'حداقل دو گزینه برای سوال تستی الزامی است.';
      }

      const options = [
        { text: opt1 || 'گزینه ۱', isCorrect: correctIndex === 1 },
        { text: opt2 || 'گزینه ۲', isCorrect: correctIndex === 2 },
        { text: opt3 || 'گزینه ۳', isCorrect: correctIndex === 3 },
        { text: opt4 || 'گزینه ۴', isCorrect: correctIndex === 4 },
      ];

      return {
        rowIndex,
        text,
        type,
        score,
        options,
        correctOptionIndex: correctIndex,
        solutionExplanation,
        isValid,
        validationError,
      };
    }

    return {
      rowIndex,
      text,
      type,
      score,
      solutionExplanation,
      isValid,
      validationError,
    };
  });
};
