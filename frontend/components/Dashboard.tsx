import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FileRecord } from '../types';
import { fetchFiles, uploadFiles, getDownloadUrl, getPreviewUrl, togglePin, updateFileMeta, fetchAnalytics, AnalyticsData, restoreBackup, getBackupUrl } from '../services/api';
import { BarChart as BarGraph, LineChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as PieGraph, Pie, Cell, AreaChart, Area } from 'recharts';
import { Upload, FileText, Download, RefreshCw, LogOut, HardDrive, Clock, CheckCircle, Eye, Copy, Check, Edit2, Palette, Sun, Moon, Book, CloudRain, Mountain, Droplets, MoreVertical, Globe, Languages, Trash2, FolderOpen, ChevronLeft, ChevronRight, Pin, PinOff, Search, ArrowUpDown, Filter, Tag, Layers, Database, PieChart, List, FileImage, FileVideo, FileAudio, FileCode, FileArchive, FileSpreadsheet, File as FileGeneric, X, ZoomIn, ZoomOut, RotateCcw, RotateCw, AlertCircle } from 'lucide-react';
// @ts-ignore
import Favico from 'favico.js';
import { translations, Language } from '../translations';
import { getFileExtension, getFileTypeColor, getFileIcon, isImageFile, formatSize } from '../utils/fileUtils';
import { FileGridItem } from './FileGridItem';



interface DashboardProps {
  token: string;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ token, onLogout }) => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Theme & Language
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('app-theme') || 'ocean');
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('app-lang');
    if (saved && Object.keys(translations).includes(saved)) {
      return saved as Language;
    }
    return 'vi';
  });
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Menu visibility states
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  
  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [previewRotation, setPreviewRotation] = useState<number>(0);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [bgImage, setBgImage] = useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('dash_bg_image') : null);
  const [bgOpacity, setBgOpacity] = useState<number>(() => typeof window !== 'undefined' ? parseFloat(localStorage.getItem('dash_bg_opacity') || '0.9') : 0.9);
  
  const [time, setTime] = useState(new Date());
  const [utcMode, setUtcMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const itemsPerPage = viewMode === 'grid' ? 15 : 10;
  
  // Edit Meta State
  const [editGroup, setEditGroup] = useState('');
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Insight State
  const [showInsight, setShowInsight] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  const faviconRef = useRef<any>(null);
  const notificationCountRef = useRef(0);
  
  // Backup & Restore
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
      setIsExporting(true);
      try {
          // @ts-ignore
          await import('../services/api').then(mod => mod.exportData(token));
          alert(t('exportSuccess') || 'Export created. Please check the file list to download.');
          loadData();
      } catch (err: any) {
          alert(err.message || 'Export failed');
      } finally {
          setIsExporting(false);
      }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          if (!window.confirm(t('restoreConfirm'))) {
              e.target.value = '';
              return;
          }
          
          setIsRestoring(true);
          try {
              // @ts-ignore
              await import('../services/api').then(mod => mod.restoreBackup(e.target.files!, token));
              alert(t('restoreSuccess'));
              window.location.reload();
          } catch (err: any) {
              alert(err.message || 'Restore failed');
          } finally {
              setIsRestoring(false);
              if (restoreInputRef.current) restoreInputRef.current.value = '';
          }
      }
  };

  // Reset zoom, offset, and rotation when selected file changes
  useEffect(() => {
    setPreviewZoom(1);
    setPreviewRotation(0);
    setPreviewOffset({ x: 0, y: 0 });
  }, [selectedFile]);

  const handlePreviewWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      e.preventDefault(); // Note: React's synthetic event might not prevent native scroll if passive. But we try.
      
      const delta = e.deltaY * -0.001;
      setPreviewZoom(prev => Math.min(Math.max(0.5, prev + delta), 5));
  };
  
  const handlePreviewMouseDown = (e: React.MouseEvent) => {
      if (previewZoom > 1) {
          setIsDraggingPreview(true);
          setDragStart({ x: e.clientX - previewOffset.x, y: e.clientY - previewOffset.y });
      }
  };

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
      if (isDraggingPreview && previewZoom > 1) {
          setPreviewOffset({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y
          });
      }
  };

  const handlePreviewMouseUp = () => {
      setIsDraggingPreview(false);
  };
  
  const handleResetPreview = () => {
      setPreviewZoom(1);
      setPreviewRotation(0);
      setPreviewOffset({ x: 0, y: 0 });
  };



  const handleRotatePreview = () => {
      setPreviewRotation(prev => (prev + 90) % 360);
  };

  const handleContainerWheel = (e: React.WheelEvent) => {
    // Prevent default scroll if we are handling page change
    // But since the container is fixed height without overflow, standard scroll isn't an issue unless overflow happens
    // We only want to trigger page change.
    
    // Add a small threshold to avoid sensitivity
    if (Math.abs(e.deltaY) > 30) {
        if (e.deltaY > 0) {
            // Scroll Down -> Next Page
            if (currentPage < totalPages) {
                setCurrentPage(p => p + 1);
            }
        } else {
            // Scroll Up -> Prev Page
            if (currentPage > 1) {
                setCurrentPage(p => p - 1);
            }
        }
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 4 * 1024 * 1024) { // 4MB limit for safety
            alert("Image too large for local storage (Limit 4MB). Please choose a smaller image.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            try {
                localStorage.setItem('dash_bg_image', result);
                setBgImage(result);
            } catch (err) {
                alert("Storage full. Remove some data or choose smaller image.");
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const updateBgOpacity = (val: number) => {
      setBgOpacity(val);
      localStorage.setItem('dash_bg_opacity', val.toString());
  };
  const lastFileCountRef = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string) => translations[lang][key] || key;

  const themes = [
    { id: 'ocean', name: 'Ocean', icon: Droplets, color: 'text-cyan-400' },
    { id: 'light', name: 'Light', icon: Sun, color: 'text-amber-400' },
    { id: 'sea', name: 'Sea', icon: CloudRain, color: 'text-teal-400' },
    { id: 'sand', name: 'Sand', icon: Mountain, color: 'text-orange-400' },
    { id: 'book', name: 'Book', icon: Book, color: 'text-amber-700' },
    { id: 'midnight', name: 'Midnight', icon: Moon, color: 'text-purple-400' },
  ];

  const languages: { id: Language; name: string }[] = [
    { id: 'vi', name: 'Tiếng Việt' },
    { id: 'en', name: 'English' },
    { id: 'ru', name: 'Русский' },
    { id: 'de', name: 'Deutsch' },
    { id: 'kk', name: 'Қазақша' },
    { id: 'zh', name: '中文' },
  ];

  useEffect(() => {
    faviconRef.current = new Favico({
      animation: 'pop',
      position: 'up',
      bgColor: '#800020', // Velvet color
      textColor: '#ffffff'
    });
    
    // Initialize audio
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.load();
  }, []);

  // Unlock audio context on interaction
  useEffect(() => {
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.volume = 0; // Mute for unlock
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.volume = 1; // Restore volume
        }).catch(() => {});
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('app-lang', lang);
  }, [lang]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (activeMenuId !== null && !((event.target as Element).closest('.action-menu'))) {
            setActiveMenuId(null);
        }
        if (showThemeMenu && !((event.target as Element).closest('.theme-menu'))) {
            setShowThemeMenu(false);
        }
        if (showLangMenu && !((event.target as Element).closest('.lang-menu'))) {
          setShowLangMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId, showThemeMenu, showLangMenu]);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error('Audio play failed:', e));
    }
  }, []);

  const loadData = useCallback(async (isPolling = false) => {
    try {
      const data = await fetchFiles(token);
      setFiles(data);
      
      const newCount = data.length;
      
      // Initial load or first valid poll
      if (lastFileCountRef.current === 0 && newCount > 0) {
        lastFileCountRef.current = newCount;
      }
      // If polling and we have more files
      else if (isPolling && newCount > lastFileCountRef.current) {
        const diff = newCount - lastFileCountRef.current;
        if (document.hidden) {
          notificationCountRef.current += diff;
          faviconRef.current?.badge(notificationCountRef.current);
          playNotificationSound();
        }
        lastFileCountRef.current = newCount;
      } else if (newCount < lastFileCountRef.current) {
          // Files deleted, just sync count
          lastFileCountRef.current = newCount;
      }
      
    } catch (error) {
      console.error(error);
      if (!isPolling) onLogout();
    }
  }, [token, onLogout, playNotificationSound]);

  const loadAnalyticsData = async () => {
      try {
          const data = await fetchAnalytics(token);
          setAnalyticsData(data);
      } catch(err) {
          console.error("Failed to load analytics", err);
      }
  };

  useEffect(() => {
      if (showInsight) {
          loadAnalyticsData();
      }
  }, [showInsight]);

  useEffect(() => {
    loadData(); // Initial load

    // Poll every 5 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);

    // Clear badge on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        notificationCountRef.current = 0;
        faviconRef.current?.badge(0);
        // Ensure audio is ready for next background run
        if (audioRef.current) {
             audioRef.current.load();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadData]);

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    setIsUploading(true);
    setUploadSuccess(false);
    
    const filesArray = Array.from(fileList);
    try {
      await uploadFiles(filesArray, token);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      loadData();
    } catch (err) {
      alert(t('uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  /* Removed local constants and helpers */

  const handleCopy = async (file: FileRecord) => {
    const ext = getFileExtension(file.filename);
    
    if (isImageFile(file.filename)) {
      // Copy image to clipboard
      try {
        const url = getDownloadUrl(file.id, token);
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Convert to PNG for clipboard compatibility (most browsers support PNG)
        let clipboardBlob = blob;
        if (blob.type !== 'image/png') {
          // Create canvas to convert image to PNG
          const img = new Image();
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);
              resolve();
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
          });
          
          clipboardBlob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png');
          });
        }
        
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': clipboardBlob })
        ]);
        setCopiedId(file.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        console.error('Failed to copy image:', err);
        // Fallback to copying link
        const url = window.location.origin + getDownloadUrl(file.id, token);
        await navigator.clipboard.writeText(url);
        setCopiedId(file.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } else {
      // Copy link for non-image files
      const url = window.location.origin + getDownloadUrl(file.id, token);
      try {
        await navigator.clipboard.writeText(url);
        setCopiedId(file.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
    setActiveMenuId(null);
  };

  const handleRename = async (file: FileRecord) => {
    const newName = window.prompt(t('enterNewName'), file.filename);
    if (!newName || newName === file.filename) return;
    
    try {
      // @ts-ignore
      await import('../services/api').then(mod => mod.renameFile(file.id, newName, token));
      loadData();
    } catch (err) {
      alert(t('renameFailed'));
      console.error(err);
    }
    setActiveMenuId(null);
  };

  const handleDelete = async (file: FileRecord) => {
    if (!window.confirm(t('deleteConfirm'))) return;
    
    try {
      // @ts-ignore
      await import('../services/api').then(mod => mod.deleteFile(file.id, token));
      loadData();
    } catch (err) {
      alert(t('deleteFailed'));
      console.error(err);
    }
    setActiveMenuId(null);
  };

  const handlePin = async (file: FileRecord) => {
    try {
      const res = await togglePin(file.id, token);
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, is_pinned: res.is_pinned } : f));
    } catch (err) {
      console.error(err);
    }
    setActiveMenuId(null);
  };

  const handleEditMeta = (file: FileRecord) => {
    setEditGroup(file.group_name || '');
    setEditTags(file.tags || '');
    setEditingFile(file);
    setActiveMenuId(null);
  };

  const handleSaveMeta = async () => {
    if (!editingFile) return;
    try {
      // @ts-ignore
      await import('../services/api').then(mod => mod.updateFileMeta(editingFile.id, { group_name: editGroup, tags: editTags }, token));
      loadData();
      setEditingFile(null);
    } catch (err) {
      console.error(err);
      alert(t('updateFailed') || 'Update failed');
    }
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    files.forEach(f => {
      if (f.group_name) groups.add(f.group_name);
    });
    return Array.from(groups).sort();
  }, [files]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    files.forEach(f => {
      if (f.tags) {
        f.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [files]);

  const totalStorage = useMemo(() => {
    return files.reduce((acc, curr) => acc + curr.size, 0);
  }, [files]);

  const processedFiles = useMemo(() => {
    let result = [...files];

    // Filter by Group
    if (selectedGroup !== 'all') {
      result = result.filter(f => f.group_name === selectedGroup);
    }
    
    // Filter by Tag
    if (selectedTag !== 'all') {
      result = result.filter(f => f.tags && f.tags.split(',').map(t => t.trim()).includes(selectedTag));
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.filename.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      // Pin always on top
      const pinA = a.is_pinned || 0;
      const pinB = b.is_pinned || 0;
      if (pinA !== pinB) return pinB - pinA;

      let valA: any = a.upload_time;
      let valB: any = b.upload_time;
      
      let sortField = 'date';
      let sortDirection = 'desc';

      if (sortBy.includes('_')) {
          const parts = sortBy.split('_');
          sortField = parts[0];
          sortDirection = parts[1];
      } else {
          sortField = sortBy;
          sortDirection = sortOrder;
      }

      if (sortField === 'name') {
        valA = a.filename.toLowerCase();
        valB = b.filename.toLowerCase();
      } else if (sortField === 'type') {
        valA = getFileExtension(a.filename);
        valB = getFileExtension(b.filename);
      } else if (sortField === 'size') {
        valA = a.size;
        valB = b.size;
      }

      // Check explicit direction from combo string first, then state fallback
      const dir = sortDirection === 'asc' ? 1 : -1;

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });

    return result;
  }, [files, searchQuery, sortBy, sortOrder, selectedGroup, selectedTag]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroup, selectedTag, sortBy, sortOrder]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFiles = processedFiles.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedFiles.length / itemsPerPage);

    return (
    <div className="min-h-screen bg-transparent text-slate-200 font-sans transition-colors duration-500 selection:bg-ocean-500/30 overflow-x-hidden relative">
      
      {/* Background Layer */}
      {bgImage && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center transition-opacity duration-700 pointer-events-none"
          style={{ backgroundImage: `url(${bgImage})`, opacity: bgOpacity }}
        />
      )}
      
      {/* Mac-style Floating Header */}
      <header className="fixed top-4 left-4 right-4 h-16 glass z-50 rounded-2xl px-4 flex items-center justify-between shadow-2xl transition-all duration-500 animate-[scale-in_0.3s_ease-out]">
          {/* Logo Section */}
          <div className="flex items-center gap-3 group pl-2">
            <div className="relative">
               <div className="bg-gradient-to-br from-ocean-400 to-ocean-600 p-2 rounded-xl shadow-lg shadow-ocean-500/20 group-hover:scale-110 transition-transform duration-300">
                 <HardDrive size={20} className="text-white" />
               </div>
               <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">
                {t('Drop')}
              </h1>
            </div>
          </div>
          
          {/* Center Search (Spotlight Style) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm hidden md:block">
             <div className="relative group/search">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-ocean-400 transition-colors" strokeWidth={2} />
                <input 
                  type="text" 
                  placeholder={t('search')} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/20 border border-white/5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:bg-slate-900/40 focus:border-ocean-500/30 focus:shadow-[0_0_15px_rgba(14,165,233,0.1)] transition-all font-light backdrop-blur-sm"
                />
             </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 pr-2">
             {/* Clock */}
             <div 
               onClick={() => setUtcMode(!utcMode)}
               className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-pointer select-none"
             >
                <Clock size={14} className="text-ocean-300" />
                <span className="text-xs font-medium text-slate-300 tabular-nums tracking-wide">
                  {utcMode ? time.toISOString().split('T')[1].split('.')[0] + ' UTC' : time.toLocaleTimeString()}
                </span>
             </div>

             <div className="h-6 w-px bg-white/10 hidden lg:block"></div>

             {/* Language */}
             <div className="relative group/lang">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white">
                  <Globe size={18} strokeWidth={1.5} />
                </button>
                <div className="absolute top-full right-0 pt-4 w-32 hidden group-hover/lang:block z-50">
                    <div className="glass-panel rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                        {languages.map(l => (
                          <button key={l.id} onClick={() => setLang(l.id)} className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${lang === l.id ? 'bg-white/10 text-ocean-400' : 'text-slate-300 hover:bg-white/5'}`}>{l.name}</button>
                        ))}
                    </div>
                </div>
             </div>

             {/* Appearance */}
             <div className="relative group/appearance">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white">
                    <Palette size={18} strokeWidth={1.5} />
                </button>
                <div className="absolute top-full right-0 pt-4 w-72 hidden group-hover/appearance:block z-50">
                    <div className="glass-heavy rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 border border-white/10">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Background</h3>
                        <label className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition-colors mb-4 border border-white/5 group/upload-bg">
                            <div className="p-2 bg-ocean-500/20 rounded-lg text-ocean-400 group-hover/upload-bg:scale-110 transition-transform">
                                <FileImage size={16} />
                            </div>
                            <div className="flex-1">
                                <span className="text-sm text-white font-medium block">Upload Image</span>
                                <span className="text-[10px] text-slate-500">Max 4MB</span>
                            </div>
                            <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                        </label>
                        
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                                <span>Opacity</span>
                                <span>{Math.round(bgOpacity * 100)}%</span>
                            </div>
                            <input 
                              type="range" min="0" max="1" step="0.05" value={bgOpacity} 
                              onChange={(e) => updateBgOpacity(parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-ocean-500"
                            />
                        </div>

                        {bgImage && (
                            <button 
                              onClick={() => { setBgImage(null); localStorage.removeItem('dash_bg_image'); }}
                              className="w-full flex items-center justify-center gap-2 p-2 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-medium transition-colors mb-4"
                            >
                                <Trash2 size={14} /> Remove Background
                            </button>
                        )}
                        
                        <div className="pt-4 border-t border-white/10">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Theme</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {themes.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all ${theme === t.id ? 'bg-white/10 border-ocean-400 text-ocean-400' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                                    >
                                        <t.icon size={14} />
                                        <span className="text-[10px] font-medium">{t.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
             </div>

             {/* Insight */}
             <button 
                 onClick={() => setShowInsight(!showInsight)}
                 className={`p-2 rounded-lg transition-all border border-transparent ${showInsight ? 'bg-ocean-500/20 text-ocean-300' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
             >
               <PieChart size={18} strokeWidth={1.5} />
             </button>
             
             <div className="h-6 w-px bg-white/10 ml-1 mr-1"></div>

             {/* Logout */}
             <button onClick={onLogout} className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors" title="Logout">
                <LogOut size={18} strokeWidth={1.5} />
             </button>
          </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-[1600px] mx-auto pt-24 pb-8 px-4 relative z-10">
        
        {/* Insight Modal Overlay */}
        {showInsight && (
            <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
                <div className="max-w-7xl mx-auto p-4 pt-20">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                             <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">System Insight</h2>
                             <p className="text-slate-400">Traffic analysis and usage statistics</p>
                        </div>
                        <button onClick={() => setShowInsight(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                            <X size={32} strokeWidth={1.5} />
                        </button>
                    </div>

                    {analyticsData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Traffic Chart */}
                            <div className="glass-panel rounded-3xl p-6 shadow-xl">
                                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                    <ArrowUpDown size={20} className="text-ocean-400"/> Network Traffic (Last 7 Days)
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analyticsData.traffic}>
                                            <defs>
                                                <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} />
                                            <YAxis stroke="#94a3b8" tick={{fontSize: 12}} tickFormatter={(value) => formatSize(value)} />
                                            <Tooltip 
                                                contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                                itemStyle={{color: '#f8fafc', fontWeight: 500}}
                                                labelStyle={{color: '#94a3b8'}}
                                                formatter={(value: any) => formatSize(value)}
                                            />
                                            <Area type="monotone" dataKey="upload" stroke="#f43f5e" fillOpacity={1} fill="url(#colorUp)" name="Upload" />
                                            <Area type="monotone" dataKey="download" stroke="#10b981" fillOpacity={1} fill="url(#colorDown)" name="Download" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* File Types Pie Chart */}
                            <div className="glass-panel rounded-3xl p-6 shadow-xl">
                                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                    <PieChart size={20} className="text-purple-400"/> File Distribution
                                </h3>
                                <div className="h-[300px] w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieGraph>
                                            <Pie
                                                data={analyticsData.fileTypes}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {analyticsData.fileTypes.map((entry, index) => {
                                                    const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#d946ef'];
                                                    return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.05)" strokeWidth={2} />;
                                                })}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                                                itemStyle={{color: '#f8fafc', fontWeight: 500}}
                                            />
                                        </PieGraph>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            {/* Login History */}
                            <div className="lg:col-span-2 glass-panel rounded-3xl p-6 shadow-xl">
                                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                    <Globe size={20} className="text-amber-400"/> Application Access Logs (Last 20)
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/10 text-slate-400 text-sm">
                                                <th className="pb-3 pl-4">Timestamp</th>
                                                <th className="pb-3">IP Address</th>
                                                <th className="pb-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {analyticsData.logins.map((login, idx) => (
                                                <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                    <td className="py-3 pl-4 font-mono text-slate-300">{formatDate(login.time)}</td>
                                                    <td className="py-3 font-mono text-slate-300">{login.ip}</td>
                                                    <td className="py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${login.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                            {login.status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Data Management */}
                            <div className="lg:col-span-2 glass-panel rounded-3xl p-6 shadow-xl">
                                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                    <Database size={20} className="text-indigo-400"/> {t('actions')}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Export */}
                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                                <Download size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-medium">{t('exportData')}</h4>
                                                <p className="text-sm text-slate-400">{t('backupDesc')}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleBackup}
                                            disabled={isExporting}
                                            className={`mt-2 w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2`}
                                        >
                                            {isExporting ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />} 
                                            {isExporting ? t('exporting') || 'Exporting...' : t('backup')}
                                        </button>
                                    </div>

                                    {/* Import */}
                                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                                                <Upload size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-medium">{t('importData')}</h4>
                                                <p className="text-sm text-slate-400">{t('restoreDesc')}</p>
                                            </div>
                                        </div>
                                        <label className={`mt-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${isRestoring ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {isRestoring ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                                            {isRestoring ? t('restoring') : t('restore')}
                                            <input 
                                                type="file" 
                                                accept=".zip,.001,.002,.003,.part1,.part2" 
                                                multiple
                                                className="hidden" 
                                                onChange={handleRestore} 
                                                ref={restoreInputRef}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-96">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-400"></div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {dragActive && (
          <div 
            className="fixed inset-0 z-50 bg-ocean-500/20 backdrop-blur-md border-[6px] border-ocean-400/50 border-dashed m-6 rounded-[2rem] flex items-center justify-center pointer-events-none transition-all duration-300"
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
          >
            <div className="bg-ocean-500/90 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl backdrop-blur-xl animate-bounce tracking-wide text-lg">
              {t('dropFiles')}
            </div>
          </div>
        )}

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Upload & Preview - Col Span 4 */}
        <section className="lg:col-span-4 h-full flex flex-col gap-6">
          <div 
            className={`relative h-full min-h-[400px] glass rounded-3xl ${dragActive ? 'border-ocean-400 bg-ocean-500/10' : ''} shadow-2xl flex flex-col items-center justify-center text-center p-6 transition-all overflow-hidden group/upload`}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
          >
             {/* Preview Layer */}
             {selectedFile ? (
               <>
                   <div 
                       className={`absolute inset-0 z-0 flex items-center justify-center bg-slate-900/60 transition-all overflow-hidden ${isDraggingPreview ? 'cursor-grab active:cursor-grabbing' : ''}`}
                       onWheel={handlePreviewWheel}
                       onMouseDown={handlePreviewMouseDown}
                       onMouseMove={handlePreviewMouseMove}
                       onMouseUp={handlePreviewMouseUp}
                       onMouseLeave={handlePreviewMouseUp}
                       onDragStart={(e) => e.preventDefault()}
                   >
                     {['jpg','jpeg','png','gif','webp','svg','bmp'].includes(getFileExtension(selectedFile.filename)) ? (
                       <img 
                         draggable={false}
                         src={getDownloadUrl(selectedFile.id, token)} 
                         alt="Preview" 
                         className="w-full h-full object-contain transition-transform duration-75 select-none"
                         style={{ transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewZoom}) rotate(${previewRotation}deg)` }}
                       />
                     ) : ['mp4','mov','avi','mkv','webm'].includes(getFileExtension(selectedFile.filename)) ? (
                       <video 
                         draggable={false}
                         src={getDownloadUrl(selectedFile.id, token)} 
                         className="w-full h-full object-contain transition-transform duration-300 select-none"
                         style={{ transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewZoom}) rotate(${previewRotation}deg)` }}
                         controls={false}
                         autoPlay
                         muted
                         loop
                       />
                     ) : ['mp3','wav','flac','aac','m4a','ogg'].includes(getFileExtension(selectedFile.filename)) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 transition-transform duration-300" style={{ transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewZoom})` }}>
                             <div className="w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-8 border border-white/10 animate-[pulse_3s_ease-in-out_infinite]">
                                <FileAudio size={48} className="text-white/80" strokeWidth={1.5} />
                             </div>
                             <audio 
                                src={getDownloadUrl(selectedFile.id, token)} 
                                controls
                                className="w-full max-w-sm"
                             />
                        </div>
                     ) : (
                        <div className="opacity-80 transition-transform duration-300" style={{ transform: `scale(${previewZoom})` }}>
                           {React.createElement(getFileIcon(selectedFile.filename), { size: 100, className: "text-slate-400 font-thin" })}
                        </div>
                     )}
                   </div>
                   
                   {/* Zoom Controls (Top Left) */}
                   <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-black/20 backdrop-blur-sm p-1.5 rounded-xl border border-white/5 opacity-0 group-hover/upload:opacity-100 transition-opacity duration-300">
                      <button onClick={() => setPreviewZoom(p => Math.min(p + 0.5, 5))} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
                        <ZoomIn size={16} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => setPreviewZoom(p => Math.max(p - 0.5, 0.5))} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
                        <ZoomOut size={16} strokeWidth={1.5} />
                      </button>
                       <button onClick={handleResetPreview} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors border-t border-white/10 mt-1 pt-2">
                        <RotateCcw size={14} strokeWidth={1.5} />
                      </button>
                      <button onClick={handleRotatePreview} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors border-t border-white/10 mt-1 pt-2">
                        <RotateCw size={14} strokeWidth={1.5} />
                      </button>
                   </div>
                   
                   {/* Info/Title Overlay (Bottom) - Floating Glass */}
                   <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col items-center gap-3 pointer-events-none"> 
                      <div className="bg-black/30 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-lg max-w-full">
                          <p className="text-white font-light text-sm tracking-wide truncate">
                            {selectedFile.filename}
                          </p>
                      </div>
                      
                      {/* Metadata Row */}
                      <div className="flex items-center justify-center gap-2.5 opacity-0 group-hover/upload:opacity-100 transition-all duration-500 transform translate-y-4 group-hover/upload:translate-y-0">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-white/70 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/5">
                             {getFileExtension(selectedFile.filename)}
                          </span>
                          <span className="text-[10px] font-medium text-white/70 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/5">
                             {formatSize(selectedFile.size)}
                          </span>
                          <span className="text-[10px] font-medium text-white/70 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/5">
                             {new Date(selectedFile.upload_time * 1000).toLocaleDateString()}
                          </span>
                      </div>
                   </div>
               </>
             ) : (
                <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-80 group-hover/upload:opacity-40 transition-opacity">
                    <div className="p-8 bg-white/5 rounded-full border border-white/5 shadow-2xl blur-[1px] group-hover/upload:blur-none transition-all">
                        <Upload size={48} strokeWidth={0.8} className="text-white/20" />
                    </div>
                </div>
             )}

             {/* Action Buttons */}
             {selectedFile ? (
                 <label className="absolute top-4 right-4 z-20 cursor-pointer group/btn">
                    <input 
                       type="file" 
                       multiple 
                       className="hidden" 
                       onChange={(e) => e.target.files && handleFileUpload(e.target.files)} 
                    />
                    <div className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-xl border border-white/10 shadow-lg transition-all hover:scale-105 active:scale-95">
                       <FolderOpen size={18} strokeWidth={1.5} />
                    </div>
                 </label>
             ) : (
                 <div className="relative z-10 flex flex-col items-center justify-center">
                    <h2 className="text-3xl font-thin text-white mb-2 tracking-wider">Add Content</h2>
                    <p className="text-slate-400 font-light text-sm mb-8 tracking-wide opacity-70 max-w-[240px]">
                       Drag and drop your files here to keep them safe.
                    </p>
                    
                    <label className="cursor-pointer group/btn">
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)} 
                      />
                      <div className="px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white font-light rounded-2xl border border-white/10 shadow-xl backdrop-blur-md transition-all flex items-center gap-3 group-hover/btn:scale-105 active:scale-95">
                        {isUploading ? <RefreshCw className="animate-spin" strokeWidth={1} size={16} /> : <FolderOpen size={16} strokeWidth={1} />}
                        <span className="tracking-wide text-sm">Select Files</span>
                      </div>
                    </label>
                 </div>
             )}
          </div>
          
           {/* Stored Files Stats */}
           <div className="flex flex-col items-center justify-center p-6 glass rounded-3xl shadow-lg">
              <h2 className="text-xl font-light text-white mb-4 text-center tracking-wider">{t('storedFiles')}</h2>
              <div className="flex flex-row gap-3 w-full justify-center">
                  <span className="text-sm font-light text-slate-300 bg-black/20 rounded-xl py-2 px-4 border border-white/5 min-w-[80px] text-center">{processedFiles.length} {t('items')}</span>
                  <span className="text-sm font-medium text-emerald-400 bg-black/20 rounded-xl py-2 px-4 flex items-center justify-center gap-2 border border-white/5 min-w-[100px]">
                     <PieChart size={14} /> {formatSize(totalStorage)}
                  </span>
              </div>
           </div>
        </section>

        {/* Right Panel: File List - Col Span 8 */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Controls Bar (Glass) */}
          <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-3 items-center justify-between sticky top-24 z-30 transition-all duration-300">
             
             <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Filters */}
                 {(uniqueGroups.length > 0 || uniqueTags.length > 0) && (
                     <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                        {uniqueGroups.length > 0 && (
                            <div className="relative group/filter-group">
                                <button className={`p-2 rounded-lg transition-all ${selectedGroup !== 'all' ? 'text-ocean-400 bg-white/10' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <Layers size={18} strokeWidth={1.5} />
                                </button>
                                <div className="absolute top-full left-0 pt-2 w-48 hidden group-hover/filter-group:block z-50">
                                    <div className="glass-heavy border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                                        <button onClick={() => setSelectedGroup('all')} className={`w-full text-left px-3 py-2 text-xs rounded-lg ${selectedGroup === 'all' ? 'text-white bg-white/10' : 'text-slate-400 hover:bg-white/5'}`}>All Groups</button>
                                        {uniqueGroups.map(g => (
                                            <button key={g} onClick={() => setSelectedGroup(g)} className={`w-full text-left px-3 py-2 text-xs rounded-lg ${selectedGroup === g ? 'text-white bg-white/10' : 'text-slate-400 hover:bg-white/5'}`}>{g}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {uniqueTags.length > 0 && (
                            <div className="relative group/filter-tag">
                                <button className={`p-2 rounded-lg transition-all ${selectedTag !== 'all' ? 'text-ocean-400 bg-white/10' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <Tag size={18} strokeWidth={1.5} />
                                </button>
                                <div className="absolute top-full left-0 pt-2 w-48 hidden group-hover/filter-tag:block z-50">
                                    <div className="glass-heavy border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                                        <button onClick={() => setSelectedTag('all')} className={`w-full text-left px-3 py-2 text-xs rounded-lg ${selectedTag === 'all' ? 'text-white bg-white/10' : 'text-slate-400 hover:bg-white/5'}`}>All Tags</button>
                                        {uniqueTags.map(t => (
                                            <button key={t} onClick={() => setSelectedTag(t)} className={`w-full text-left px-3 py-2 text-xs rounded-lg ${selectedTag === t ? 'text-white bg-white/10' : 'text-slate-400 hover:bg-white/5'}`}>{t}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                     </div>
                 )}

                 <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-ocean-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Layers size={18} strokeWidth={1.5} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-ocean-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <List size={18} strokeWidth={1.5} />
                    </button>
                 </div>
             </div>

             <div className="relative group/sort flex-1 sm:flex-none">
                <button className="w-full sm:w-auto flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-slate-300 hover:text-white transition-all text-xs font-medium">
                    <span className="text-slate-500">Sort by:</span>
                    <span className="capitalize">{sortBy.replace('_', ' ')}</span>
                    <ArrowUpDown size={14} strokeWidth={1.5} />
                </button>
                {/* Sort Dropdown */}
                <div className="absolute top-full right-0 pt-2 w-48 hidden group-hover/sort:block z-50">
                    <div className="glass-heavy border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                        {['date_desc', 'date_asc', 'name_asc', 'name_desc', 'size_desc', 'size_asc', 'type_asc', 'type_desc'].map(opt => (
                            <button 
                                key={opt}
                                onClick={() => setSortBy(opt as any)}
                                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${sortBy === opt ? 'text-ocean-400 bg-white/10' : 'text-slate-400 hover:bg-white/5'}`}
                            >
                                {opt.replace('_', ' ').replace('desc', '↓').replace('asc', '↑').replace('type', 'Type')}
                            </button>
                        ))}
                    </div>
                </div>
             </div>
          </div>

          <div className="glass rounded-3xl border border-white/10 shadow-xl flex flex-col min-h-[600px] h-[calc(100vh-16rem)] transition-all duration-300">
            <div 
                className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-1"
                onWheel={handleContainerWheel}
            >
              {currentFiles.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 opacity-60">
                  <FileText size={48} className="mb-4 text-slate-700" />
                  <p className="text-sm">{t('noFiles')}</p>
                </div>
              ) : (
                <div className="flex flex-col flex-1">
                  {viewMode === 'list' ? (
                       /* LIST VIEW */
                       currentFiles.map((file) => {
                        const ext = getFileExtension(file.filename);
                        const colorClasses = getFileTypeColor(file.filename);
                        const IconComp = getFileIcon(file.filename);
                        
                        return (
                          <div 
                            key={file.id}
                            onClick={() => setSelectedFile(file)}
                            className={`group flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 cursor-pointer ${file.is_pinned ? 'bg-amber-500/5' : ''} ${selectedFile?.id === file.id ? 'bg-ocean-500/10 hover:bg-ocean-500/20' : ''}`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={`p-2 rounded-xl transition-colors ${file.is_pinned ? 'bg-amber-500/20 text-amber-400' : colorClasses.bg + ' ' + colorClasses.text}`}>
                                {file.is_pinned ? <Pin size={18} className="rotate-45" /> : <IconComp size={18} />}
                              </div>
                              <div className="min-w-0 flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <h4 className={`text-sm truncate transition-colors max-w-[200px] sm:max-w-[300px] ${file.is_pinned ? 'text-amber-100 font-medium' : 'text-slate-200 group-hover:text-white'}`}>{file.filename}</h4>
                                  {file.group_name && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                      {file.group_name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                  <span>{formatSize(file.size)}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                  <span>{formatDate(file.upload_time)}</span>
                                  {file.tags && (
                                      <>
                                       <span className="w-1 h-1 rounded-full bg-slate-700 hidden sm:block"></span>
                                       <span className="truncate max-w-[150px] hidden sm:block">{file.tags}</span>
                                      </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Menu */}
                            <div className="relative action-menu" style={{ zIndex: activeMenuId === file.id ? 20 : 'auto' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === file.id ? null : file.id); }}
                                className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all ${activeMenuId === file.id ? 'bg-white/10 text-white' : 'opacity-0 group-hover:opacity-100'}`}
                              >
                                <MoreVertical size={16} />
                              </button>

                              {activeMenuId === file.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 glass-heavy border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200 p-1">
                                      <button onClick={() => handlePin(file)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        {file.is_pinned ? <PinOff size={14} className="text-amber-500" /> : <Pin size={14} className="text-slate-400" />}
                                        {file.is_pinned ? (t('unpin') || 'Unpin') : (t('pin') || 'Pin')}
                                      </button>
                                      <button onClick={() => handleEditMeta(file)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        <Database size={14} className="text-pink-400" />
                                        {t('editInfo') || 'Edit Info'}
                                      </button>
                                      <button onClick={() => handleRename(file)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        <Edit2 size={14} className="text-orange-400" />
                                        {t('rename')}
                                      </button>
                                      <button onClick={() => handleCopy(file)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        {copiedId === file.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-blue-400" />}
                                        {copiedId === file.id ? 'Copied' : t('copyLink')}
                                      </button>
                                      <a href={getPreviewUrl(file.id, token)} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        <Eye size={14} className="text-indigo-400" />
                                        {t('preview')}
                                      </a>
                                      <a href={getDownloadUrl(file.id, token)} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        <Download size={14} className="text-emerald-400" />
                                        {t('download')}
                                      </a>
                                      <div className="h-px bg-white/10 my-1 mx-2"></div>
                                      <button onClick={() => handleDelete(file)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                        {t('delete')}
                                      </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                      /* GRID VIEW */
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 p-4">
                          {currentFiles.map((file) => (
                             <FileGridItem 
                               key={file.id}
                               file={file}
                               token={token}
                               activeMenuId={activeMenuId}
                               selectedFile={selectedFile}
                               copiedId={copiedId}
                               t={t}
                               setActiveMenuId={setActiveMenuId}
                               setSelectedFile={setSelectedFile}
                               handlePin={handlePin}
                               handleEditMeta={handleEditMeta}
                               handleRename={handleRename}
                               handleCopy={handleCopy}
                               handleDelete={handleDelete}
                             />
                          ))}
                      </div>
                  )}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
              <div className="px-4 py-3 border-t border-white/5 flex justify-center items-center gap-4 bg-white/5 backdrop-blur-sm rounded-b-3xl">
                 <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all"
                 >
                   <ChevronLeft size={16} />
                 </button>
                 
                 <div className="flex items-center gap-2">
                   <input 
                      type="number"
                      min="1"
                      max={Math.max(1, totalPages)}
                      value={currentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) setCurrentPage(val);
                      }}
                      className="w-10 bg-slate-900/50 border border-white/10 rounded-md text-center text-xs text-white focus:outline-none focus:border-ocean-500/50 p-1"
                   />
                   <span className="text-xs text-slate-400">/ {Math.max(1, totalPages)}</span>
                 </div>

                 <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all"
                 >
                   <ChevronRight size={16} />
                 </button>
              </div>
          </div>
        </section>
      </main>
      </div>

      {/* Edit Meta Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="glass-heavy border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                 <h3 className="text-lg font-medium text-white">{t('editInfo') || 'Edit Info'}</h3>
                 <button onClick={() => setEditingFile(null)} className="text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                 </button>
              </div>
              
              <div className="p-6 flex flex-col gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('fileName') || 'File Name'}</label>
                    <div className="text-sm text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5 truncate">
                       {editingFile.filename}
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('group') || 'Group'}</label>
                    <div className="relative">
                        <input 
                           type="text" 
                           value={editGroup}
                           onChange={(e) => setEditGroup(e.target.value)}
                           className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-ocean-500 transition-colors"
                           placeholder="Ex: Work, Personal, Project A..."
                        />
                        <Layers size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        {uniqueGroups.slice(0, 5).map(g => (
                            <button key={g} onClick={() => setEditGroup(g)} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition-colors">
                                {g}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('tags') || 'Tags'}</label>
                    <div className="bg-slate-800/50 border border-white/10 rounded-xl px-3 py-2 flex flex-wrap gap-2 focus-within:border-ocean-500 transition-colors min-h-[46px]">
                        {editTags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                            <span key={tag} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium animate-in zoom-in duration-200">
                                {tag}
                                <button 
                                    onClick={() => setEditTags(prev => prev.split(',').filter(t => t.trim() !== tag).join(', '))} 
                                    className="hover:text-white hover:bg-white/10 rounded-full p-0.5 transition-colors"
                                >
                                    <X size={12} strokeWidth={3} />
                                </button>
                            </span>
                        ))}
                        <input 
                           type="text" 
                           className="bg-transparent border-none text-sm text-white focus:ring-0 p-1 min-w-[80px] flex-1 focus:outline-none"
                           placeholder={editTags ? "" : "Add tag..."}
                           onKeyDown={(e) => {
                               if (e.key === 'Enter' || e.key === ',') {
                                   e.preventDefault();
                                   const val = e.currentTarget.value.trim();
                                   if (val) {
                                       const currentTags = editTags.split(',').map(t => t.trim()).filter(Boolean);
                                       if (!currentTags.includes(val)) {
                                            setEditTags(currentTags.length > 0 ? [...currentTags, val].join(', ') : val);
                                       }
                                       e.currentTarget.value = '';
                                   }
                               } else if (e.key === 'Backspace' && !e.currentTarget.value && editTags) {
                                   const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
                                   tags.pop();
                                   setEditTags(tags.join(', '));
                               }
                           }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-4">
                        <span>Press <kbd className="font-sans bg-white/10 px-1 rounded text-white/70">Enter</kbd> to add</span>
                        <span><kbd className="font-sans bg-white/10 px-1 rounded text-white/70">Backspace</kbd> to delete</span>
                    </p>
                 </div>
              </div>

              <div className="px-6 py-4 bg-white/5 border-t border-white/5 flex justify-end gap-3">
                 <button 
                  onClick={() => setEditingFile(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                 >
                    {t('cancel') || 'Cancel'}
                 </button>
                 <button 
                  onClick={handleSaveMeta}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-ocean-500 hover:bg-ocean-600 text-white shadow-lg shadow-ocean-500/20 transition-all active:scale-95 flex items-center gap-2"
                 >
                    <Check size={16} strokeWidth={3} />
                    {t('save') || 'Save'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
