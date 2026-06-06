export interface Column<T = Record<string, unknown>> {
  key: string;
  header: string;
  format?: (value: unknown, row: T) => string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  badge?: boolean;
  html?: boolean;
}
