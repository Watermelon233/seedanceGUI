import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, ReactNode } from 'react';
import type { Task, Settings } from '../types/index';
import * as taskService from '../services/taskService';
import * as settingsService from '../services/settingsService';

// ==================== State Types ====================

interface AppState {
  tasks: Task[];
  currentTask: Task | null;
  settings: Settings;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'SET_CURRENT_TASK'; payload: Task | null }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: number }
  | { type: 'SET_SETTINGS'; payload: Settings };

// ==================== Initial State ====================

const initialState: AppState = {
  tasks: [],
  currentTask: null,
  settings: {},
  loading: false,
  error: null,
};

// ==================== Reducer ====================

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_TASKS':
      return { ...state, tasks: action.payload };
    case 'SET_CURRENT_TASK':
      return { ...state, currentTask: action.payload };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
        currentTask:
          state.currentTask?.id === action.payload.id
            ? action.payload
            : state.currentTask,
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload),
        currentTask:
          state.currentTask?.id === action.payload ? null : state.currentTask,
      };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    default:
      return state;
  }
}

// ==================== Context ====================

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Task actions
  loadTasks: () => Promise<void>;
  createTaskAction: (prompt: string, options?: {
    model?: string;
    ratio?: string;
    duration?: number;
  }) => Promise<Task>;
  updateTaskAction: (id: number, data: Partial<Task>) => Promise<void>;
  deleteTaskAction: (id: number) => Promise<void>;
  selectTask: (task: Task | null) => void;
  clearAllTasks: () => Promise<void>;
  // Settings
  loadSettings: () => Promise<void>;
  updateSettingsAction: (settings: Record<string, string | number | boolean>) => Promise<void>;
  resetSettingsAction: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

// ==================== Provider ====================

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 加载任务列表
  const loadTasks = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const tasks = await taskService.getTasks();
      dispatch({ type: 'SET_TASKS', payload: tasks });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '加载任务失败',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // 初始化时加载任务和设置
  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // 创建任务
  const createTaskAction = useCallback(async (
    prompt: string,
    options: {
      model?: string;
      ratio?: string;
      duration?: number;
    } = {}
  ): Promise<Task> => {
    const task = await taskService.createTask(prompt, options);
    dispatch({ type: 'ADD_TASK', payload: task });
    return task;
  }, []);

  // 更新任务
  const updateTaskAction = useCallback(async (
    id: number,
    data: Partial<Task>
  ): Promise<void> => {
    await taskService.updateTask(String(id), data);

    // 重新加载任务列表以获取最新数据
    const tasks = await taskService.getTasks();
    dispatch({ type: 'SET_TASKS', payload: tasks });
  }, []);

  // 删除任务
  const deleteTaskAction = useCallback(async (id: number): Promise<void> => {
    await taskService.deleteTask(String(id));
    dispatch({ type: 'DELETE_TASK', payload: id });
  }, []);

  // 选择任务
  const selectTask = useCallback((task: Task | null) => {
    dispatch({ type: 'SET_CURRENT_TASK', payload: task });
  }, []);

  // 清空所有任务
  const clearAllTasks = useCallback(async (): Promise<void> => {
    await taskService.clearAllTasks();
    dispatch({ type: 'SET_TASKS', payload: [] });
    dispatch({ type: 'SET_CURRENT_TASK', payload: null });
  }, []);

  // 加载设置
  const loadSettings = useCallback(async () => {
    try {
      const settings = await settingsService.getSettings();
      dispatch({ type: 'SET_SETTINGS', payload: settings });
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  }, []);

  // 初始化时加载设置
  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // 更新设置
  const updateSettingsAction = useCallback(async (
    settings: Record<string, string | number | boolean>
  ): Promise<void> => {
    const updated = await settingsService.updateSettings(settings);
    dispatch({ type: 'SET_SETTINGS', payload: updated });
  }, []);

  // 重置设置
  const resetSettingsAction = useCallback(async (): Promise<void> => {
    await settingsService.resetSettings();
    const settings = await settingsService.getSettings();
    dispatch({ type: 'SET_SETTINGS', payload: settings });
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    state,
    dispatch,
    loadTasks,
    createTaskAction,
    updateTaskAction,
    deleteTaskAction,
    selectTask,
    clearAllTasks,
    loadSettings,
    updateSettingsAction,
    resetSettingsAction,
  }), [
    state,
    loadTasks,
    createTaskAction,
    updateTaskAction,
    deleteTaskAction,
    selectTask,
    clearAllTasks,
    loadSettings,
    updateSettingsAction,
    resetSettingsAction,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ==================== Hook ====================

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default { AppProvider, useApp };
