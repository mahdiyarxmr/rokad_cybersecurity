import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { kaApi } from '../../../lib/api/ka';
import { Gift, CheckCircle, Clock } from 'lucide-react';
import { toast } from '../../../components/ui/toast/toast';

export const KaRewards: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => {
  const [rewards, setRewards] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      if (isAdmin) {
        const res = await kaApi.getAdminRewards();
        setRewards(res.data);
      } else {
        const [rewRes, claimRes] = await Promise.all([
          kaApi.getRewards(),
          kaApi.getMyClaims(),
        ]);
        setRewards(rewRes.data);
        setClaims(claimRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClaim = async (rewardId: string) => {
    try {
      await kaApi.claimReward({ rewardId });
      toast.success('درخواست پاداش با موفقیت ثبت شد');
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'موجودی توکن کافی نیست');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold px-1">پاداش‌های قابل دریافت</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {rewards.map(reward => (
          <Card key={reward.id} className="overflow-hidden">
            <CardContent className="p-4 text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-xs">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm">{reward.name}</div>
                <div className="text-xs text-primary font-bold mt-1">
                  {reward.minToken} توکن
                </div>
              </div>
              {!isAdmin && (
                <Button size="sm" className="w-full" onClick={() => handleClaim(reward.id)}>
                  دریافت
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {rewards.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 text-sm border border-dashed rounded-2xl">
            هیچ پاداشی تعریف نشده است
          </div>
        )}
      </div>

      {!isAdmin && (
        <>
          <h2 className="text-sm font-bold px-1 mt-6">سفارش‌های من</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {claims.map((claim: any) => (
                  <div key={claim.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm">{claim.reward?.name}</div>
                      <div className="text-xs text-gray-500 mt-1">هزینه: {claim.tokenCost} توکن</div>
                    </div>
                    <div>
                      {claim.status === 'PENDING' && <span className="flex items-center text-amber-500 text-xs bg-amber-500/10 px-2 py-1 rounded-full"><Clock className="w-3 h-3 mr-1"/> در انتظار تحویل</span>}
                      {claim.status === 'APPROVED' && <span className="flex items-center text-blue-500 text-xs bg-blue-500/10 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> تایید شده</span>}
                      {claim.status === 'DELIVERED' && <span className="flex items-center text-emerald-500 text-xs bg-emerald-500/10 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3 mr-1"/> تحویل شده</span>}
                    </div>
                  </div>
                ))}
                {claims.length === 0 && (
                  <div className="p-8 text-center text-gray-500 text-sm">هیچ سفارشی ثبت نشده است</div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
