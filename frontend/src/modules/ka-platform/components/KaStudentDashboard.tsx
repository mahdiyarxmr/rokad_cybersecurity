import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { kaApi } from '../../../lib/api/ka';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { PlusCircle, Info, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { toast } from '../../../components/ui/toast/toast';

export const KaStudentDashboard: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [actRes, subRes] = await Promise.all([
        kaApi.getActivities(),
        kaApi.getMySubmissions(),
      ]);
      setActivities(actRes.data);
      setSubmissions(subRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return toast.error('لطفاً فعالیت را انتخاب کنید');
    
    setLoading(true);
    try {
      await kaApi.submitActivity({ activityId: selectedActivity, details });
      toast.success('درخواست شما با موفقیت ثبت شد');
      setSelectedActivity('');
      setDetails('');
      fetchData();
    } catch (e) {
      toast.error('خطا در ثبت درخواست');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">ثبت فعالیت جدید</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">انتخاب نوع فعالیت</label>
              <select 
                className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#151C28] p-2.5 outline-none focus:border-primary transition-colors"
                value={selectedActivity}
                onChange={e => setSelectedActivity(e.target.value)}
              >
                <option value="">-- انتخاب کنید --</option>
                {Array.from(new Set(activities.map(a => a.parent || 'سایر'))).map(parent => (
                  <optgroup key={parent} label={parent}>
                    {activities.filter(a => (a.parent || 'سایر') === parent).map(act => (
                      <option key={act.id} value={act.id}>
                        {act.name} {act.description ? `(${act.description})` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {selectedActivity && (() => {
              const act = activities.find(a => a.id === selectedActivity);
              return act?.description ? (
                <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20 text-xs text-primary">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{act.description}</span>
                </div>
              ) : null;
            })()}
            <Input 
              placeholder="توضیحات یا لینک مدرک فعالیت خود را اینجا وارد کنید..."
              value={details}
              onChange={e => setDetails(e.target.value)}
            />
            <Button type="submit" disabled={loading} className="w-full">
              <PlusCircle className="w-4 h-4 mr-2" />
              ارسال برای بررسی
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">تاریخچه فعالیت‌های من</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {submissions.map((sub: any) => (
              <div key={sub.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{sub.activity?.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{sub.details || 'بدون توضیحات'}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {sub.status === 'PENDING' && <span className="flex items-center text-amber-500 text-xs bg-amber-500/10 px-2 py-1 rounded-full"><Clock className="w-3 h-3 mr-1"/> در انتظار</span>}
                  {sub.status === 'APPROVED' && <span className="flex items-center text-emerald-500 text-xs bg-emerald-500/10 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> تایید شده</span>}
                  {sub.status === 'REJECTED' && <span className="flex items-center text-red-500 text-xs bg-red-500/10 px-2 py-1 rounded-full"><XCircle className="w-3 h-3 mr-1"/> رد شده</span>}
                  
                  {sub.scoreAwarded && <div className="text-xs font-bold text-primary">+{sub.scoreAwarded} امتیاز</div>}
                </div>
              </div>
            ))}
            {submissions.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">هیچ فعالیتی ثبت نشده است</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
