export interface FileRecord {
  id: number;
  filename: string;
  filepath: string;
  size: number;
  upload_time: number;
  is_pinned?: number;
  group_name?: string | null;
  tags?: string | null;
}

export interface LoginResponse {
  success: boolean;
}

export interface UploadResponse {
  message: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
}
