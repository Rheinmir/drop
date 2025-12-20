import { FileRecord, LoginResponse, UploadResponse } from '../types';

// Assuming relative path if hosted by FastAPI, or proxy setup in dev
const API_BASE = '/api';

export const login = async (password: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data: LoginResponse = await res.json();
    return data.success;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
};

export const fetchFiles = async (token: string): Promise<FileRecord[]> => {
  const res = await fetch(`${API_BASE}/files`, {
    headers: { 'auth-token': token },
  });
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return await res.json();
};

export const uploadFiles = async (files: File[], token: string): Promise<UploadResponse> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'auth-token': token },
    body: formData,
  });

  if (!res.ok) {
    throw new Error('Upload failed');
  }
  return await res.json();
};

export const getDownloadUrl = (fileId: number, token: string): string => {
  return `${API_BASE}/download/${fileId}?token=${token}`;
};

export const getPreviewUrl = (fileId: number, token: string): string => {
  return `${API_BASE}/download/${fileId}?token=${token}&inline=true`;
};

export const renameFile = async (fileId: number, newName: string, token: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/rename/${fileId}`, {
    method: 'PUT',
    headers: { 
      'auth-token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ new_name: newName }),
  });
  
  if (!res.ok) {
    throw new Error('Rename failed');
  }
};

export const deleteFile = async (fileId: number, token: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/delete/${fileId}`, {
    method: 'DELETE',
    headers: {
      'auth-token': token,
    },
  });

  if (!response.ok) {
    throw new Error('Delete failed');
  }
};

export const togglePin = async (fileId: number, token: string): Promise<{ is_pinned: number }> => {
  const res = await fetch(`${API_BASE}/pin/${fileId}`, {
    method: 'POST',
    headers: { 'auth-token': token },
  });

  if (!res.ok) {
    throw new Error('Toggle pin failed');
  }
  return await res.json();
};

export const updateFileMeta = async (fileId: number, group_name: string | null, tags: string | null, token: string): Promise<FileRecord> => {
  const res = await fetch(`${API_BASE}/meta/${fileId}`, {
    method: 'PUT',
    headers: { 'auth-token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_name, tags }),
  });
  
  if (!res.ok) {
    throw new Error('Update meta failed');
  }
  return await res.json();
};

export interface AnalyticsData {
    traffic: { date: string, upload: number, download: number }[];
    logins: { ip: string, status: string, time: number }[];
    fileTypes: { name: string, value: number }[];
}

export const fetchAnalytics = async (token: string): Promise<AnalyticsData> => {
  const res = await fetch(`${API_BASE}/analytics`, {
    headers: { 'auth-token': token },
  });
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return await res.json();
};

export const restoreBackup = async (files: FileList | File[], token: string): Promise<{message: string}> => {
  const formData = new FormData();
  
  // Handle both FileList and Array of Files
  const fileArray = files instanceof FileList ? Array.from(files) : files;
  
  fileArray.forEach(file => {
    formData.append('files', file);
  });
  
  const res = await fetch(`${API_BASE}/restore`, {
    method: 'POST',
    headers: { 'auth-token': token },
    body: formData
  });
  
  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(responseData.detail || 'Restore failed');
  }
  return responseData;
};

export const exportData = async (token: string): Promise<{message: string; files: string[]}> => {
  const res = await fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers: { 'auth-token': token }
  });
  
  if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Export failed');
  }
  return await res.json();
};

export const getBackupUrl = (token: string) => {
    return `${API_BASE}/backup?token=${token}`; 
};
