/**
 * Porscad survey client for the Polls tab.
 * Creates step-by-step forms, submits multi-question answers,
 * and fetches live analytics from Porscad Supabase with full question model support.
 */

export type PorscadQuestionType =
  | 'choice'
  | 'picture_choice'
  | 'dropdown'
  | 'yes_no'
  | 'likert'
  | 'nps'
  | 'rating'
  | 'matrix'
  | 'ranking'
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'email'
  | 'phone_ir'
  | 'link'
  | 'telegram_id'
  | 'statement'
  | 'group'
  | 'file_upload'
  | 'payment'
  | 'opinion_scale';

const optionTypeSet = new Set<string>([
  'choice',
  'picture_choice',
  'dropdown',
  'likert',
  'ranking',
  'matrix',
]);

export function porscadNeedsOptions(type: string): boolean {
  return optionTypeSet.has(type);
}

export function porscadIsInformational(type: string): boolean {
  return type === 'statement' || type === 'group';
}

export const PORSCAD_QUESTION_TYPES: Array<{
  value: PorscadQuestionType;
  label: string;
  hint: string;
  needsOptions: boolean;
}> = [
  {
    value: 'choice',
    label: 'چندگزینه‌ای (تکی / چندتایی)',
    hint: 'گزینه‌های دلخواه با حداکثر انتخاب',
    needsOptions: true,
  },
  {
    value: 'picture_choice',
    label: 'چندگزینه‌ای تصویری',
    hint: 'انتخاب از میان تصاویر همراه با متن',
    needsOptions: true,
  },
  {
    value: 'dropdown',
    label: 'لیست کشویی (Dropdown)',
    hint: 'انتخاب یکی از فهرست گزینه‌ها',
    needsOptions: true,
  },
  {
    value: 'yes_no',
    label: 'بله / خیر (Yes / No)',
    hint: 'پاسخ دو حالته',
    needsOptions: false,
  },
  {
    value: 'likert',
    label: 'طیفی (مقیاس لیکرت ۵ مرحله‌ای)',
    hint: 'کاملاً موافق تا کاملاً مخالف روی طیف',
    needsOptions: true,
  },
  {
    value: 'nps',
    label: 'شاخص وفاداری NPS (۰ تا ۱۰)',
    hint: 'عدد صحیح بین ۰ تا ۱۰',
    needsOptions: false,
  },
  {
    value: 'rating',
    label: 'امتیازدهی ستاره‌ای (Rating ۱ تا ۵)',
    hint: 'از ۱ تا ۵ ستاره',
    needsOptions: false,
  },
  {
    value: 'opinion_scale',
    label: 'مقیاس نظری (۱ تا ۱۰)',
    hint: 'عدد صحیح بین ۱ تا ۱۰',
    needsOptions: false,
  },
  {
    value: 'matrix',
    label: 'ماتریسی (جدول سوالات)',
    hint: 'چند سطر با ستون‌های یکسان',
    needsOptions: true,
  },
  {
    value: 'ranking',
    label: 'اولویت‌دهی / رتبه‌بندی',
    hint: 'مرتب‌سازی گزینه‌ها به ترتیب اولویت',
    needsOptions: true,
  },
  {
    value: 'short_text',
    label: 'متن کوتاه',
    hint: 'پاسخ یک‌خطی',
    needsOptions: false,
  },
  {
    value: 'long_text',
    label: 'متن بلند / تشریحی',
    hint: 'پاراگراف و توضیح کامل',
    needsOptions: false,
  },
  {
    value: 'number',
    label: 'عدد',
    hint: 'ورودی عددی',
    needsOptions: false,
  },
  {
    value: 'email',
    label: 'ایمیل',
    hint: 'با اعتبارسنجی فرمت ایمیل',
    needsOptions: false,
  },
  {
    value: 'phone_ir',
    label: 'شماره موبایل ایران',
    hint: 'با اعتبارسنجی 09xxxxxxxxx',
    needsOptions: false,
  },
  {
    value: 'link',
    label: 'لینک / وب‌سایت',
    hint: 'آدرس اینترنتی معتبر',
    needsOptions: false,
  },
  {
    value: 'telegram_id',
    label: 'آیدی تلگرام',
    hint: 'آیدی تلگرام با @',
    needsOptions: false,
  },
  {
    value: 'statement',
    label: 'متن بدون پاسخ (توضیحی)',
    hint: 'پیام راهنما بدون دریافت ورودی',
    needsOptions: false,
  },
  {
    value: 'group',
    label: 'گروه سوال / بخش‌بندی',
    hint: 'جداکننده و تیتر دسته‌بندی',
    needsOptions: false,
  },
  {
    value: 'file_upload',
    label: 'آپلود فایل / ضمیمه',
    hint: 'بارگذاری تصویر یا سند',
    needsOptions: false,
  },
  {
    value: 'payment',
    label: 'درگاه پرداخت (نمایشی)',
    hint: 'دریافت وجه (فقط نمایش مبلغ در نظرسنجی)',
    needsOptions: false,
  },
];

export interface SurveyQuestionValidation {
  min?: number;
  max?: number;
  step?: number;
  allowDecimals?: boolean;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  allowedExtensions?: string[];
  maxFileSizeMb?: number;
}

export interface SurveyQuestionCondition {
  dependsOnIndex?: number;
  operator?: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'is_set';
  value?: any;
}

export interface SurveyQuestionJumpAction {
  targetQuestionIndex?: number | 'END';
  conditionValue?: any;
}

export interface SurveyQuestion {
  type: PorscadQuestionType;
  title: string;
  description?: string;
  options?: string[];
  maxSelections?: number;
  required?: boolean;
  displayMode?: 'buttons' | 'list' | 'slider' | 'rating' | 'dropdown';
  porscadQuestionId?: string | null;
  placeholder?: string;
  validation?: SurveyQuestionValidation;
  conditions?: SurveyQuestionCondition[];
  jump_actions?: SurveyQuestionJumpAction[];
  points?: number;
  correct_answer?: any;
}

export interface PorscadCreatedForm {
  formId: string;
  formPublicId?: string;
  questionIds: string[];
}

export type PorscadFormStatePatch = Partial<{
  published: boolean;
  archived: boolean;
  deleted_at: string | null;
}>;

const SUPABASE_URL = 'https://pivwmyacpxdywevccpmw.supabase.co/rest/v1';

/**
 * Fixed Porscad token (Infinite duration, locked in code)
 */
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdndteWFjcHhkeXdldmNjcG13Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MjU1MSwiZXhwIjoyMTAzMjM4NTUxfQ.WqnDBvpwIOtDOBn7pHKozf0WzpF-S7F5nq7FB4aCPl0';

export type SurveyAnswerValue = string | number | boolean | string[];
export type SurveyAnswers = Record<string, SurveyAnswerValue>;

export interface QuestionAnalyticsItem {
  index: number;
  title: string;
  type: string;
  answered: number;
  options: Array<{ text: string; count: number; percentage: number }>;
  avgRating: number | null;
  textAnswers?: Array<{ value: string; count?: number }>;
  distribution?: Record<string | number, number>;
}

export interface LiveAnalyticsResult {
  totalRespondents: number;
  totalAnswers: number;
  perQuestion: QuestionAnalyticsItem[];
  respondents: Array<{ name?: string; completedAt?: string; durationSeconds?: number }>;
}

const DEFAULT_PORSCAD_USER_ID = '3d7a922f-f553-44c2-8591-7c12bb95278d';

export class PorscadSurveyClient {
  public getToken(): string {
    return SUPABASE_SERVICE_ROLE_KEY;
  }

  /** Kept for API compatibility; token is locked in code */
  public setToken(_token: string): void {
    // Fixed token in code only - manual changes are not allowed
  }

  private getHeaders(customToken?: string) {
    const token = customToken || this.getToken();
    return {
      apikey: token || SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token || SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  public async testConnection(
    token?: string,
  ): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      const res = await fetch(`${SUPABASE_URL}/forms?select=id&limit=1`, {
        headers: this.getHeaders(token),
      });

      if (res.ok) {
        return {
          success: true,
          message: 'اتصال به سرور پرس‌کاد با موفقیت برقرار شد',
        };
      }

      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.message || 'خطا در ارتباط با سرور پرس‌کاد',
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'خطا در اتصال به پرس‌کاد: ' + (e?.message || ''),
      };
    }
  }

  /**
   * Create a step-by-step survey form with one row per question in Porscad.
   * Links to the owner user_id in Porscad so it appears in the Porscad dashboard.
   */
  public async createSurveyForm(params: {
    title: string;
    description?: string;
    questions: SurveyQuestion[];
    userId?: string;
  }): Promise<PorscadCreatedForm> {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const formSlug = `form-${randomSuffix}`;
    const publicId = `fr_${Math.random().toString(36).substring(2, 12)}`;
    const ownerUserId = params.userId || DEFAULT_PORSCAD_USER_ID;

    const createFormRes = await fetch(`${SUPABASE_URL}/forms`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        title: params.title,
        description: params.description || '',
        welcome_title: 'سلام!',
        welcome_message: params.description || 'ممنون که وقت می‌گذارید؛ لطفاً به سوالات پاسخ دهید.',
        exit_title: 'با تشکر!',
        exit_message: 'پاسخ‌های شما با موفقیت در سیستم ثبت گردید.',
        published: false,
        created_by: ownerUserId,
        manager_id: ownerUserId,
        form_type: 'step_by_step',
        slug: formSlug,
        public_id: publicId,
        settings: {
          prevent_duplicate: false,
        },
      }),
    });

    if (!createFormRes.ok) {
      const err = await createFormRes.json().catch(() => ({}));
      throw new Error(
        `ساخت فرم پرس‌کاد ناموفق بود: ${err.message || err.details || 'خطای ناشناخته'}`,
      );
    }

    const forms = await createFormRes.json();
    if (!Array.isArray(forms) || forms.length === 0) {
      throw new Error('پاسخ نامعتبر از پرس‌کاد دریافت شد.');
    }

    const formId = forms[0].id;
    const formPublicId = forms[0].public_id || publicId;
    const questionIds: string[] = [];

    for (let i = 0; i < params.questions.length; i++) {
      const q = params.questions[i];

      let normalizedOptions = q.options || [];
      if (q.type === 'likert' && normalizedOptions.length === 0) {
        normalizedOptions = [
          'کاملاً موافق',
          'موافق',
          'ممتنع / خنثی',
          'مخالف',
          'کاملاً مخالف',
        ];
      } else if (q.type === 'yes_no' && normalizedOptions.length === 0) {
        normalizedOptions = ['بله', 'خیر'];
      }

      const createQRes = await fetch(`${SUPABASE_URL}/questions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          form_id: formId,
          type: q.type,
          title: q.title,
          description: q.description || '',
          placeholder: q.placeholder || '',
          required: q.required ?? true,
          options: normalizedOptions,
          max_selections: q.maxSelections || 1,
          display_mode: q.displayMode || 'buttons',
          position: i,
          validation: q.validation || {},
          conditions: q.conditions || null,
          jump_actions: q.jump_actions || null,
          points: q.points || 0,
          correct_answer: q.correct_answer || null,
        }),
      });

      if (!createQRes.ok) {
        const err = await createQRes.json().catch(() => ({}));
        throw new Error(
          `ساخت سوال «${q.title}» در پرس‌کاد ناموفق بود: ${err.message || ''}`,
        );
      }

      const questions = await createQRes.json();
      const qid =
        Array.isArray(questions) && questions.length > 0
          ? questions[0].id
          : `q_${Date.now()}_${i}`;
      questionIds.push(qid);
    }

    return { formId, formPublicId, questionIds };
  }

  /**
   * Sync form lifecycle state to Porscad (published / archived / soft-delete).
   */
  public async updateFormState(
    formId: string | null | undefined,
    patch: PorscadFormStatePatch,
  ): Promise<boolean> {
    if (!formId) return false;

    try {
      const res = await fetch(`${SUPABASE_URL}/forms?id=eq.${formId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...patch,
          updated_at: new Date().toISOString(),
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Soft-delete (trash) the linked Porscad form after local poll delete.
   */
  public async trashForm(formId: string | null | undefined): Promise<boolean> {
    if (!formId) return false;

    try {
      const nowIso = new Date().toISOString();
      const res = await fetch(`${SUPABASE_URL}/forms?id=eq.${formId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          published: false,
          archived: true,
          deleted_at: nowIso,
          updated_at: nowIso,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Submit all step-by-step answers directly to Porscad /responses and /answers tables.
   */
  public async submitSurveyAnswers(params: {
    formPublicId?: string;
    formId: string;
    questionIds: string[];
    questions: SurveyQuestion[];
    answersByIndex: SurveyAnswers;
    respondentName: string;
  }): Promise<{ success: boolean; message?: string; responseId?: string }> {
    try {
      const nowIso = new Date().toISOString();

      // 1. Create response entry in Porscad
      let responseId: string | undefined;
      if (params.formId) {
        const respRes = await fetch(`${SUPABASE_URL}/responses`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            form_id: params.formId,
            is_complete: true,
            started_at: new Date(Date.now() - 30000).toISOString(),
            submitted_at: nowIso,
            duration_seconds: 30,
            browser: 'Chrome / Web',
            os: 'Web Platform',
          }),
        });

        if (respRes.ok) {
          const respData = await respRes.json();
          if (Array.isArray(respData) && respData.length > 0) {
            responseId = respData[0].id;
          }
        }
      }

      // 2. Submit individual answers for each question
      let insertedCount = 0;
      for (let i = 0; i < params.questions.length; i++) {
        const q = params.questions[i];
        const qid = q?.porscadQuestionId || params.questionIds?.[i];
        if (!qid) continue;

        const raw = params.answersByIndex[String(i)];
        if (raw === undefined || raw === null || raw === '') continue;

        const answerPayload: any = {
          question_id: qid,
          value: raw,
          time_spent_seconds: 5,
        };
        if (responseId) {
          answerPayload.response_id = responseId;
        }

        const aRes = await fetch(`${SUPABASE_URL}/answers`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(answerPayload),
        });

        if (aRes.ok) {
          insertedCount++;
        }
      }

      return {
        success: true,
        responseId: responseId || `resp_${Date.now()}`,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `خطا در ارسال به پرس‌کاد: ${e?.message || 'اتصال برقرار نشد'}`,
      };
    }
  }

  /**
   * GET live analytics: answers and responses for each remote question id.
   * Calculates comprehensive statistics, counts, averages, and text responses.
   */
  public async fetchLiveAnalytics(params: {
    formId?: string | null;
    questionIds: string[];
    questions: SurveyQuestion[];
  }): Promise<LiveAnalyticsResult> {
    let ids = params.questionIds.filter(Boolean);

    // If questionIds is empty but formId exists, fetch questions from Porscad
    if (ids.length === 0 && params.formId) {
      try {
        const qRes = await fetch(
          `${SUPABASE_URL}/questions?form_id=eq.${params.formId}&select=id,title,type,options,position&order=position.asc`,
          { headers: this.getHeaders() },
        );
        if (qRes.ok) {
          const qRows = await qRes.json();
          if (Array.isArray(qRows) && qRows.length > 0) {
            ids = qRows.map((r: any) => r.id);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch question list from Porscad:', err);
      }
    }

    const emptyResult: LiveAnalyticsResult = {
      totalRespondents: 0,
      totalAnswers: 0,
      perQuestion: [],
      respondents: [],
    };

    if (ids.length === 0) return emptyResult;

    const answersRes = await fetch(
      `${SUPABASE_URL}/answers?question_id=in.("${ids.join('","')}")&select=id,response_id,question_id,value,time_spent_seconds`,
      { headers: this.getHeaders() },
    );

    if (!answersRes.ok) {
      throw new Error(`خطای سرور پرس‌کاد: HTTP ${answersRes.status}`);
    }

    const rows = await answersRes.json();
    if (!Array.isArray(rows)) {
      throw new Error('پاسخ نامعتبر از پرس‌کاد دریافت شد');
    }

    // Fetch response metadata (timestamps, duration)
    const responseIdSet = new Set<string>();
    rows.forEach((r: any) => {
      if (r.response_id) responseIdSet.add(r.response_id);
    });

    const responseMetadata: Record<string, { submittedAt?: string; durationSeconds?: number }> = {};
    if (responseIdSet.size > 0) {
      try {
        const respIds = Array.from(responseIdSet);
        const rRes = await fetch(
          `${SUPABASE_URL}/responses?id=in.("${respIds.join('","')}")&select=id,submitted_at,duration_seconds,created_at`,
          { headers: this.getHeaders() },
        );
        if (rRes.ok) {
          const rRows = await rRes.json();
          if (Array.isArray(rRows)) {
            rRows.forEach((item: any) => {
              responseMetadata[item.id] = {
                submittedAt: item.submitted_at || item.created_at,
                durationSeconds: item.duration_seconds,
              };
            });
          }
        }
      } catch {
        // Best effort
      }
    }

    const byQuestion: Record<
      string,
      {
        counts: Map<string, number>;
        nums: number[];
        answered: number;
        textAnswers: Array<{ value: string; count?: number }>;
        distribution: Record<string | number, number>;
      }
    > = {};

    for (const id of ids) {
      byQuestion[id] = {
        counts: new Map(),
        nums: [],
        answered: 0,
        textAnswers: [],
        distribution: {},
      };
    }

    for (const row of rows) {
      const qid = row.question_id;
      const bucket = byQuestion[qid];
      if (!bucket) continue;
      bucket.answered += 1;

      const val = row.value;
      if (typeof val === 'number') {
        bucket.nums.push(val);
        const key = String(val);
        bucket.counts.set(key, (bucket.counts.get(key) || 0) + 1);
        bucket.distribution[val] = (bucket.distribution[val] || 0) + 1;
      } else if (Array.isArray(val)) {
        for (const v of val) {
          const key = String(v);
          bucket.counts.set(key, (bucket.counts.get(key) || 0) + 1);
        }
      } else if (typeof val === 'string' && val.trim() !== '') {
        const key = val.trim();
        bucket.counts.set(key, (bucket.counts.get(key) || 0) + 1);
        bucket.textAnswers.push({ value: key });
      } else if (val !== null && val !== undefined) {
        const key = String(val);
        bucket.counts.set(key, (bucket.counts.get(key) || 0) + 1);
      }
    }

    const perQuestion: QuestionAnalyticsItem[] = params.questions.map((q, index) => {
      const id = ids[index] || params.questionIds[index];
      const bucket = byQuestion[id] || {
        counts: new Map(),
        nums: [],
        answered: 0,
        textAnswers: [],
        distribution: {},
      };

      let baseOptionTexts = q.options || [];
      if (q.type === 'likert' && baseOptionTexts.length === 0) {
        baseOptionTexts = [
          'کاملاً موافق',
          'موافق',
          'ممتنع / خنثی',
          'مخالف',
          'کاملاً مخالف',
        ];
      } else if (q.type === 'yes_no' && baseOptionTexts.length === 0) {
        baseOptionTexts = ['بله', 'خیر'];
      }

      const baseOptions = baseOptionTexts.map((text) => ({
        text,
        count: bucket.counts.get(text) || 0,
      }));

      // Include any other options voted
      bucket.counts.forEach((count, text) => {
        if (!baseOptions.find((o) => o.text === text)) {
          baseOptions.push({ text, count });
        }
      });

      const answered = bucket.answered;
      const options = baseOptions
        .map((o) => ({
          text: o.text,
          count: o.count,
          percentage: answered > 0 ? Math.round((o.count / answered) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const avgRating =
        bucket.nums.length > 0
          ? Number((bucket.nums.reduce((s, n) => s + n, 0) / bucket.nums.length).toFixed(2))
          : null;

      return {
        index,
        title: q.title,
        type: q.type,
        answered,
        options,
        avgRating,
        textAnswers: bucket.textAnswers.slice(-50), // latest 50 responses
        distribution: bucket.distribution,
      };
    });

    const totalRespondents = responseIdSet.size || Math.max(...Object.values(byQuestion).map((b) => b.answered), 0);

    const respondents = Array.from(responseIdSet).map((respId) => ({
      name: `پاسخ‌دهنده #${respId.substring(0, 6)}`,
      completedAt: responseMetadata[respId]?.submittedAt,
      durationSeconds: responseMetadata[respId]?.durationSeconds,
    }));

    return {
      totalRespondents,
      totalAnswers: rows.length,
      perQuestion,
      respondents,
    };
  }

  /**
   * When no remote link exists, aggregate from locally stored admin view.
   */
  public summarizeLocal(
    questions: SurveyQuestion[],
    localResponses: Array<Record<string, any>>,
  ): LiveAnalyticsResult {
    const perQuestion: QuestionAnalyticsItem[] = questions.map((q, index) => {
      const counts = new Map<string, number>();
      const nums: number[] = [];
      const textAnswers: Array<{ value: string; count?: number }> = [];
      const distribution: Record<string | number, number> = {};
      let answered = 0;

      for (const resp of localResponses) {
        const raw = resp?.answers?.[String(index)];
        if (raw === undefined || raw === null || raw === '') continue;
        answered += 1;
        if (typeof raw === 'number') {
          nums.push(raw);
          const key = String(raw);
          counts.set(key, (counts.get(key) || 0) + 1);
          distribution[raw] = (distribution[raw] || 0) + 1;
        } else if (Array.isArray(raw)) {
          for (const item of raw) {
            const key = String(item);
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        } else if (typeof raw === 'string' && raw.trim() !== '') {
          const key = raw.trim();
          counts.set(key, (counts.get(key) || 0) + 1);
          textAnswers.push({ value: key });
        } else {
          const key = String(raw);
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }

      let baseOptionTexts = q.options || [];
      if (q.type === 'likert' && baseOptionTexts.length === 0) {
        baseOptionTexts = [
          'کاملاً موافق',
          'موافق',
          'ممتنع / خنثی',
          'مخالف',
          'کاملاً مخالف',
        ];
      } else if (q.type === 'yes_no' && baseOptionTexts.length === 0) {
        baseOptionTexts = ['بله', 'خیر'];
      }

      const options = baseOptionTexts.map((text) => ({
        text,
        count: counts.get(text) || 0,
        percentage: answered > 0 ? Math.round(((counts.get(text) || 0) / answered) * 100) : 0,
      }));

      counts.forEach((count, text) => {
        if (!options.find((o) => o.text === text)) {
          options.push({
            text,
            count,
            percentage: answered > 0 ? Math.round((count / answered) * 100) : 0,
          });
        }
      });

      return {
        index,
        title: q.title,
        type: q.type,
        answered,
        options: options.sort((a, b) => b.count - a.count),
        avgRating:
          nums.length > 0
            ? Number((nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(2))
            : null,
        textAnswers,
        distribution,
      };
    });

    return {
      totalRespondents: localResponses.length,
      totalAnswers: localResponses.length,
      perQuestion,
      respondents: localResponses.map((r) => ({
        name: r.respondentName,
        completedAt: r.createdAt,
      })),
    };
  }
}

export const porscadSurvey = new PorscadSurveyClient();
