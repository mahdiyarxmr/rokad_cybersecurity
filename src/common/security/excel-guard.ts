import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export const EXCEL_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxSheets: 3,
  maxRows: 2000,
  maxColumns: 40,
};

/** Parse one untrusted workbook with hard caps. Does not evaluate formulas. */
export function readBoundedSheet(buffer: Buffer): any[][] {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('فایل اکسل خالی است');
  }
  if (buffer.length > EXCEL_LIMITS.maxBytes) {
    throw new BadRequestException('حجم فایل اکسل بیش از ۲ مگابایت است');
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      sheetRows: EXCEL_LIMITS.maxRows + 1,
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
      bookVBA: false,
    });
  } catch {
    throw new BadRequestException('فایل اکسل قابل خواندن نیست');
  }

  const names = workbook.SheetNames || [];
  if (names.length === 0 || names.length > EXCEL_LIMITS.maxSheets) {
    throw new BadRequestException('تعداد شیت‌های فایل اکسل مجاز نیست');
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[names[0]], {
    header: 1,
    blankrows: false,
    raw: true,
  }) as any[][];

  if (rows.length > EXCEL_LIMITS.maxRows + 1) {
    throw new BadRequestException('تعداد سطرهای فایل اکسل بیش از حد مجاز است');
  }
  for (const row of rows) {
    if (Array.isArray(row) && row.length > EXCEL_LIMITS.maxColumns) {
      throw new BadRequestException('تعداد ستون‌های فایل اکسل بیش از حد مجاز است');
    }
  }
  return rows;
}
