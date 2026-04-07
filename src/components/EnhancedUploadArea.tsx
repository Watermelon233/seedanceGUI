/**
 * 增强上传区域组件
 * 支持本地文件、URL、云托管三种上传方式
 * 使用 XMLHttpRequest 支持上传进度
 */

import { useState, useRef, useCallback } from 'react';
import { uploadLocalFile } from '../services/tempFileHostingService';
import { ImageIcon, CloseIcon, CloudIcon } from './Icons';

type MediaType = 'image' | 'audio' | 'video';

export interface MediaFile {
  id: string;
  url: string;
  type: MediaType;
  name?: string;
  size?: number;
}

interface EnhancedUploadAreaProps {
  mediaFiles: MediaFile[];
  onMediaFilesChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: ('image' | 'audio' | 'video')[];
}

export default function EnhancedUploadArea({
  mediaFiles,
  onMediaFilesChange,
  maxFiles = 9,
  acceptedTypes = ['image', 'audio', 'video'],
}: EnhancedUploadAreaProps) {
  const [uploadMode, setUploadMode] = useState<'local' | 'url' | 'hosted'>('local');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAdd = mediaFiles.length < maxFiles;

  // 取消上传
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploading(false);
    setUploadProgress(0);
  }, []);

  // 添加媒体文件
  const addMediaFile = useCallback((file: MediaFile) => {
    onMediaFilesChange([...mediaFiles, file]);
  }, [mediaFiles, onMediaFilesChange]);

  // 移除媒体文件
  const removeMediaFile = useCallback((id: string) => {
    onMediaFilesChange(mediaFiles.filter(f => f.id !== id));
  }, [mediaFiles, onMediaFilesChange]);

  // 检测文件类型
  const detectMediaType = (file: File): MediaType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'image'; // 默认
  };

  // 本地文件上传
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles: MediaFile[] = files.slice(0, maxFiles - mediaFiles.length).map(file => ({
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: URL.createObjectURL(file),
      type: detectMediaType(file),
      name: file.name,
      size: file.size,
    }));

    onMediaFilesChange([...mediaFiles, ...newFiles]);

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [mediaFiles, maxFiles, onMediaFilesChange]);

  // URL 添加
  const handleUrlAdd = useCallback(() => {
    if (!urlInput.trim()) return;

    const url = urlInput.trim();
    let type: MediaType = 'image';

    // 简单的类型检测
    if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i)) {
      type = 'image';
    } else if (url.match(/\.(mp3|wav|aac|ogg|m4a|flac)(\?.*)?$/i)) {
      type = 'audio';
    } else if (url.match(/\.(mp4|mov|avi|mkv|webm|flv)(\?.*)?$/i)) {
      type = 'video';
    }

    addMediaFile({
      id: `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      type,
      name: url.split('/').pop() || 'remote_file',
    });

    setUrlInput('');
  }, [urlInput, addMediaFile]);

  // 云托管上传
  const uploadToHosted = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('云托管仅支持图片文件');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await uploadLocalFile(file, {
        onProgress: (percent) => setUploadProgress(percent),
        signal: controller.signal,
      });

      addMediaFile({
        id: `hosted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: result.url,
        type: 'image' as MediaType,
        name: result.filename || file.name,
        size: result.size,
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('上传失败:', error);
        alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  };

  // 渲染媒体预览
  const renderMediaPreview = (file: MediaFile) => {
    if (file.type === 'image') {
      return (
        <div className="relative aspect-square rounded-lg overflow-hidden bg-[#1a1d2d]">
          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
          <button
            onClick={() => removeMediaFile(file.id)}
            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        </div>
      );
    } else if (file.type === 'audio') {
      return (
        <div className="relative aspect-square rounded-lg overflow-hidden bg-[#1a1d2d] flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-1">🎵</div>
            <div className="text-xs text-gray-500 truncate max-w-[80px]">{file.name}</div>
          </div>
          <button
            onClick={() => removeMediaFile(file.id)}
            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        </div>
      );
    } else if (file.type === 'video') {
      return (
        <div className="relative aspect-square rounded-lg overflow-hidden bg-[#1a1d2d]">
          <video src={file.url} className="w-full h-full object-cover" />
          <button
            onClick={() => removeMediaFile(file.id)}
            className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <CloseIcon className="w-3 h-3" />
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {/* 上传进度 */}
      {uploading && (
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">上传中...</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-purple-400">{uploadProgress}%</span>
              <button
                onClick={cancelUpload}
                className="text-xs text-red-400 hover:text-red-300"
              >
                取消
              </button>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 上传模式切换 */}
      <div className="flex gap-2">
        <button
          onClick={() => setUploadMode('local')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            uploadMode === 'local'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          本地文件
        </button>
        <button
          onClick={() => setUploadMode('url')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            uploadMode === 'url'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          URL链接
        </button>
        <button
          onClick={() => setUploadMode('hosted')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            uploadMode === 'hosted'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          云托管
        </button>
      </div>

      {/* 上传区域 */}
      {uploadMode === 'local' && (
        <div
          onClick={() => canAdd && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            canAdd
              ? 'border-gray-700 hover:border-purple-500 bg-[#1a1d2d] hover:bg-[#252a3d]'
              : 'border-gray-800 bg-gray-900/50 cursor-not-allowed'
          }`}
        >
          <ImageIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            {canAdd ? '点击或拖拽文件到此处' : `已达到最大文件数 (${maxFiles})`}
          </p>
          <p className="text-gray-600 text-xs mt-1">
            支持 JPG, PNG, GIF, MP3, WAV, MP4 等格式
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={acceptedTypes.map(t => {
              if (t === 'image') return 'image/*';
              if (t === 'audio') return 'audio/*';
              if (t === 'video') return 'video/*';
              return '*/*';
            }).join(',')}
            multiple
            onChange={handleFileSelect}
          />
        </div>
      )}

      {uploadMode === 'url' && (
        <div className="bg-[#1a1d2d] rounded-lg p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="输入图片/音频/视频 URL"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              onKeyPress={(e) => e.key === 'Enter' && handleUrlAdd()}
            />
            <button
              onClick={handleUrlAdd}
              disabled={!urlInput.trim() || !canAdd}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {uploadMode === 'hosted' && (
        <div
          onClick={() => canAdd && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            canAdd
              ? 'border-gray-700 hover:border-purple-500 bg-[#1a1d2d] hover:bg-[#252a3d]'
              : 'border-gray-800 bg-gray-900/50 cursor-not-allowed'
          }`}
        >
          <CloudIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            {canAdd ? '点击上传图片到云托管' : `已达到最大文件数 (${maxFiles})`}
          </p>
          <p className="text-gray-600 text-xs mt-1">
            图片将上传到 tempfile.org，支持上传进度显示
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadToHosted(file);
              }
            }}
          />
        </div>
      )}

      {/* 媒体预览网格 */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {mediaFiles.map(file => (
            <div key={file.id} className="aspect-square">
              {renderMediaPreview(file)}
            </div>
          ))}
        </div>
      )}

      {/* 文件计数 */}
      <div className="text-xs text-gray-500 text-right">
        {mediaFiles.length} / {maxFiles}
      </div>
    </div>
  );
}
