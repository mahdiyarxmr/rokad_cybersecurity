import React, { useState } from 'react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './Table';
import { Skeleton } from './Skeleton';
import { ChevronDown, ChevronUp, Inbox } from 'lucide-react';

export interface ColumnDef<T> {
  key?: string;
  header: string;
  /**
   * Render function for the cell in desktop table view
   */
  render?: (item: T, index: number) => React.ReactNode;
  cell?: (item: T, index: number) => React.ReactNode;
  /**
   * Priority in mobile card view:
   * 'primary' -> shown in card header / title
   * 'secondary' -> shown in card body
   * 'detail' -> shown inside collapsible details (accordion)
   * 'hidden' -> not shown in mobile card
   */
  mobilePriority?: 'primary' | 'secondary' | 'detail' | 'hidden';
  mobileDetail?: boolean;
  className?: string;
}

export interface MobileDataTableProps<T> {
  data?: T[];
  items?: T[];
  columns: ColumnDef<T>[];
  keyExtractor?: (item: T, index: number) => string;
  primaryField?: (item: T, index: number) => React.ReactNode;
  secondaryField?: (item: T, index: number) => React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  cardActions?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export function MobileDataTable<T>({
  data,
  items,
  columns,
  keyExtractor = (item: any, index: number) => item?.id || item?._id || item?.key || String(index),
  primaryField,
  secondaryField,
  isLoading = false,
  emptyMessage = 'داده‌ای برای نمایش یافت نشد',
  emptyIcon,
  cardActions,
  className = '',
}: MobileDataTableProps<T>) {
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const listData: T[] = items || data || [];

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getColKey = (col: ColumnDef<T>, idx: number) => col.key || `col_${idx}_${col.header}`;

  const renderCell = (col: ColumnDef<T>, item: T, index: number) => {
    if (col.cell) return col.cell(item, index);
    if (col.render) return col.render(item, index);
    if (col.key && (item as any)[col.key] !== undefined) return (item as any)[col.key];
    return null;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {/* Mobile Loading Skeleton Cards */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48 rounded-md" />
              <div className="pt-2 border-t border-gray-100 flex gap-2">
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Loading Skeleton Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c, idx) => (
                  <TableHead key={getColKey(c, idx)}>{c.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((c, idx) => (
                    <TableCell key={getColKey(c, idx)}>
                      <Skeleton className="h-5 w-full max-w-[120px] rounded-md" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Empty state
  if (!listData || listData.length === 0) {
    return (
      <div className="p-8 sm:p-12 bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] shadow-xs text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#1C2536] text-gray-400 dark:text-gray-500 flex items-center justify-center mb-3">
          {emptyIcon || <Inbox className="w-6 h-6" />}
        </div>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{emptyMessage}</p>
      </div>
    );
  }

  // Split columns for mobile view
  const primaryCols = columns.filter((c) => c.mobilePriority === 'primary');
  const secondaryCols = columns.filter(
    (c) =>
      !c.mobileDetail &&
      (c.mobilePriority === 'secondary' || (!c.mobilePriority && !primaryField))
  );
  const detailCols = columns.filter((c) => c.mobileDetail || c.mobilePriority === 'detail');

  return (
    <div className={`w-full ${className}`}>
      {/* 1. MOBILE VIEW (< 768px): Responsive Tactile Card List */}
      <div className="md:hidden space-y-3">
        {listData.map((item, index) => {
          const key = keyExtractor(item, index);
          const isExpanded = !!expandedKeys[key];

          return (
            <div
              key={key}
              className="bg-white dark:bg-[#151C28] rounded-2xl border border-gray-200/80 dark:border-[#242F42] shadow-[2.75px_2.75px_0_#202A5A] dark:shadow-[2.75px_2.75px_0_#59BBAF] p-4 sm:p-5 transition-all space-y-3.5"
            >
              {/* Card Header */}
              {primaryField || secondaryField ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {primaryField && primaryField(item, index)}
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                    {secondaryField && secondaryField(item, index)}
                    {cardActions && cardActions(item, index)}
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {primaryCols.length > 0 ? (
                      primaryCols.map((col, cIdx) => (
                        <div key={getColKey(col, cIdx)} className="text-sm font-bold text-ink-darker dark:text-white break-words">
                          {renderCell(col, item, index)}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm font-bold text-ink-darker dark:text-white">
                        {renderCell(columns[0], item, index)}
                      </div>
                    )}
                  </div>

                  {/* Card Top Actions / Status */}
                  {cardActions && (
                    <div className="shrink-0 flex items-center gap-1.5">
                      {cardActions(item, index)}
                    </div>
                  )}
                </div>
              )}

              {/* Card Body (Secondary Columns) */}
              {secondaryCols.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-3 border-t border-gray-100 dark:border-gray-800">
                  {secondaryCols.map((col, cIdx) => (
                    <div key={getColKey(col, cIdx)} className="flex items-center justify-between gap-2.5 py-1.5 px-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50">
                      <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0">{col.header}:</span>
                      <span className="font-bold text-ink-darker dark:text-gray-100 truncate">
                        {renderCell(col, item, index)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Collapsible Details (Detail Columns) */}
              {detailCols.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => toggleExpand(key)}
                    className="w-full min-h-[38px] py-1.5 px-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-between text-xs font-black text-primary transition-all cursor-pointer border border-gray-200/60 dark:border-gray-700/60 select-none"
                  >
                    <span>{isExpanded ? 'بستن جزئیات تکمیلی' : 'مشاهده جزئیات بیشتر'}</span>
                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 p-3 rounded-xl bg-gray-50/90 dark:bg-[#1C2536] border border-gray-200/70 dark:border-gray-700/70 space-y-2 text-xs divide-y divide-gray-200/60 dark:divide-gray-700/60 animate-in fade-in">
                      {detailCols.map((col, cIdx) => (
                        <div
                          key={getColKey(col, cIdx)}
                          className={`flex items-center justify-between gap-3 ${cIdx > 0 ? 'pt-2' : ''} py-0.5`}
                        >
                          <span className="text-gray-500 dark:text-gray-400 font-medium shrink-0 text-xs">
                            {col.header}:
                          </span>
                          <div className="font-bold text-ink-darker dark:text-gray-100 text-right">
                            {renderCell(col, item, index)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 2. DESKTOP VIEW (>= 768px): Full Structured Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => {
                const isActionCol = col.key === 'actions' || col.header === 'عملیات' || col.className?.includes('text-center');
                return (
                  <TableHead
                    key={getColKey(col, idx)}
                    className={`${isActionCol ? 'text-center' : ''} ${col.className || ''}`}
                  >
                    {col.header}
                  </TableHead>
                );
              })}
              {cardActions && !columns.some((c) => c.key === 'actions' || c.header === 'عملیات') && (
                <TableHead className="text-center w-28">عملیات</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {listData.map((item, index) => {
              const key = keyExtractor(item, index);
              return (
                <TableRow key={key}>
                  {columns.map((col, idx) => {
                    const isActionCol = col.key === 'actions' || col.header === 'عملیات' || col.className?.includes('text-center');
                    return (
                      <TableCell
                        key={getColKey(col, idx)}
                        className={`${isActionCol ? 'text-center' : ''} ${col.className || ''}`}
                      >
                        {renderCell(col, item, index)}
                      </TableCell>
                    );
                  })}
                  {cardActions && !columns.some((c) => c.key === 'actions' || c.header === 'عملیات') && (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {cardActions(item, index)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
