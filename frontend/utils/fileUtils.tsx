import { 
  FileImage, FileVideo, FileAudio, FileSpreadsheet, FileArchive, FileCode, FileText, File as FileGeneric 
} from 'lucide-react';

// Predefined colors for common file types - High Contrast / Vibrant
export const FILE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  // Documents
  pdf: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  doc: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-600/30' },
  docx: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-600/30' },
  txt: { bg: 'bg-slate-500/20', text: 'text-slate-200', border: 'border-slate-500/30' },
  md: { bg: 'bg-slate-600/20', text: 'text-white', border: 'border-slate-500/30' },
  // Spreadsheets
  xls: { bg: 'bg-emerald-600/20', text: 'text-emerald-400', border: 'border-emerald-600/30' },
  xlsx: { bg: 'bg-emerald-600/20', text: 'text-emerald-400', border: 'border-emerald-600/30' },
  csv: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  // Images
  jpg: { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-600/30' },
  jpeg: { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-600/30' },
  png: { bg: 'bg-purple-600/20', text: 'text-purple-400', border: 'border-purple-600/30' },
  gif: { bg: 'bg-fuchsia-600/20', text: 'text-fuchsia-400', border: 'border-fuchsia-600/30' },
  svg: { bg: 'bg-pink-600/20', text: 'text-pink-400', border: 'border-pink-600/30' },
  webp: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  // Videos
  mp4: { bg: 'bg-violet-600/20', text: 'text-violet-400', border: 'border-violet-600/30' },
  mov: { bg: 'bg-violet-600/20', text: 'text-violet-400', border: 'border-violet-600/30' },
  avi: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
  mkv: { bg: 'bg-violet-700/20', text: 'text-violet-400', border: 'border-violet-700/30' },
  // Audio
  mp3: { bg: 'bg-cyan-600/20', text: 'text-cyan-400', border: 'border-cyan-600/30' },
  wav: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  flac: { bg: 'bg-sky-600/20', text: 'text-sky-400', border: 'border-sky-600/30' },
  // Archives
  zip: { bg: 'bg-yellow-600/20', text: 'text-yellow-400', border: 'border-yellow-600/30' },
  rar: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-600/30' },
  '7z': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  tar: { bg: 'bg-amber-600/20', text: 'text-amber-400', border: 'border-amber-600/30' },
  // Code
  js: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  ts: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  tsx: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  jsx: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  py: { bg: 'bg-lime-600/20', text: 'text-lime-400', border: 'border-lime-600/30' },
  html: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-600/30' },
  css: { bg: 'bg-blue-600/20', text: 'text-blue-400', border: 'border-blue-600/30' },
  json: { bg: 'bg-gray-600/20', text: 'text-gray-300', border: 'border-gray-600/30' },
};

// Generate consistent high-contrast color from string hash
export const generateColorFromString = (str: string): { bg: string; text: string; border: string } => {
  const hueOptions = [0, 30, 60, 120, 180, 210, 270, 300, 330];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hueOptions[Math.abs(hash) % hueOptions.length];
  
  const colorMap: Record<number, { bg: string; text: string; border: string }> = {
    0: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
    30: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    60: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    120: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    180: { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30' },
    210: { bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' },
    270: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
    300: { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
    330: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
  };
  
  return colorMap[hue] || { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' };
};

export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

export const getFileTypeColor = (filename: string) => {
  const ext = getFileExtension(filename);
  return FILE_TYPE_COLORS[ext] || generateColorFromString(ext);
};

export const getFileIcon = (filename: string) => {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': case 'svg': case 'bmp':
      return FileImage;
    case 'mp4': case 'mov': case 'avi': case 'mkv': case 'webm':
      return FileVideo;
    case 'mp3': case 'wav': case 'flac': case 'm4a': case 'ogg':
      return FileAudio;
    case 'xls': case 'xlsx': case 'csv': case 'ods':
      return FileSpreadsheet;
    case 'zip': case 'rar': case '7z': case 'tar': case 'gz':
      return FileArchive;
    case 'js': case 'ts': case 'tsx': case 'jsx': case 'py': case 'html': case 'css': case 'json': case 'java': case 'cpp':
      return FileCode;
    case 'pdf': case 'doc': case 'docx': case 'txt': case 'rtf': case 'md':
      return FileText;
    default:
      return FileGeneric;
  }
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];

export const isImageFile = (filename: string): boolean => {
  const ext = getFileExtension(filename);
  return IMAGE_EXTENSIONS.includes(ext);
};

export const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
