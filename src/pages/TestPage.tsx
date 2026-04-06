export default function TestPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f111a',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        🎉 前端测试页面
      </h1>
      <p style={{ fontSize: '1rem', color: '#a0aec0' }}>
        如果你看到这个页面，说明前端基础功能正常
      </p>
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#1a1d2d',
        borderRadius: '0.5rem'
      }}>
        <p>✅ React渲染正常</p>
        <p>✅ 样式加载正常</p>
        <p>✅ 页面路由正常</p>
      </div>
    </div>
  );
}