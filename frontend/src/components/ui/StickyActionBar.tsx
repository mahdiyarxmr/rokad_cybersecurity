import React from 'react';

export interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-t border-gray-200/90 dark:border-gray-800 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:bg-transparent md:dark:bg-transparent md:border-0 md:p-0 md:shadow-none md:pb-0 ${className}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
};
