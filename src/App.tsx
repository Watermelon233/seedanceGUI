import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import ApiKeyConfigPage from './pages/ApiKeyConfigPage';
import AdminPage from './pages/AdminPage';
import SingleTaskPage from './pages/SingleTaskPage';
import BatchManagementPage from './pages/BatchManagement';
import SettingsPage from './pages/Settings';
import DownloadManagementPage from './pages/DownloadManagement';
import { getApiKey } from './services/authService';

// API Key 路由保护组件
function ApiKeyProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return <Navigate to="/config" replace />;
  }

  return <>{children}</>;
}

// 主布局组件（带侧边栏）
function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0f111a]">
      <Sidebar />
      <main className="lg:pl-60 pt-16 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}

function AppContent() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);

  // 检查是否已配置 API Key
  useEffect(() => {
    const checkApiKey = () => {
      const apiKey = getApiKey();
      setHasApiKey(!!apiKey);
      setLoading(false);
    };

    checkApiKey();

    // 监听 localStorage 变化（当用户配置了 API Key 后）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'seedance_api_key') {
        checkApiKey();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 加载过程中显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f111a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin text-purple-500 mb-4">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider currentUser={null}>
      <Routes>
        {/* API Key 配置页面（公开访问） */}
        <Route
          path="/config"
          element={
            hasApiKey ? (
              <Navigate to="/" replace />
            ) : (
              <ApiKeyConfigPage />
            )
          }
        />

        {/* 受保护的路由（需要 API Key） */}
        <Route
          path="/"
          element={
            <ApiKeyProtectedRoute>
              <MainLayout>
                <SingleTaskPage />
              </MainLayout>
            </ApiKeyProtectedRoute>
          }
        />
        <Route
          path="/batch"
          element={
            <ApiKeyProtectedRoute>
              <MainLayout>
                <BatchManagementPage />
              </MainLayout>
            </ApiKeyProtectedRoute>
          }
        />
        <Route
          path="/download"
          element={
            <ApiKeyProtectedRoute>
              <MainLayout>
                <DownloadManagementPage />
              </MainLayout>
            </ApiKeyProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ApiKeyProtectedRoute>
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            </ApiKeyProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ApiKeyProtectedRoute>
              <MainLayout>
                <AdminPage />
              </MainLayout>
            </ApiKeyProtectedRoute>
          }
        />

        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}