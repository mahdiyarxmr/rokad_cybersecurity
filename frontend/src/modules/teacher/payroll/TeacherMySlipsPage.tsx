import React, { useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api/client';
import { openAuthorizedDownload } from '../../../lib/api/authorized-download';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ResponsivePageHeader } from '../../../components/ui/ResponsivePageHeader';
import {
  Wallet,
  Printer,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

const PERSIAN_MONTHS: Record<number, string> = {
  1: 'فروردین',
  2: 'اردیبهشت',
  3: 'خرداد',
  4: 'تیر',
  5: 'مرداد',
  6: 'شهریور',
  7: 'مهر',
  8: 'آبان',
  9: 'آذر',
  10: 'دی',
  11: 'بهمن',
  12: 'اسفند',
};

const formatMoney = (val: any): string => {
  if (val === null || val === undefined || val === '') return '۰';
  if (typeof val === 'number') {
    return isNaN(val) ? '۰' : val.toLocaleString('fa-IR');
  }
  if (typeof val === 'string') {
    const n = Number(val);
    return isNaN(n) ? '۰' : n.toLocaleString('fa-IR');
  }
  if (typeof val === 'object') {
    if (typeof val.toNumber === 'function') {
      return val.toNumber().toLocaleString('fa-IR');
    }
    if (Array.isArray(val.d) && typeof val.s === 'number' && typeof val.e === 'number') {
      const digits = val.d.join('');
      const exp = val.e;
      const num = Number(digits) * Math.pow(10, exp - digits.length + 1) * val.s;
      return isNaN(num) ? '۰' : num.toLocaleString('fa-IR');
    }
  }
  return '۰';
};

export const TeacherMySlipsPage: React.FC = () => {
  const [slips, setSlips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMySlips = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get('/finance/payroll/my-slips');
      setSlips(res.data || []);
    } catch (err: any) {
      console.error('Failed to load my slips', err);
      setError(err.response?.data?.message || 'خطا در دریافت فیش‌های حقوقی شما');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMySlips();
  }, []);

  const handlePrintSlip = (slipId: string) => {
    void openAuthorizedDownload(`/api/v1/finance/payroll/export/print/${slipId}`);
  };

  return (
    <div className="space-y-6">
      <ResponsivePageHeader
        title="فیش حقوقی"
        icon={<Wallet className="w-6 h-6 text-primary-dark dark:text-primary" />}
      />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : slips.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border border-border/70">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <div className="font-bold text-base mb-1 text-foreground">هیچ فیش حقوقی صادرشده‌ای یافت نشد</div>
          <p className="text-xs max-w-sm mx-auto">
            پس از پایان ماه و صدور قطعی محاسبات کارکرد توسط مدیریت مدرسه، فیش‌های شما در این بخش نمایش داده خواهند شد.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {slips.map((slip) => {
            const monthName = PERSIAN_MONTHS[slip.month] || `ماه ${slip.month}`;
            const isSettled = slip.status === 'SETTLED' || slip.status === 'PAID';

            return (
              <Card
                key={slip.id}
                className="overflow-hidden border border-border/80 shadow-sm hover:shadow-md transition-shadow bg-white/80 dark:bg-card/80 backdrop-blur-md"
              >
                <div className="p-5 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary-dark dark:text-primary flex items-center justify-center font-bold">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-foreground">
                        فیش حقوقی {monthName} ماه {slip.year}
                      </h4>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {slip.slipNumber}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isSettled ? (
                      <Badge variant="success" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        تسویه شده
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        صادرشده رسمی
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-4 text-xs">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-xl">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">جلسات کارکرد:</span>
                      <strong className="text-sm font-bold">{slip.sourceSessionCount || 0} جلسه</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">ساعات آموزشی:</span>
                      <strong className="text-sm font-bold">
                        {slip.sourceHours ? `${Number(slip.sourceHours)} ساعت` : '-'}
                      </strong>
                    </div>
                  </div>

                  {/* Breakdown Items */}
                  {slip.items && slip.items.length > 0 && (
                    <div className="space-y-1.5 border-t border-border/50 pt-3">
                      <span className="text-[11px] font-bold text-muted-foreground block mb-2">ریز اقلام حقوقی:</span>
                      {slip.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
                          <span className="text-foreground">{item.title}</span>
                          <span className={`font-mono font-bold ${Number(item.amount) >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                            {formatMoney(item.amount)} تومان
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Net Pay Total */}
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold block">مبلغ پرداختی نهایی:</span>
                      <span className="text-[11px] text-muted-foreground">خالص دریافتی</span>
                    </div>
                    <div className="font-mono font-black text-base text-emerald-700 dark:text-emerald-300">
                      {formatMoney(slip.finalAmount)} تومان
                    </div>
                  </div>

                  {/* Action Print */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePrintSlip(slip.id)}
                      className="gap-1.5 text-xs w-full sm:w-auto"
                    >
                      <Printer className="w-4 h-4 text-primary" />
                      مشاهده و چاپ رسمی فیش (PDF)
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
