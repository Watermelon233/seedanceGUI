import { SpinnerIcon, FilmIcon, DownloadIcon } from './Icons';
import { getApiConfig } from '../services/localStorageService';
import { downloadVideoFromProxy, extractTaskId } from '../services/videoDownloadService';

interface VideoPlayerProps {
  videoUrl: string | null;
  revisedPrompt?: string;
  isLoading: boolean;
  error?: string;
  progress?: string;
}

/**
 * 获取 API Key 用于视频代理认证
 */
function getApiKey(): string {
  const config = getApiConfig();
  return config.aihubmixKey || '';
}

/**
 * 将 aihubmix 视频 URL 转换为代理 URL
 * aihubmix 视频需要认证，通过本地代理添加 Authorization 头
 */
function proxyUrl(url: string): string {
  // aihubmix 的视频需要通过代理添加认证
  if (url.includes('aihubmix.com') && url.includes('/content')) {
    // 提取 taskId: https://aihubmix.com/v1/videos/{taskId}/content
    const match = url.match(/\/v1\/videos\/(.+)\/content/);
    if (match) {
      const taskId = match[1];
      const apiKey = getApiKey();
      console.log('[VideoPlayer] 提取 taskId:', taskId);
      console.log('[VideoPlayer] API Key 存在:', !!apiKey);
      console.log('[VideoPlayer] API Key 长度:', apiKey?.length || 0);
      // 通过代理服务器访问，API key 作为查询参数传递
      const proxied = `http://localhost:3002/api/v1/videos/${taskId}/content?key=${encodeURIComponent(apiKey)}`;
      console.log('[VideoPlayer] 代理 URL 长度:', proxied.length);
      return proxied;
    }
  }
  // 其他来源直接返回
  console.log('[VideoPlayer] 非 aihubmix URL，直接返回');
  return url;
}

export default function VideoPlayer({
  videoUrl,
  revisedPrompt,
  isLoading,
  error,
  progress,
}: VideoPlayerProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        <div className="relative">
          <SpinnerIcon className="w-12 h-12 text-purple-400" />
        </div>
        <div className="text-center">
          <p className="text-gray-300 text-sm">
            {progress || '正在生成视频...'}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            视频生成可能需要几分钟，请耐心等待
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <span className="text-2xl text-red-400">!</span>
        </div>
        <div className="text-center max-w-md">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-1">请检查设置后重试</p>
        </div>
      </div>
    );
  }

  if (videoUrl) {
    const proxied = proxyUrl(videoUrl);

    // 调试日志
    console.log('[VideoPlayer] 原始 URL:', videoUrl);
    console.log('[VideoPlayer] 代理 URL:', proxied);

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 md:p-8">
        <div className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl relative group">
          <video
            controls
            src={proxied}
            className="w-full max-h-[80vh] mx-auto"
            autoPlay
            loop
          />
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={async () => {
                const taskId = extractTaskId(videoUrl);
                if (!taskId) {
                  alert('无法获取视频ID，下载失败');
                  return;
                }

                try {
                  await downloadVideoFromProxy(taskId, {
                    filename: `seedance_video_${Date.now()}.mp4`,
                  });
                } catch (error) {
                  console.error('下载失败:', error);
                  alert(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
                }
              }}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              下载视频
            </button>
          </div>
        </div>
        {revisedPrompt && (
          <p className="text-gray-400 text-xs text-center max-w-lg">
            {revisedPrompt}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-50">
      <div className="w-24 h-24 rounded-full bg-[#1c1f2e] flex items-center justify-center border border-gray-800">
        <FilmIcon className="w-8 h-8 text-gray-600" />
      </div>
      <p className="text-gray-600">AI视频制作就绪</p>
      <p className="text-xs text-gray-700">支持文生视频和图生视频</p>
    </div>
  );
}
