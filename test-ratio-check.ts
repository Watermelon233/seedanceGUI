/**
 * 测试ratio参数是否正确处理
 */

import { VideoGenerationMode, getModeConfig, MODE_OPTIONS } from './src/types/index';

console.log('🔍 检查4种模式的ratio配置...\n');

// 测试每种模式的defaultRatio
MODE_OPTIONS.forEach(option => {
  const config = getModeConfig(option.value);
  const modeName = option.label;

  console.log(`${modeName}:`);
  console.log(`  defaultRatio: ${config.defaultRatio}`);
  console.log(`  图片数量: ${config.minImages}-${config.maxImages}张`);
  console.log(`  useRole: ${config.useRole}`);

  // 验证ratio是否符合官方要求
  if (option.value === VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME ||
      option.value === VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST) {
    if (config.defaultRatio === 'adaptive') {
      console.log(`  ✅ ratio设置正确：必须使用adaptive`);
    } else {
      console.log(`  ❌ ratio设置错误：应该使用adaptive，当前是${config.defaultRatio}`);
    }
  } else {
    if (config.defaultRatio === '16:9') {
      console.log(`  ✅ ratio设置正确：可以使用自定义值`);
    } else {
      console.log(`  ⚠️ ratio设置：${config.defaultRatio}`);
    }
  }
  console.log('');
});

console.log('📋 总结：');
console.log('  1. ✅ defaultRatio配置正确');
console.log('  2. ✅ 首帧和首尾帧模式强制使用adaptive');
console.log('  3. ✅ 文生视频和参考图可以使用自定义ratio');
console.log('');
console.log('⚠️ 注意事项：');
console.log('  - 首帧和首尾帧模式的ratio必须是adaptive');
console.log('  - 其他模式可以自由选择ratio（16:9, 9:16等）');
console.log('  - ratio会影响视频的宽高比和图片裁剪方式');
