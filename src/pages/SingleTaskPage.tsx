import { useState, useCallback, useRef } from 'react';
import type {
  AspectRatio,
  Duration,
  ModelId,
  MediaFile,
  GenerationState,
} from '../types/index';
import {
  RATIO_OPTIONS,
  DURATION_OPTIONS,
  MODEL_OPTIONS,
  VideoGenerationMode,
  MODE_OPTIONS,
  getModeConfig,
  validateImageCount,
  getImageRole,
  MediaType,
  detectMediaType,
  getMediaRole
} from '../types/index';
import { generateVideo } from '../services/videoService';
import VideoPlayer from '../components/VideoPlayer';
import { GearIcon, PlusIcon, CloseIcon, SparkleIcon } from '../components/Icons';
import { useNavigate } from 'react-router-dom';
import { MockDevTools } from '../components/MockDevTools';

let nextId = 0;

export default function SingleTaskPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<ModelId>('seedance-2.0-fast');
  const [ratio, setRatio] = useState<AspectRatio>('16:9');
  const [duration, setDuration] = useState<Duration>(5);
  const [selectedMode, setSelectedMode] = useState<VideoGenerationMode>(
    VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME
  );
  const [generation, setGeneration] = useState<GenerationState>({
    status: 'idle',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Mock 模式检测
  const mockEnv = import.meta.env.VITE_MOCK_API;
  const isMockMode = mockEnv === 'true' || mockEnv === true;
  // 调试日志
  console.log('[SingleTaskPage] VITE_MOCK_API:', mockEnv, 'isMockMode:', isMockMode);

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;

      const config = getModeConfig(selectedMode);
      const remaining = config.maxImages - mediaFiles.length;
      if (remaining <= 0) {
        alert(`⚠️ 当前模式最多支持${config.maxImages}个媒体文件`);
        return;
      }

      const newFiles = Array.from(fileList).slice(0, remaining);
      const newMediaFiles: MediaFile[] = newFiles.map((file, i) => {
        const mediaType = detectMediaType(file);
        return {
          id: `media-${++nextId}`,
          file,
          type: mediaType,
          previewUrl: URL.createObjectURL(file),
          index: mediaFiles.length + i + 1,
        };
      });

      setMediaFiles([...mediaFiles, ...newMediaFiles]);
    },
    [mediaFiles, selectedMode]
  );

  const removeMedia = useCallback(
    (id: string) => {
      const removed = mediaFiles.find((media) => media.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);

      const updated = mediaFiles
        .filter((media) => media.id !== id)
        .map((media, i) => ({ ...media, index: i + 1 }));
      setMediaFiles(updated);
    },
    [mediaFiles]
  );

  const clearAllMedia = useCallback(() => {
    mediaFiles.forEach((media) => URL.revokeObjectURL(media.previewUrl));
    setMediaFiles([]);
  }, [mediaFiles]);

  const handleGenerate = useCallback(async () => {
    // 验证参数
    const config = getModeConfig(selectedMode);
    const mediaValidation = validateImageCount(selectedMode, mediaFiles.length);

    if (!prompt.trim() && mediaFiles.length === 0) {
      alert('❌ 请输入提示词或上传媒体文件');
      return;
    }

    if (!mediaValidation.valid) {
      alert(`❌ ${mediaValidation.error}`);
      return;
    }

    if (generation.status === 'generating') return;

    setGeneration({
      status: 'generating',
      progress: '正在提交视频生成请求...',
    });

    try {
      // 处理@图转换
      let processedPrompt = prompt.trim();
      if (selectedMode === VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE && mediaFiles.length > 0) {
        processedPrompt = processedPrompt.replace(/@图(\d+)/g, '[图$1]');
      }

      const result = await generateVideo(
        {
          prompt: processedPrompt,
          model,
          ratio,
          duration,
          files: mediaFiles.map((media) => media.file),
        },
        (progress) => {
          setGeneration((prev) => ({ ...prev, progress }));
        }
      );

      if (result.data && result.data.length > 0 && result.data[0].url) {
        setGeneration({ status: 'success', result });
      } else {
        setGeneration({
          status: 'error',
          error: '未获取到视频结果，请重试',
        });
      }
    } catch (error) {
      setGeneration({
        status: 'error',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  }, [prompt, mediaFiles, model, ratio, duration, generation.status, selectedMode]);

  const handleReset = () => {
    setPrompt('');
    clearAllMedia();
    setGeneration({ status: 'idle' });
  };

  const videoUrl =
    generation.status === 'success' && generation.result?.data?.[0]?.url
      ? generation.result.data[0].url
      : null;

  const revisedPrompt =
    generation.status === 'success'
      ? generation.result?.data?.[0]?.revised_prompt
      : undefined;

  const isGenerating = generation.status === 'generating';
  const canGenerate = (prompt.trim() || mediaFiles.length > 0) && !isGenerating;

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-[#0f111a] text-white">
      {/* Mock 模式提示横幅 */}
      {isMockMode && (
        <div className="fixed top-0 left-0 right-0 z-[2000] bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-lg">
          <span>🧪</span>
          <span>测试模式 - 当前使用 Mock API，不会调用真实接口</span>
        </div>
      )}

      {/* Mock DevTools */}
      <MockDevTools />

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-40 bg-[#0f111a]/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <h1 className="text-lg font-bold">{MODEL_OPTIONS.find(m => m.value === model)?.label || 'Seedance 2.0'}</h1>
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <GearIcon className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Left Panel — Configuration */}
      <div className="flex-1 md:w-[520px] md:flex-none md:border-r border-gray-800 overflow-y-auto custom-scrollbar p-4 md:p-6 bg-[#0f111a]">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">{MODEL_OPTIONS.find(m => m.value === model)?.label || 'Seedance 2.0'} 视频配置</h2>
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            title="设置"
          >
            <GearIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Reference Images - 智能图片上传区域 */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-gray-300">
                参考媒体（图片/音频/视频）
              </label>
              {mediaFiles.length > 0 && (
                <button
                  onClick={clearAllMedia}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  清除全部
                </button>
              )}
            </div>

            {/* Thumbnails with Role标记 */}
            {mediaFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {mediaFiles.map((media) => {
                  const config = getModeConfig(selectedMode);
                  const role = config.useRole ? getMediaRole(media.type, selectedMode) : null;

                  return (
                    <div
                      key={media.id}
                      className="relative group w-20 h-20 flex-shrink-0"
                    >
                      {/* 根据媒体类型显示不同的预览 */}
                      {media.type === MediaType.IMAGE ? (
                        <img
                          src={media.previewUrl}
                          alt={`媒体文件 ${media.index}`}
                          className="w-full h-full object-cover rounded-xl border border-gray-700"
                        />
                      ) : media.type === MediaType.AUDIO ? (
                        <div className="w-full h-full bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl border border-gray-700 flex items-center justify-center">
                          <span className="text-2xl">🎵</span>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl border border-gray-700 flex items-center justify-center">
                          <span className="text-2xl">🎬</span>
                        </div>
                      )}

                      {/* 序号标记 */}
                      <span className="absolute top-0 left-0 bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-tl-xl rounded-br-xl font-bold">
                        {media.type === MediaType.IMAGE ? `图${media.index}` :
                         media.type === MediaType.AUDIO ? `音${media.index}` :
                         `视${media.index}`}
                      </span>

                      {/* Role标记 */}
                      {role && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/80 text-[9px] text-center py-0.5 rounded-b-xl font-medium truncate">
                          {role === 'reference_image' ? `🎨 图${media.index}` :
                           role === 'reference_audio' ? `🎵 音${media.index}` :
                           role === 'reference_video' ? `🎬 视${media.index}` :
                           role}
                        </span>
                      )}

                      <button
                        onClick={() => removeMedia(media.id)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 hover:border-red-600"
                      >
                        <CloseIcon className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload zone - 智能提示 */}
            {getModeConfig(selectedMode).maxImages > 0 ? (
              <>
                {mediaFiles.length < getModeConfig(selectedMode).maxImages && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      addFiles(e.dataTransfer.files);
                    }}
                    className={`w-full ${
                      mediaFiles.length === 0 ? 'h-40 md:h-52' : 'h-24'
                    } border border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center bg-[#1c1f2e] cursor-pointer hover:border-purple-500/50 hover:bg-[#25293d] transition-all`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                        <PlusIcon className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-gray-500">
                        {mediaFiles.length === 0
                          ? `点击或拖拽上传媒体文件（${getModeConfig(selectedMode).minImages}-${getModeConfig(selectedMode).maxImages}个）`
                          : `继续添加（${mediaFiles.length}/${getModeConfig(selectedMode).maxImages}）`}
                      </span>
                    </div>
                  </div>
                )}
                {/* 模式提示 */}
                {selectedMode === VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE && (
                  <div className="mt-2 text-xs text-purple-400">
                    💡 提示：使用 @图1 @图2 引用图片，系统会自动转换为 [图1] [图2]
                  </div>
                )}
              </>
            ) : (
              /* 文生视频模式 - 禁用上传 */
              <div className="w-full h-24 border border-dashed border-gray-700 rounded-2xl flex flex-col items-center justify-center bg-[#1c1f2e] opacity-60">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-sm text-gray-500">✨ 文生视频模式</span>
                  <span className="text-xs text-gray-600">纯文本生成，无需上传图片</span>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </div>

          {/* Prompt - 动态占位符 */}
          <div className="bg-[#1c1f2e] rounded-2xl p-4 border border-gray-800">
            <label className="block text-sm font-bold mb-3 text-gray-300">
              提示词
            </label>
            <textarea
              className="w-full bg-transparent text-sm resize-none focus:outline-none min-h-[100px] placeholder-gray-600 text-gray-200 leading-relaxed"
              placeholder={
                selectedMode === VideoGenerationMode.TEXT_TO_VIDEO
                  ? '描述你想要生成的视频场景，例如：写实风格，晴朗的蓝天之下...'
                  : selectedMode === VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME
                  ? '描述视频动作，例如：女孩抱着狐狸，女孩睁开眼...'
                  : selectedMode === VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST
                  ? '描述运镜方式，例如：360度环绕运镜'
                  : '描述场景，使用 @图1 @图2 引用图片，例如：@图1戴着眼镜的男生和@图2的柯基...'
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={5000}
              disabled={isGenerating}
            />
            <div className="text-right text-xs text-gray-500 mt-2">
              {prompt.length}/5000
            </div>
          </div>

          {/* Settings */}
          <div className="bg-[#1c1f2e] rounded-2xl p-4 border border-gray-800 space-y-5">
            {/* Model Selection */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                选择模型
              </label>
              <div className="flex flex-col gap-2">
                {MODEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setModel(opt.value)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                      model === opt.value
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-[#161824] hover:border-gray-600'
                    }`}
                  >
                    <div className={`text-sm font-medium ${
                      model === opt.value ? 'text-purple-400' : 'text-gray-300'
                    }`}>
                      {opt.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Video Generation Mode - 卡片式选择 */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                视频生成模式
              </label>
              <div className="grid grid-cols-2 gap-3">
                {MODE_OPTIONS.map((option) => {
                  const config = getModeConfig(option.value);
                  const isSelected = selectedMode === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedMode(option.value);
                        // 自动调整ratio为默认值
                        setRatio(config.defaultRatio);
                        // 智能处理媒体：文生视频清空，其他模式保留
                        if (config.maxImages === 0 && mediaFiles.length > 0) {
                          if (confirm('切换到文生视频模式将清空所有媒体文件，确认吗？')) {
                            clearAllMedia();
                          } else {
                            return; // 取消切换
                          }
                        }
                      }}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-900/20'
                          : 'border-gray-700 bg-[#161824] hover:border-gray-600'
                      }`}
                    >
                      {/* 图标和标题 */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{option.icon}</span>
                        <div className={`text-sm font-bold ${
                          isSelected ? 'text-purple-400' : 'text-gray-300'
                        }`}>
                          {option.label}
                        </div>
                      </div>

                      {/* 描述 */}
                      <div className="text-xs text-gray-500 mb-2 leading-relaxed">
                        {option.description}
                      </div>

                      {/* 媒体要求 */}
                      <div className={`text-xs ${
                        isSelected ? 'text-purple-300' : 'text-gray-600'
                      }`}>
                        {config.maxImages === 0 ? '📝 无需媒体' : `🖼️ ${config.minImages}-${config.maxImages} 个媒体`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                画面比例
              </label>
              <div className="grid grid-cols-6 gap-2">
                {RATIO_OPTIONS.map((opt) => {
                  const isSelected = opt.value === ratio;
                  const maxDim = 24;
                  const scale =
                    maxDim / Math.max(opt.widthRatio, opt.heightRatio);
                  const w = Math.round(opt.widthRatio * scale);
                  const h = Math.round(opt.heightRatio * scale);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setRatio(opt.value)}
                      className={`flex flex-col items-center gap-1.5 py-2 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-[#161824] hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-center w-8 h-8">
                        <div
                          className={`rounded-sm border ${
                            isSelected
                              ? 'border-purple-400'
                              : 'border-gray-500'
                          }`}
                          style={{ width: `${w}px`, height: `${h}px` }}
                        />
                      </div>
                      <span
                        className={`text-[11px] ${
                          isSelected ? 'text-purple-400' : 'text-gray-400'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                视频时长
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      duration === d
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-gray-700 bg-[#161824] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {d}秒
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate Section */}
          <div className="pb-6 md:pb-4">
            {/* Progress */}
            {isGenerating && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{generation.progress || '处理中...'}</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full animate-progress" />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    生成中...
                  </>
                ) : (
                  <>
                    <SparkleIcon className="w-4 h-4" />
                    生成视频
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                disabled={isGenerating}
                className="px-6 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold py-3.5 rounded-xl transition-all"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Result */}
      <div className="flex-1 bg-[#090a0f] overflow-y-auto flex flex-col">
        <VideoPlayer
          videoUrl={videoUrl}
          revisedPrompt={revisedPrompt}
          isLoading={isGenerating}
          error={generation.status === 'error' ? generation.error : undefined}
          progress={generation.progress}
        />
      </div>
    </div>
  );
}
