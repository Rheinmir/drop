import React from 'react';
import { Pin, PinOff, Database, Edit2, Copy, Check, Eye, Download, Trash2, MoreVertical } from 'lucide-react';
import { FileRecord } from '../types';
import { getDownloadUrl, getPreviewUrl } from '../services/api';
import { getFileExtension, getFileTypeColor, getFileIcon, isImageFile, formatSize } from '../utils/fileUtils';

interface FileGridItemProps {
  file: FileRecord;
  token: string;
  activeMenuId: number | null;
  selectedFile: FileRecord | null;
  copiedId: number | null;
  t: (key: string) => string;
  setActiveMenuId: (id: number | null) => void;
  setSelectedFile: (file: FileRecord) => void;
  handlePin: (file: FileRecord) => void;
  handleEditMeta: (file: FileRecord) => void;
  handleRename: (file: FileRecord) => void;
  handleCopy: (file: FileRecord) => void;
  handleDelete: (file: FileRecord) => void;
}

export const FileGridItem: React.FC<FileGridItemProps> = ({
  file,
  token,
  activeMenuId,
  selectedFile,
  copiedId,
  t,
  setActiveMenuId,
  setSelectedFile,
  handlePin,
  handleEditMeta,
  handleRename,
  handleCopy,
  handleDelete
}) => {
  const ext = getFileExtension(file.filename);
  const colorClasses = getFileTypeColor(file.filename);
  const IconComp = getFileIcon(file.filename);
  const isImg = isImageFile(file.filename);
  const isActive = activeMenuId === file.id;

  return (
    <div 
      onClick={() => setSelectedFile(file)}
      style={{ zIndex: isActive ? 50 : 0 }}
      className={`group relative aspect-square rounded-2xl border cursor-pointer flex flex-col items-center justify-center p-3 gap-2
          ${selectedFile?.id === file.id ? 'bg-ocean-500/10 border-ocean-500/50 shadow-[0_0_15px_rgba(14,165,233,0.15)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}
          transition-all duration-200
      `}
    > 
       {/* Pin Indicator */}
       {!!file.is_pinned && <Pin size={12} className="absolute top-2 left-2 text-amber-400 rotate-45 z-10 drop-shadow-md" />}

       {/* Content: Image Preview or Icon */}
       {isImg ? (
          <div className="flex-1 w-full h-full overflow-hidden rounded-xl relative shadow-sm">
              <img 
                  src={getDownloadUrl(file.id, token)} 
                  alt={file.filename}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
              />
          </div>
       ) : (
          <div className={`p-4 rounded-2xl transition-all duration-300 shadow-lg ${file.is_pinned ? 'bg-amber-500/20 text-amber-400 shadow-amber-500/10' : colorClasses.bg + ' ' + colorClasses.text + ' shadow-black/20'}`}>
              <IconComp size={32} strokeWidth={1.5} />
          </div>
       )}

       {/* Text Info */}
       <div className="text-center w-full px-1 relative z-0 mt-1">
          <p className="text-xs font-medium text-slate-200 truncate w-full pointer-events-none group-hover:text-white transition-colors">{file.filename}</p>
          <p className="text-[9px] text-slate-500 mt-0.5 pointer-events-none font-medium opacity-70 group-hover:opacity-100 transition-opacity">{formatSize(file.size)}</p>
       </div>

       {/* Action Menu (Absolute Positioned with High Z-Index) */}
       <div className={`absolute top-2 right-2 z-[1000] transition-all duration-200 action-menu ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}>
          <button 
              onClick={(e) => { e.stopPropagation(); setActiveMenuId(isActive ? null : file.id); }}
              className={`p-1.5 rounded-lg backdrop-blur-md transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-black/40 text-white/80 hover:bg-black/60 hover:text-white'}`}
          >
              <MoreVertical size={14} />
          </button>
           {/* Dropdown Menu */}
           {isActive && (
              <div className="absolute right-0 top-full mt-2 w-48 glass-heavy border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in zoom-in-95 duration-200 flex flex-col p-1.5 ring-1 ring-black/5">
                   <div className="flex flex-col gap-0.5">
                       <button onClick={() => handlePin(file)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                           {file.is_pinned ? <PinOff size={14} className="text-amber-500" /> : <Pin size={14} className="text-slate-400" />} {file.is_pinned ? (t('unpin') || 'Unpin') : (t('pin') || 'Pin')}
                       </button>
                       <button onClick={() => handleEditMeta(file)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                           <Database size={14} className="text-pink-400" /> {t('editInfo') || 'Edit Info'}
                       </button>
                       <button onClick={() => handleRename(file)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                           <Edit2 size={14} className="text-orange-400" /> {t('rename')}
                       </button>
                       <button onClick={() => handleCopy(file)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                           {copiedId === file.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-blue-400" />} {copiedId === file.id ? 'Copied' : t('copyLink')}
                       </button>
                       <a href={getPreviewUrl(file.id, token)} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                           <Eye size={14} className="text-indigo-400" /> {t('preview')}
                       </a>
                       <a href={getDownloadUrl(file.id, token)} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                           <Download size={14} className="text-emerald-400" /> {t('download')}
                       </a>
                       <div className="h-px bg-white/10 my-1 mx-2"></div>
                       <button onClick={() => handleDelete(file)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors">
                           <Trash2 size={14} /> {t('delete')}
                       </button>
                   </div>
              </div>
           )}
       </div>
    </div>
  );
};
