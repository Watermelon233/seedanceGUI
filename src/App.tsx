import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ApiKeyPage from './pages/ApiKeyPage';
import SingleTaskPage from './pages/SingleTaskPage';
import { hasApiKey } from './services/localStorageService';

// 简单的导航菜单
function NavigationMenu() {
  const location = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1a1d2d',
      borderBottom: '1px solid #374151',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        fontSize: '1.25rem',
        fontWeight: 'bold',
        background: 'linear-gradient(to right, #a855f7, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Seedance 2.0
      </div>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <a
          href="/"
          style={{
            color: location.pathname === '/' ? '#a855f7' : '#9ca3af',
            textDecoration: 'none',
            fontWeight: location.pathname === '/' ? '500' : '400'
          }}
        >
          主页
        </a>
        <a
          href="/generate"
          style={{
            color: location.pathname === '/generate' ? '#a855f7' : '#9ca3af',
            textDecoration: 'none',
            fontWeight: location.pathname === '/generate' ? '500' : '400'
          }}
        >
          视频生成
        </a>
        <a
          href="/config"
          style={{
            color: location.pathname === '/config' ? '#a855f7' : '#9ca3af',
            textDecoration: 'none',
            fontWeight: location.pathname === '/config' ? '500' : '400'
          }}
        >
          API配置
        </a>
      </div>
    </nav>
  );
}

// 主页面组件
function HomePage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f111a',
      color: '#e5e7eb',
      paddingTop: '5rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem'
      }}>
        {/* 欢迎区域 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '4rem'
        }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            background: 'linear-gradient(to right, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎬 Seedance 2.0
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#9ca3af', maxWidth: '600px', margin: '0 auto' }}>
            AI视频生成工具 - 纯前端版本
          </p>
        </div>

        {/* 功能展示 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '4rem'
        }}>
          {/* 功能卡片1 */}
          <div style={{
            backgroundColor: '#1a1d2d',
            borderRadius: '1rem',
            padding: '2rem',
            border: '1px solid #374151',
            transition: 'all 0.3s'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎨</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              文生视频
            </h3>
            <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
              输入文字描述，AI自动生成精彩视频内容
            </p>
          </div>

          {/* 功能卡片2 */}
          <div style={{
            backgroundColor: '#1a1d2d',
            borderRadius: '1rem',
            padding: '2rem',
            border: '1px solid #374151',
            transition: 'all 0.3s'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🚀</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              多模型支持
            </h3>
            <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
              支持火山方舟、Aihubmix等多种AI模型
            </p>
          </div>

          {/* 功能卡片3 */}
          <div style={{
            backgroundColor: '#1a1d2d',
            borderRadius: '1rem',
            padding: '2rem',
            border: '1px solid #374151',
            transition: 'all 0.3s'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>💾</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              本地存储
            </h3>
            <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
              所有数据存储在本地浏览器，无需服务器
            </p>
          </div>
        </div>

        {/* 技术特性 */}
        <div style={{
          backgroundColor: '#1a1d2d',
          borderRadius: '1rem',
          padding: '2rem',
          border: '1px solid #374151'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
            🔥 纯前端特性
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span>无需后端服务器</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span>秒级启动响应</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span>可部署静态网站</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span>本地数据存储</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span>跨平台支持</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: '#22c55e' }}>✓</span>
              <span>开源免费</span>
            </div>
          </div>
        </div>

        {/* 使用提示 */}
        <div style={{
          marginTop: '3rem',
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderRadius: '1rem',
          border: '1px solid rgba(168, 85, 247, 0.3)'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            🚀 开始使用
          </h3>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/config"
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                background: 'linear-gradient(to right, #a855f7, #ec4899)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.3s'
              }}
            >
              配置 API Key
            </a>
            <a
              href="/generate"
              style={{
                display: 'inline-block',
                padding: '0.75rem 2rem',
                backgroundColor: '#1a1d2d',
                color: '#e5e7eb',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: '1px solid #374151',
                transition: 'all 0.3s'
              }}
            >
              开始生成视频
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// 主应用组件
function AppContent() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 快速初始化
    setLoading(false);
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
      {/* 主页 - 不需要API Key */}
      <Route path="/" element={<HomePage />} />

      {/* 视频生成页面 - 需要API Key */}
      <Route
        path="/generate"
        element={
          hasApiKey() ? <SingleTaskPage /> : <Navigate to="/config" replace />
        }
      />

      {/* API配置页面 - 二级页面 */}
      <Route path="/config" element={<ApiKeyPage />} />

      {/* 其他路由重定向到主页 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigationMenu />
      <AppContent />
    </BrowserRouter>
  );
}