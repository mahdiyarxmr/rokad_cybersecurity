import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="p-4 rounded-full bg-red-50 border border-red-200 text-red-600 mb-4">
        <ShieldAlert className="h-12 w-12" />
      </div>
      <h1 className="text-3xl font-extrabold text-ink-darker mb-2">۴۰۳ — عدم دسترسی مجاز</h1>
      <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
        شما مجوز دسترسی به این بخش از پلتفرم را ندارید یا نقش کاربری شما محدود شده است.
      </p>
      <Button variant="primary" onClick={() => navigate('/login')}>
        بازگشت به صفحه ورود / داشبورد
      </Button>
    </div>
  );
};
