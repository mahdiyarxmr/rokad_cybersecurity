export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
  statusCode?: number;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp?: string;
  path?: string;
}
