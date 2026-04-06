import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ApiKeyPage from './pages/ApiKeyPage';
import { hasApiKey } from './services/localStorageService';

// 主应用组件
function AppContent() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查是否已配置API Key
    const checkConfig = () => {
      const configured = hasApiKey();
      setIsConfigured(configured);
      setLoading(false);
    };

    checkConfig();

    // 监听localStorage变化
    const handleStorageChange = () => {
      checkConfig();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f111a',
        color: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            border: '3px solid #a855f7',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* API Key 配置页面 */}
      <Route
        path="/config"
        element={
          isConfigured ? <Navigate to="/" replace /> : <ApiKeyPage />
        }
      />

      {/* 主页面 */}
      <Route
        path="/"
        element={
          isConfigured ? (
            <div style={{
              minHeight: '100vh',
              backgroundColor: '#0f111a',
              color: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                🎉 Seedance 2.0 纯前端版本
              </h1>
              <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
                恭喜！你现在正在使用纯前端版本
              </p>
              <div style={{
                backgroundColor: '#1a1d2d',
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #374151'
              }}>
                <p style={{ marginBottom: '0.5rem' }}>✅ 无需后端服务器</p>
                <p style={{ marginBottom: '0.5rem' }}>✅ 纯浏览器运行</p>
                <p style={{ marginBottom: '0.5rem' }}>✅ 可部署到GitHub Pages</p>
                <p>✅ API Key安全存储在本地</p>
              </div>

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
                  更多功能开发中...
                </p>
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#374151',
                    color: '#e5e7eb',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  重置配置
                </button>
              </div>
            </div>
          ) : (
            <Navigate to="/config" replace />
          )
        }
      />

      {/* 404 重定向 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}