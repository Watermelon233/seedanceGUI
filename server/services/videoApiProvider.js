/**
 * 视频生成API供应商抽象接口
 * 所有供应商必须实现这个接口，确保统一的调用方式
 *
 * 抽象层设计原则：
 * 1. 统一规范：所有供应商遵循相同的接口规范
 * 2. 最小依赖：接口不依赖具体实现细节
 * 3. 易于理解：方法命名清晰，参数明确
 * 4. 错误处理：统一的错误处理和返回格式
 * 5. 扩展友好：预留扩展接口，支持新功能
 */

class VideoApiProvider {
  /**
   * 获取供应商名称
   * @returns {string} 供应商标识符 (如: 'volcengine', 'aihubmix')
   */
  getName() {
    throw new Error('getName() must be implemented by subclass');
  }

  /**
   * 获取供应商显示名称
   * @returns {string} 供应商显示名称 (如: '火山方舟官方API', 'Aihubmix聚合API')
   */
  getDisplayName() {
    throw new Error('getDisplayName() must be implemented by subclass');
  }

  /**
   * 验证API密钥格式
   * @param {string} apiKey - API密钥
   * @returns {boolean} 是否有效
   */
  validateApiKey(apiKey) {
    throw new Error('validateApiKey() must be implemented by subclass');
  }

  /**
   * 获取模型映射关系
   * 将前端模型ID映射到供应商特定的模型标识符
   * @returns {object} 前端模型ID到供应商模型的映射
   *
   * 示例返回值:
   * {
   *   'seedance-2.0': 'doubao-seedance-2-0-260128',
   *   'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128'
   * }
   */
  getModelMapping() {
    throw new Error('getModelMapping() must be implemented by subclass');
  }

  /**
   * 转换请求格式为供应商格式
   * 将标准请求格式转换为供应商特定的API请求格式
   * @param {GenerateVideoRequest} request - 标准请求格式
   * @returns {object} 供应商专用请求格式
   *
   * 标准请求格式:
   * {
   *   prompt: string,
   *   model: ModelId,
   *   ratio: AspectRatio,
   *   duration: Duration,
   *   files: File[],
   *   referenceMode: ReferenceMode
   * }
   */
  transformRequest(request) {
    throw new Error('transformRequest() must be implemented by subclass');
  }

  /**
   * 创建视频生成任务
   * @param {string} apiKey - API密钥
   * @param {object} transformedRequest - 转换后的请求
   * @returns {Promise<object>} 创建结果 { success, taskId, status, error }
   */
  async createTask(apiKey, transformedRequest) {
    throw new Error('createTask() must be implemented by subclass');
  }

  /**
   * 查询任务状态
   * @param {string} apiKey - API密钥
   * @param {string} taskId - 任务ID
   * @returns {Promise<object>} 任务状态 { success, status, result, error }
   */
  async getTaskStatus(apiKey, taskId) {
    throw new Error('getTaskStatus() must be implemented by subclass');
  }

  /**
   * 转换响应格式为标准格式
   * 将供应商响应转换为统一的标准响应格式
   * @param {object} providerResponse - 供应商响应
   * @returns {VideoGenerationResponse} 标准响应格式
   *
   * 标准响应格式:
   * {
   *   created: number,
   *   data: [{
   *     url: string,
   *     revised_prompt: string
   *   }]
   * }
   */
  transformResponse(providerResponse) {
    throw new Error('transformResponse() must be implemented by subclass');
  }

  /**
   * 测试API连接
   * 验证API Key是否有效，能否正常调用供应商API
   * @param {string} apiKey - API密钥
   * @returns {Promise<object>} 测试结果 { success, error }
   */
  async testConnection(apiKey) {
    throw new Error('testConnection() must be implemented by subclass');
  }

  /**
   * 获取供应商支持的参考模式
   * @returns {string[]} 支持的参考模式列表
   */
  getSupportedReferenceModes() {
    return ['全能参考', '首帧参考', '尾帧参考'];
  }

  /**
   * 获取供应商支持的模型列表
   * @returns {ModelId[]} 支持的模型ID列表
   */
  getSupportedModels() {
    return ['seedance-2.0', 'seedance-2.0-fast', 'seedance-2.0-vip', 'seedance-2.0-fast-vip'];
  }
}

export default VideoApiProvider;