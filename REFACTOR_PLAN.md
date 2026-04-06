# Seedance 2.0 纯前端重构实施计划

## 概述
本计划将现有的混合架构应用重构为纯前端应用，移除所有后端依赖，保留核心视频生成功能。

## 重构目标
- 移除所有后端API调用，使用纯前端服务替代
- 删除用户系统、批量管理、下载管理等非核心功能
- 保持单任务视频生成和API Key管理功能完整
- 优化路由结构，提升用户体验
- 提高代码质量和可维护性

## 架构概览

### 现有架构
```
前端 → 后端API → 第三方服务
       ↓
   数据库
```

### 目标架构
```
前端 → 第三方服务
  ↓
LocalStorage + IndexedDB
```

---

## 阶段一：核心服务重构（高优先级）

### 目标
建立纯前端服务层，替换后端API调用

### 1.1 API Key管理服务重构
**优先级**: 最高  
**工作量**: 2小时  
**文件操作**:
- **修改**: `src/services/authService.ts`
- **保留**: `src/services/localStorageService.ts` (已实现)

**关键变更**:
- 移除后端API调用
- 使用localStorage存储API Key
- 保留验证逻辑

### 1.2 视频生成服务重构
**优先级**: 最高  
**工作量**: 4小时  
**文件操作**:
- **保留**: `src/services/videoService.ts` (已实现)
- **保留**: `src/services/directApiService.ts` (已实现)
- **修改**: `src/services/taskService.ts`

**关键变更**:
- 移除后端任务管理
- 使用IndexedDB存储任务历史
- 保留任务状态跟踪

### 1.3 设置服务重构
**优先级**: 高  
**工作量**: 2小时  
**文件操作**:
- **修改**: `src/services/settingsService.ts`

**关键变更**:
- 移除SessionID管理功能
- 使用localStorage存储用户设置
- 简化API Key管理

---

## 阶段二：页面重构（中优先级）

### 目标
移除不需要的页面，重构现有页面以使用纯前端服务

### 2.1 删除不需要的页面
**优先级**: 中  
**工作量**: 1小时  

**删除文件列表**:
- `src/pages/LoginPage.tsx`
- `src/pages/RegisterPage.tsx`
- `src/pages/AdminPage.tsx`
- `src/pages/BatchManagement.tsx`
- `src/pages/BatchManagementPage.tsx`
- `src/pages/DownloadManagement.tsx`
- `src/pages/ApiKeyConfigPage.tsx`

### 2.2 重构设置页面
**优先级**: 中  
**工作量**: 3小时  
**文件操作**:
- **修改**: `src/pages/Settings.tsx`

**关键变更**:
- 移除用户信息显示
- 简化为基础设置管理
- 移除后端API调用

---

## 阶段三：路由和导航重构（中优先级）

### 目标
简化路由结构，移除不必要的路由

### 3.1 路由重构
**优先级**: 中  
**工作量**: 2小时  
**文件操作**:
- **修改**: `src/App.tsx`

**新路由结构**:
```typescript
<Routes>
  <Route path="/" element={<HomePage />} />
  <Route path="/generate" element={<SingleTaskPage />} />
  <Route path="/config" element={<ApiKeyPage />} />
  <Route path="/settings" element={<SettingsPage />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

---

## 阶段四：类型定义清理（低优先级）

### 目标
清理不再使用的类型定义，优化代码结构

### 4.1 类型定义清理
**优先级**: 低  
**工作量**: 2小时  
**文件操作**:
- **修改**: `src/types/index.ts`

**需要移除的类型**:
- 用户认证相关类型
- 批量管理相关类型
- 下载管理相关类型

---

## 阶段五：数据迁移和测试（高优先级）

### 目标
确保现有数据能够正确迁移，所有功能正常工作

### 5.1 数据迁移脚本
**优先级**: 高  
**工作量**: 3小时  
**文件操作**:
- **新建**: `src/utils/dataMigration.ts`

### 5.2 功能测试
**优先级**: 最高  
**工作量**: 4小时  

**测试项目**:
1. API Key管理
2. 视频生成功能
3. 任务历史查看
4. 设置管理

---

## 实施时间表

### 第1周：核心服务重构
- Day 1-2: API Key管理服务重构
- Day 3-4: 视频生成服务重构
- Day 5: 设置服务重构

### 第2周：页面重构
- Day 1: 删除不需要的页面
- Day 2-3: 重构设置页面

### 第3周：路由和优化
- Day 1-2: 路由重构
- Day 3-4: 类型定义清理

### 第4周：测试和发布
- Day 1-3: 功能测试
- Day 4: 数据迁移测试
- Day 5: 文档更新

---

## 风险评估

### 高风险项
1. **视频生成API调用** - 第三方API可能有变更或限制
2. **浏览器兼容性** - IndexedDB在不同浏览器中表现可能不一致

### 中风险项
1. **数据迁移** - 用户可能丢失现有数据
2. **用户体验** - 移除功能可能影响用户体验

---

## 成功标准

### 功能标准
- 单任务视频生成功能正常
- API Key管理功能正常
- 任务历史查看功能正常
- 所有后端API调用已移除

### 性能标准
- 页面加载时间 < 2秒
- API响应时间 < 5秒
- 内存占用 < 100MB

---

## 关键文件清单

### 保留文件
1. `src/services/localStorageService.ts` - API配置管理
2. `src/services/indexedDBService.ts` - 任务数据存储
3. `src/services/directApiService.ts` - API调用服务
4. `src/services/videoService.ts` - 视频生成服务
5. `src/pages/SingleTaskPage.tsx` - 核心功能页面
6. `src/pages/ApiKeyPage.tsx` - API配置页面

### 修改文件
1. `src/services/authService.ts` - 移除后端调用
2. `src/services/taskService.ts` - 使用IndexedDB
3. `src/services/settingsService.ts` - 使用localStorage
4. `src/pages/Settings.tsx` - 简化功能
5. `src/App.tsx` - 简化路由

### 删除文件
1. `src/pages/LoginPage.tsx`
2. `src/pages/RegisterPage.tsx`
3. `src/pages/AdminPage.tsx`
4. `src/pages/BatchManagement.tsx`
5. `src/pages/DownloadManagement.tsx`
6. `src/services/projectService.ts`
7. `src/services/batchService.ts`
8. `src/services/downloadService.ts`

---

*本实施计划将根据实际情况动态调整*
