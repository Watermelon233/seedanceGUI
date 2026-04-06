/**
 * Mock DevTools 组件
 * 用于调试和控制 Mock API 模式
 */

import { useState, useEffect } from 'react';
import { indexedDBService } from '../services/indexedDBService';
import { MockProvider } from '../services/providers/mockProvider';

export function MockDevTools() {
  const mockEnv = import.meta.env.VITE_MOCK_API;
  const isMockMode = mockEnv === 'true' || mockEnv === true;
  console.log('[MockDevTools] VITE_MOCK_API:', mockEnv, 'isMockMode:', isMockMode);
  const [taskCount, setTaskCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const refreshTaskCount = async () => {
    try {
      const count = await indexedDBService.getMockTaskCount();
      setTaskCount(count);
    } catch (error) {
      console.error('获取任务计数失败:', error);
    }
  };

  const clearTasks = async () => {
    if (confirm('确认清理所有 mock 任务？')) {
      try {
        await indexedDBService.clearMockTasks();
        MockProvider.clearAllTasks();
        await refreshTaskCount();
      } catch (error) {
        console.error('清理任务失败:', error);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshTaskCount();
    }
  }, [isOpen]);

  if (!isMockMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="bg-gray-900 border border-purple-500 rounded-lg p-4 shadow-xl w-64">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-purple-400 font-bold text-sm">🧪 Mock 控制面板</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">状态:</span>
              <span className="text-green-400">已启用</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">延迟:</span>
              <span className="text-white">3 秒</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">IndexedDB 任务:</span>
              <span className="text-white">{taskCount} 个</span>
            </div>

            <div className="pt-2 border-t border-gray-700 space-y-2">
              <button
                onClick={refreshTaskCount}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white py-1.5 rounded"
              >
                刷新计数
              </button>
              <button
                onClick={clearTasks}
                className="w-full bg-red-900/50 hover:bg-red-900 text-red-200 py-1.5 rounded"
              >
                清理 Mock 任务
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg shadow-lg text-sm"
        >
          🧪 Mock
        </button>
      )}
    </div>
  );
}
