import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { kaApi } from '../../../lib/api/ka';
import { Check, X } from 'lucide-react';
import { toast } from '../../../components/ui/toast/toast';

export const KaAdminPanel: React.FC = () => {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, claimRes] = await Promise.all([
        kaApi.getAdminSubmissions(),
        kaApi.getAdminClaims(),
      ]);
      setSubmissions(subRes.data);
      setClaims(claimRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReviewSubmission = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const score = Number(scores[id] || 0);
    if (status === 'APPROVED' && score <= 0) {
      return toast.error('لطفاً امتیاز را وارد کنید');
    }

    try {
      await kaApi.reviewSubmission(id, {
        status,
        scoreAwarded: status === 'APPROVED' ? score : undefined,
      });
      toast.success('وضعیت با موفقیت بروزرسانی شد');
      fetchData();
    } catch (e) {
      toast.error('خطا در ثبت');
    }
  };

  const handleFulfillClaim = async (id: string, status: 'DELIVERED' | 'REJECTED') => {
    try {
      await kaApi.fulfillClaim(id, { status });
      toast.success('وضعیت با موفقیت بروزرسانی شد');
      fetchData();
    } catch (e) {
      toast.error('خطا در ثبت');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">بررسی فعالیت‌ها</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {submissions.filter(s => s.status === 'PENDING').map(sub => (
              <div key={sub.id} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{sub.activity?.name}</div>
                  <div className="text-xs text-primary mt-1">{sub.student?.user?.firstName} {sub.student?.user?.lastName}</div>
                  <div className="text-xs text-gray-500 mt-1">{sub.details}</div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input 
                    type="number"
                    placeholder="امتیاز..."
                    className="w-24 h-9 text-xs"
                    value={scores[sub.id] || ''}
                    onChange={e => setScores({ ...scores, [sub.id]: e.target.value })}
                  />
                  <Button size="sm" variant="outline" className="text-emerald-500 hover:text-emerald-600" onClick={() => handleReviewSubmission(sub.id, 'APPROVED')}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => handleReviewSubmission(sub.id, 'REJECTED')}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {submissions.filter(s => s.status === 'PENDING').length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">هیچ درخواستی در انتظار بررسی نیست</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">تحویل پاداش‌ها</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {claims.filter(c => c.status === 'PENDING' || c.status === 'APPROVED').map(claim => (
              <div key={claim.id} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{claim.reward?.name}</div>
                  <div className="text-xs text-primary mt-1">{claim.student?.user?.firstName} {claim.student?.user?.lastName}</div>
                  <div className="text-xs text-gray-500 mt-1">هزینه: {claim.tokenCost} توکن</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleFulfillClaim(claim.id, 'DELIVERED')}>
                    تحویل شد
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleFulfillClaim(claim.id, 'REJECTED')}>
                    رد درخواست
                  </Button>
                </div>
              </div>
            ))}
            {claims.filter(c => c.status === 'PENDING' || c.status === 'APPROVED').length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">هیچ پاداشی در انتظار تحویل نیست</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
