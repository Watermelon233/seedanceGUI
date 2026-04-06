/**
 * 纯前端版本类型定义
 * 移除用户系统、批量管理、下载管理等复杂功能
 * 保留核心视频生成功能
 */

// ============================================================
// 基础类型
// ============================================================

export type AspectRatio = 'adaptive' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
export type Duration = 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export type ModelId = 'seedance-2.0' | 'seedance-2.0-fast' | 'seedance-2.0-fast-vip' | 'seedance-2.0-vip';
/** @deprecated 使用 VideoGenerationMode 代替 */
export type ReferenceMode = '全能参考' | '首帧参考' | '尾帧参考';

// ============================================================
// 媒体类型（支持图片、音频、视频）
// ============================================================

/**
 * 媒体类型枚举
 */
export enum MediaType {
  IMAGE = 'image_url',
  AUDIO = 'audio_url',
  VIDEO = 'video_url'
}

/**
 * 上传的媒体文件
 */
export interface MediaFile {
  id: string;
  file: File;
  type: MediaType;
  previewUrl: string;
  index: number;
}

/**
 * 根据文件类型检测MediaType
 */
export function detectMediaType(file: File): MediaType {
  const type = file.type.toLowerCase();

  if (type.startsWith('image/')) {
    return MediaType.IMAGE;
  } else if (type.startsWith('audio/')) {
    return MediaType.AUDIO;
  } else if (type.startsWith('video/')) {
    return MediaType.VIDEO;
  }

  // 根据文件扩展名判断
  const ext = file.name.toLowerCase().split('.').pop();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
  const audioExts = ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac'];
  const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'];

  if (ext && imageExts.includes(ext)) return MediaType.IMAGE;
  if (ext && audioExts.includes(ext)) return MediaType.AUDIO;
  if (ext && videoExts.includes(ext)) return MediaType.VIDEO;

  // 默认为图片
  return MediaType.IMAGE;
}

/**
 * 获取媒体文件的Role
 */
export function getMediaRole(type: MediaType, mode: VideoGenerationMode): string | undefined {
  // 只有参考图模式支持音频和视频
  if (mode !== VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE) {
    return undefined;
  }

  switch (type) {
    case MediaType.IMAGE:
      return 'reference_image';
    case MediaType.AUDIO:
      return 'reference_audio';
    case MediaType.VIDEO:
      return 'reference_video';
    default:
      return undefined;
  }
}

// ============================================================
// 视频生成模式相关类型（新4种模式）
// ============================================================

/**
 * 视频生成模式枚举
 * 对应官方API的4种视频生成模式
 */
export enum VideoGenerationMode {
  TEXT_TO_VIDEO = 'text_to_video',                        // 文生视频
  IMAGE_TO_VIDEO_FIRST_FRAME = 'image_to_video_first_frame',  // 图生视频-首帧
  IMAGE_TO_VIDEO_FIRST_LAST = 'image_to_video_first_last',    // 图生视频-首尾帧
  IMAGE_TO_VIDEO_REFERENCE = 'image_to_video_reference'       // 图生视频-参考图
}

/**
 * 模式配置接口
 */
export interface ModeConfig {
  minImages: number;              // 最少图片数
  maxImages: number;              // 最多图片数
  defaultRatio: AspectRatio;      // 默认比例
  useRole: boolean;               // 是否使用role字段
  roleType?: 'first_last' | 'reference'; // role类型
}

/**
 * 模式选项（UI显示）
 */
export interface ModeOption {
  value: VideoGenerationMode;
  label: string;
  description: string;
  icon?: string;
}

/**
 * 4种模式的配置规则
 */
export const MODE_CONFIG: Record<VideoGenerationMode, ModeConfig> = {
  [VideoGenerationMode.TEXT_TO_VIDEO]: {
    minImages: 0,
    maxImages: 0,
    defaultRatio: '16:9',
    useRole: false
  },
  [VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME]: {
    minImages: 1,
    maxImages: 1,
    defaultRatio: 'adaptive',
    useRole: false  // ⚠️ 关键：不设置role
  },
  [VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST]: {
    minImages: 2,
    maxImages: 2,
    defaultRatio: 'adaptive',
    useRole: true,
    roleType: 'first_last'
  },
  [VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE]: {
    minImages: 1,
    maxImages: 9,
    defaultRatio: '16:9',
    useRole: true,
    roleType: 'reference'
  }
};

/**
 * UI显示的模式选项
 */
export const MODE_OPTIONS: ModeOption[] = [
  {
    value: VideoGenerationMode.TEXT_TO_VIDEO,
    label: '文生视频',
    description: '纯文本生成视频，无需上传图片',
    icon: '📝'
  },
  {
    value: VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME,
    label: '图生视频-首帧',
    description: '上传1张图片作为首帧参考',
    icon: '🖼️'
  },
  {
    value: VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST,
    label: '图生视频-首尾帧',
    description: '上传2张图片控制首尾帧',
    icon: '🎬'
  },
  {
    value: VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE,
    label: '图生视频-参考图',
    description: '上传1-9张图片作为风格参考',
    icon: '🎨'
  }
];

/**
 * 获取模式配置
 */
export function getModeConfig(mode: VideoGenerationMode): ModeConfig {
  return MODE_CONFIG[mode];
}

/**
 * 验证图片数量
 */
export function validateImageCount(mode: VideoGenerationMode, count: number): {
  valid: boolean;
  error?: string;
} {
  const config = getModeConfig(mode);

  if (count < config.minImages) {
    return {
      valid: false,
      error: `${MODE_OPTIONS.find(m => m.value === mode)?.label}模式至少需要${config.minImages}张图片`
    };
  }

  if (count > config.maxImages) {
    return {
      valid: false,
      error: `${MODE_OPTIONS.find(m => m.value === mode)?.label}模式最多支持${config.maxImages}张图片`
    };
  }

  return { valid: true };
}

/**
 * 根据模式获取图片的role
 */
export function getImageRole(mode: VideoGenerationMode, index: number): string | undefined {
  const config = getModeConfig(mode);

  if (!config.useRole) {
    return undefined;
  }

  if (config.roleType === 'first_last') {
    return index === 0 ? 'first_frame' : 'last_frame';
  }

  if (config.roleType === 'reference') {
    return 'reference_image';
  }

  return undefined;
}

// ============================================================
// API供应商相关类型
// ============================================================

export type ApiProvider = 'volcengine' | 'aihubmix';

export interface ApiProviderConfig {
  provider: ApiProvider;
  apiKey: string;
  keyName?: string;
}

export interface ApiProviderInfo {
  name: ApiProvider;
  displayName: string;
  description?: string;
}

export const API_PROVIDERS: ApiProviderInfo[] = [
  {
    name: 'volcengine',
    displayName: '火山方舟官方API',
    description: '官方提供，稳定可靠'
  },
  {
    name: 'aihubmix',
    displayName: 'Aihubmix聚合API',
    description: '多厂商聚合，性价比高'
  }
];

// ============================================================
// 模型配置
// ============================================================

export interface ModelOption {
  value: ModelId;
  label: string;
  description: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'seedance-2.0',
    label: 'Seedance 2.0',
    description: '全能主角，音视频图均可参考 (暂不支持真人入镜)',
  },
  {
    value: 'seedance-2.0-vip',
    label: 'Seedance 2.0 VIP',
    description: 'VIP专属720p全能模型，音视频图均可参考',
  },
  {
    value: 'seedance-2.0-fast',
    label: 'Seedance 2.0 Fast',
    description: '精简时长，音视频图均可参考 (暂不支持真人入镜)',
  },
  {
    value: 'seedance-2.0-fast-vip',
    label: 'Seedance 2.0 Fast VIP',
    description: 'VIP专属720p快速模型，音视频图均可参考',
  },
];

// ============================================================
// 视频生成相关类型
// ============================================================

export interface GenerateVideoRequest {
  prompt: string;
  model: ModelId;
  ratio: AspectRatio;
  duration: Duration;
  files: File[];
}

export interface VideoGenerationResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt: string;
  }>;
}

export type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export interface GenerationState {
  status: GenerationStatus;
  progress?: string;
  result?: VideoGenerationResponse;
  error?: string;
}

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  index: number;
}

// ============================================================
// 常量配置
// ============================================================

export interface RatioOption {
  value: AspectRatio;
  label: string;
  widthRatio: number;
  heightRatio: number;
}

export const RATIO_OPTIONS: RatioOption[] = [
  { value: 'adaptive', label: '自适应 (首尾帧)', widthRatio: 0, heightRatio: 0 },
  { value: '21:9', label: '21:9', widthRatio: 21, heightRatio: 9 },
  { value: '16:9', label: '16:9', widthRatio: 16, heightRatio: 9 },
  { value: '4:3', label: '4:3', widthRatio: 4, heightRatio: 3 },
  { value: '1:1', label: '1:1', widthRatio: 1, heightRatio: 1 },
  { value: '3:4', label: '3:4', widthRatio: 3, heightRatio: 4 },
  { value: '9:16', label: '9:16', widthRatio: 9, heightRatio: 16 },
];

export const DURATION_OPTIONS: Duration[] = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const REFERENCE_MODES: ReferenceMode[] = ['全能参考', '首帧参考', '尾帧参考'];

// ============================================================
// 任务管理相关类型
// ============================================================

export type TaskKind = 'single' | 'batch';

export type TaskStatus =
  | 'pending'     // 等待中
  | 'generating'  // 生成中
  | 'completed'   // 已完成
  | 'failed'      // 出错
  | 'cancelled';  // 已取消

export interface Task {
  id: number;
  project_id: number;
  prompt: string;
  model_key: string;
  ratio: string;
  video_duration: number;
  status: TaskStatus;
  task_kind: TaskKind;
  video_url?: string | null;
  thumbnail_url?: string | null;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
  updated_at?: string;
}

export interface TaskAsset {
  id: number;
  task_id: number;
  asset_type: 'image' | 'audio';
  file_path: string;
  file_name?: string;
  file_size?: number;
  image_uri?: string;
  sort_order?: number;
  created_at?: string;
}

// ============================================================
// 项目管理相关类型（简化版本）
// ============================================================

export interface Project {
  id: number;
  name: string;
  description?: string;
  task_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectSettings {
  model?: string;
  ratio?: string;
  duration?: number;
  referenceMode?: string;
}

// ============================================================
// 设置相关类型
// ============================================================

export interface Settings {
  model?: string;
  ratio?: string;
  duration?: string;
  reference_mode?: string;
  theme?: 'light' | 'dark' | 'auto';
  language?: 'zh-CN' | 'en-US';
  showAdvancedOptions?: boolean;
  autoSaveDrafts?: boolean;
  [key: string]: string | number | boolean | undefined;
}

// ============================================================
// API响应类型
// ============================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================
// 应用视图类型（简化版本）
// ============================================================

export enum AppView {
  SINGLE_TASK = 'SINGLE_TASK',
  SETTINGS = 'SETTINGS',
  HOME = 'HOME',
  CONFIG = 'CONFIG',
}

export interface AppViewOption {
  id: AppView;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: string;
}
