import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FileQuestion } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="p-4 rounded-full bg-primary-light border border-primary/20 text-primary-dark mb-4">
        <FileQuestion className="h-12 w-12" />
      </div>
      <h1 className="text-3xl font-extrabold text-ink-darker mb-2">۴۰۴ — صفحه یافت نشد</h1>
      <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
        صفحه‌ای که به دنبال آن هستید حذف شده یا آدرس وارد شده صحیح نمی‌باشد.
      </p>
      <Button variant="primary" onClick={() => navigate('/')}>
        بازگشت به صفحه اصلی
      </Button>
    </div>
  );
};
