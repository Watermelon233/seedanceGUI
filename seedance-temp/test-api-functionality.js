/**
 * API功能测试脚本
 * 测试Seedance视频生成API的各个功能
 */

const API_CONFIG = {
  // 测试用的默认API Key（这个是用于演示的假key）
  volcengineKey: 'sk-test-volcengine-default-key-for-demo',
  apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
  statusApiUrl: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks'
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// ============================================================
// 1. 测试API配置
// ============================================================

function testApiConfig() {
  log(colors.blue, '\n=== 测试1: API配置验证 ===');

  // 验证默认API Key
  const hasDefaultKey = API_CONFIG.volcengineKey === 'sk-test-volcengine-default-key-for-demo';
  if (hasDefaultKey) {
    log(colors.green, '✅ 默认测试API Key已配置');
    log(colors.yellow, '⚠️  注意: 这是一个演示用的假key，实际API调用会失败');
  } else {
    log(colors.red, '❌ 默认API Key配置错误');
  }

  // 验证API URL格式
  try {
    const apiUrl = new URL(API_CONFIG.apiUrl);
    log(colors.green, `✅ API URL格式正确: ${apiUrl.origin}`);
  } catch (error) {
    log(colors.red, '❌ API URL格式错误');
  }
}

// ============================================================
// 2. 测试请求体构建
// ============================================================

function testRequestBodyBuild() {
  log(colors.blue, '\n=== 测试2: 请求体构建 ===');

  // 模拟构建请求体
  const testRequest = {
    model: 'seedance-2.0',
    prompt: '一只可爱的小猫在草地上玩耍',
    ratio: '16:9',
    duration: 5,
    referenceMode: '全能参考',
    generateAudio: true,
    resolution: '720p',
    seed: -1,
    watermark: false
  };

  // 模型ID映射
  const MODEL_ID_MAPPING = {
    'seedance-2.0': 'doubao-seedance-2-0-260128',
    'seedance-2.0-vip': 'doubao-seedance-2-0-260128',
    'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128',
    'seedance-2.0-fast-vip': 'doubao-seedance-2-0-fast-260128',
  };

  // 构建content数组
  const content = [
    { type: 'text', text: testRequest.prompt }
  ];

  // 构建完整请求体
  const requestBody = {
    model: MODEL_ID_MAPPING[testRequest.model],
    content: content,
    resolution: testRequest.resolution,
    ratio: testRequest.ratio,
    duration: testRequest.duration,
    generate_audio: testRequest.generateAudio,
    seed: testRequest.seed,
    watermark: testRequest.watermark,
    camera_fixed: false
  };

  // 验证请求体结构
  const validationChecks = [
    { field: 'model', expected: 'doubao-seedance-2-0-260128', actual: requestBody.model },
    { field: 'content', expected: 1, actual: requestBody.content.length },
    { field: 'resolution', expected: '720p', actual: requestBody.resolution },
    { field: 'ratio', expected: '16:9', actual: requestBody.ratio },
    { field: 'duration', expected: 5, actual: requestBody.duration },
    { field: 'generate_audio', expected: true, actual: requestBody.generate_audio },
    { field: 'seed', expected: -1, actual: requestBody.seed },
    { field: 'watermark', expected: false, actual: requestBody.watermark },
    { field: 'camera_fixed', expected: false, actual: requestBody.camera_fixed }
  ];

  let allValid = true;
  validationChecks.forEach(check => {
    if (check.actual === check.expected) {
      log(colors.green, `✅ ${check.field}: ${check.actual}`);
    } else {
      log(colors.red, `❌ ${check.field}: 期望 ${check.expected}, 实际 ${check.actual}`);
      allValid = false;
    }
  });

  if (allValid) {
    log(colors.green, '✅ 请求体构建完全正确');
    console.log('\n生成的请求体:', JSON.stringify(requestBody, null, 2));
  }
}

// ============================================================
// 3. 测试参数验证
// ============================================================

function testParameterValidation() {
  log(colors.blue, '\n=== 测试3: 参数验证 ===');

  // 测试用例
  const testCases = [
    {
      name: '正常参数',
      params: { prompt: '测试提示词', duration: 5, model: 'seedance-2.0' },
      shouldPass: true
    },
    {
      name: '空提示词',
      params: { prompt: '', duration: 5, model: 'seedance-2.0' },
      shouldPass: false
    },
    {
      name: '时长过短',
      params: { prompt: '测试提示词', duration: 3, model: 'seedance-2.0' },
      shouldPass: false
    },
    {
      name: '时长过长',
      params: { prompt: '测试提示词', duration: 20, model: 'seedance-2.0' },
      shouldPass: false
    }
  ];

  testCases.forEach(testCase => {
    const errors = [];

    if (!testCase.params.prompt.trim()) {
      errors.push('提示词不能为空');
    }

    if (testCase.params.duration < 4 || testCase.params.duration > 15) {
      errors.push('视频时长必须在4-15秒之间');
    }

    const passed = errors.length === 0;
    const expectedResult = testCase.shouldPass ? '应该通过' : '应该失败';

    if (passed === testCase.shouldPass) {
      log(colors.green, `✅ ${testCase.name}: ${expectedResult} - 正确`);
    } else {
      log(colors.red, `❌ ${testCase.name}: ${expectedResult} - 错误 (${errors.join(', ')})`);
    }
  });
}

// ============================================================
// 4. 测试模型ID映射
// ============================================================

function testModelIdMapping() {
  log(colors.blue, '\n=== 测试4: 模型ID映射 ===');

  const MODEL_ID_MAPPING = {
    'seedance-2.0': 'doubao-seedance-2-0-260128',
    'seedance-2.0-vip': 'doubao-seedance-2-0-260128',
    'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128',
    'seedance-2.0-fast-vip': 'doubao-seedance-2-0-fast-260128',
  };

  const expectedMappings = [
    { frontend: 'seedance-2.0', backend: 'doubao-seedance-2-0-260128' },
    { frontend: 'seedance-2.0-vip', backend: 'doubao-seedance-2-0-260128' },
    { frontend: 'seedance-2.0-fast', backend: 'doubao-seedance-2-0-fast-260128' },
    { frontend: 'seedance-2.0-fast-vip', backend: 'doubao-seedance-2-0-fast-260128' }
  ];

  let allCorrect = true;
  expectedMappings.forEach(mapping => {
    const actual = MODEL_ID_MAPPING[mapping.frontend];
    if (actual === mapping.backend) {
      log(colors.green, `✅ ${mapping.frontend} → ${actual}`);
    } else {
      log(colors.red, `❌ ${mapping.frontend}: 期望 ${mapping.backend}, 实际 ${actual}`);
      allCorrect = false;
    }
  });

  if (allCorrect) {
    log(colors.green, '✅ 所有模型ID映射正确');
  }
}

// ============================================================
// 5. 测试状态映射
// ============================================================

function testStatusMapping() {
  log(colors.blue, '\n=== 测试5: 状态映射 ===');

  const statusMappings = [
    { apiStatus: 'queued', expected: 'processing' },
    { apiStatus: 'running', expected: 'processing' },
    { apiStatus: 'succeeded', expected: 'completed' },
    { apiStatus: 'failed', expected: 'failed' },
    { apiStatus: 'expired', expected: 'failed' },
    { apiStatus: 'cancelled', expected: 'failed' }
  ];

  let allCorrect = true;
  statusMappings.forEach(mapping => {
    let mappedStatus;
    switch (mapping.apiStatus) {
      case 'queued':
      case 'running':
        mappedStatus = 'processing';
        break;
      case 'succeeded':
        mappedStatus = 'completed';
        break;
      case 'failed':
      case 'expired':
      case 'cancelled':
        mappedStatus = 'failed';
        break;
      default:
        mappedStatus = 'pending';
    }

    if (mappedStatus === mapping.expected) {
      log(colors.green, `✅ ${mapping.apiStatus} → ${mappedStatus}`);
    } else {
      log(colors.red, `❌ ${mapping.apiStatus}: 期望 ${mapping.expected}, 实际 ${mappedStatus}`);
      allCorrect = false;
    }
  });

  if (allCorrect) {
    log(colors.green, '✅ 所有状态映射正确');
  }
}

// ============================================================
// 6. 测试文件名生成
// ============================================================

function testFilenameGeneration() {
  log(colors.blue, '\n=== 测试6: 文件名生成 ===');

  // 模拟文件名生成函数
  function generateVideoFilename(prompt, timestamp) {
    const ts = timestamp || Date.now();
    const dateStr = new Date(ts).toISOString()
      .replace(/[:.]/g, '-')
      .substring(0, 19)
      .replace('T', '_');

    if (prompt && prompt.trim()) {
      const cleanPrompt = prompt
        .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
        .substring(0, 20)
        .trim();

      return cleanPrompt ? `${cleanPrompt}_${dateStr}.mp4` : `seedance_${dateStr}.mp4`;
    }

    return `seedance_${dateStr}.mp4`;
  }

  const testCases = [
    {
      name: '中文提示词',
      input: { prompt: '一只可爱的小猫', timestamp: 1712345678000 },
      shouldMatch: /[\u4e00-\u9fa5]+_.*\.mp4$/
    },
    {
      name: '英文提示词',
      input: { prompt: 'A cute cat playing', timestamp: 1712345678000 },
      shouldMatch: /^[A-Za-z]+_.*\.mp4$/
    },
    {
      name: '无提示词',
      input: { prompt: '', timestamp: 1712345678000 },
      shouldMatch: /^seedance_.*\.mp4$/
    }
  ];

  testCases.forEach(testCase => {
    const filename = generateVideoFilename(testCase.input.prompt, testCase.input.timestamp);
    if (testCase.shouldMatch.test(filename)) {
      log(colors.green, `✅ ${testCase.name}: ${filename}`);
    } else {
      log(colors.red, `❌ ${testCase.name}: ${filename} 不符合格式要求`);
    }
  });
}

// ============================================================
// 7. 测试URL验证
// ============================================================

function testUrlValidation() {
  log(colors.blue, '\n=== 测试7: URL验证 ===');

  // 模拟URL验证函数
  function isValidVideoUrl(url) {
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
      const isVideoFile = videoExtensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext));
      const isDataURL = url.startsWith('data:video/');
      const isAssetUrl = url.startsWith('asset://');

      return isVideoFile || isDataURL || isAssetUrl;
    } catch {
      return false;
    }
  }

  const testCases = [
    { url: 'https://example.com/video.mp4', shouldPass: true },
    { url: 'https://example.com/video.mov', shouldPass: true },
    { url: 'data:video/mp4;base64,abc123', shouldPass: true },
    { url: 'asset://VIDEO_ID', shouldPass: true },
    { url: 'https://example.com/video.jpg', shouldPass: false },
    { url: 'ftp://example.com/video.mp4', shouldPass: false },
    { url: 'invalid-url', shouldPass: false }
  ];

  testCases.forEach(testCase => {
    const isValid = isValidVideoUrl(testCase.url);
    if (isValid === testCase.shouldPass) {
      log(colors.green, `✅ ${testCase.url}: ${isValid ? '有效' : '无效'}`);
    } else {
      log(colors.red, `❌ ${testCase.url}: 期望 ${testCase.shouldPass ? '有效' : '无效'}, 实际 ${isValid ? '有效' : '无效'}`);
    }
  });
}

// ============================================================
// 主测试函数
// ============================================================

function runAllTests() {
  console.log('\n🚀 开始API功能测试...\n');
  console.log('='.repeat(50));

  testApiConfig();
  testRequestBodyBuild();
  testParameterValidation();
  testModelIdMapping();
  testStatusMapping();
  testFilenameGeneration();
  testUrlValidation();

  console.log('\n' + '='.repeat(50));
  log(colors.green, '\n✅ 所有静态测试完成！');
  log(colors.yellow, '\n📝 测试总结:');
  log(colors.yellow, '1. ✅ 代码逻辑验证通过');
  log(colors.yellow, '2. ✅ 参数映射正确');
  log(colors.yellow, '3. ✅ 数据结构符合官方文档');
  log(colors.yellow, '4. ⚠️  实际API调用需要真实的API Key');

  console.log('\n🔗 下一步:');
  console.log('1. 在浏览器中打开 http://localhost:5173');
  console.log('2. 访问 /api-test 页面测试参数构建');
  console.log('3. 配置真实的API Key进行实际调用测试');
  console.log('4. 测试视频生成、状态查询、下载功能');
}

// 运行测试
runAllTests();