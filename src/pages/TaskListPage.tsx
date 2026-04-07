/**
 * 任务列表页面
 * 修复: 使用 useRef 存储 cleanup 函数，避免 React Strict Mode 重复调用
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getTasksForCurrentUser,
  deleteTask,
  startPolling,
  stopPolling,
  type TaskListItem,
} from '../services/taskListService';
import { downloadVideoFromProxy, extractTaskId } from '../services/videoDownloadService';
import {
  VideoIcon,
  DownloadIcon,
  TrashIcon,
  RefreshIcon,
  SpinnerIcon,
  AlertCircleIcon,
  CheckIcon,
  ClockIcon,
} from '../components/Icons';

// 状态图标组件
function StatusBadge({ status }: { status: TaskListItem['status'] }) {
  const styles = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    generating: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const icons = {
    pending: <ClockIcon className="w-3 h-3" />,
    generating: <SpinnerIcon className="w-3 h-3 animate-spin" />,
    completed: <CheckIcon className="w-3 h-3" />,
    failed: <AlertCircleIcon className="w-3 h-3" />,
  };

  const labels = {
    pending: '等待中',
    generating: '生成中',
    completed: '已完成',
    failed: '失败',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${styles[status]}`}>
      {icons[status]}
      {labels[status]}
    </span>
  );
}

// 格式化时间
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`;
  }
  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  }
  // 大于24小时
  return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
}

// 任务卡片组件
function TaskCard({
  task,
  onDelete,
  onDownload,
}: {
  task: TaskListItem;
  onDelete: (taskId: string) => void;
  onDownload: (task: TaskListItem) => void;
}) {
  return (
    <div className="bg-[#1a1d2d] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={task.status} />
            <span className="text-xs text-gray-500">
              {task.provider.toUpperCase()}
            </span>
          </div>
          <p className="text-white text-sm line-clamp-2 mb-2">
            {task.prompt}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{task.model}</span>
            <span>•</span>
            <span>{task.ratio}</span>
            <span>•</span>
            <span>{task.duration}s</span>
            <span>•</span>
            <span>{formatTime(task.createdAt)}</span>
          </div>
          {task.errorMessage && (
            <p className="text-red-400 text-xs mt-2">{task.errorMessage}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.status === 'completed' && task.videoUrl && (
            <button
              onClick={() => onDownload(task)}
              className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
              title="下载视频"
            >
              <DownloadIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
            title="删除任务"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// TrashIcon - 新增
function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function TaskListPage() {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 使用 ref 存储 cleanup 函数
  const cleanupRef = useRef<(() => void) | null>(null);

  // 加载任务
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const userTasks = await getTasksForCurrentUser();
      setTasks(userTasks);
    } catch (error) {
      console.error('加载任务失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化和轮询设置
  useEffect(() => {
    // 防止重复执行
    if (cleanupRef.current) {
      return;
    }

    loadTasks();

    // 启动轮询
    startPolling({ interval: 5000, visibilityAware: true });
    setPollingActive(true);

    // 存储 cleanup 函数
    cleanupRef.current = () => {
      stopPolling();
      cleanupRef.current = null;
    };

    // 返回 cleanup 函数
    return cleanupRef.current;
  }, [loadTasks]);

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  // 删除任务
  const handleDelete = useCallback(async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;

    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败');
    }
  }, []);

  // 下载视频
  const handleDownload = useCallback(async (task: TaskListItem) => {
    if (!task.videoUrl) return;

    const taskId = extractTaskId(task.videoUrl);
    if (!taskId) {
      alert('无法获取视频ID');
      return;
    }

    try {
      await downloadVideoFromProxy(taskId, {
        filename: `seedance_video_${task.id}.mp4`,
      });
    } catch (error) {
      console.error('下载失败:', error);
      alert(`下载失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, []);

  // 统计数据
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    generating: tasks.filter(t => t.status === 'generating').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">任务列表</h1>
            <p className="text-gray-400 text-sm">查看和管理您的视频生成任务</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="刷新"
          >
            <RefreshIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-[#1a1d2d] rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-500">全部任务</div>
          </div>
          <div className="bg-[#1a1d2d] rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-xs text-gray-500">等待中</div>
          </div>
          <div className="bg-[#1a1d2d] rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-blue-400">{stats.generating}</div>
            <div className="text-xs text-gray-500">生成中</div>
          </div>
          <div className="bg-[#1a1d2d] rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-xs text-gray-500">已完成</div>
          </div>
          <div className="bg-[#1a1d2d] rounded-lg p-4 border border-gray-800">
            <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
            <div className="text-xs text-gray-500">失败</div>
          </div>
        </div>

        {/* 任务列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <SpinnerIcon className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <VideoIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">暂无任务</p>
            <p className="text-gray-600 text-sm mt-1">创建一个任务开始生成视频</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
