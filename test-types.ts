/**
 * 测试新类型定义的正确性
 */

import {
  VideoGenerationMode,
  MODE_CONFIG,
  MODE_OPTIONS,
  getModeConfig,
  validateImageCount,
  getImageRole
} from './src/types/index';

console.log('🔍 测试类型定义...\n');

// 测试1: 枚举值
console.log('✅ 测试1: VideoGenerationMode 枚举');
console.log('  TEXT_TO_VIDEO:', VideoGenerationMode.TEXT_TO_VIDEO);
console.log('  IMAGE_TO_VIDEO_FIRST_FRAME:', VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME);
console.log('  IMAGE_TO_VIDEO_FIRST_LAST:', VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST);
console.log('  IMAGE_TO_VIDEO_REFERENCE:', VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE);

// 测试2: MODE_CONFIG
console.log('\n✅ 测试2: MODE_CONFIG 配置');
Object.entries(MODE_CONFIG).forEach(([mode, config]) => {
  console.log(`  ${mode}:`);
  console.log(`    图片数量: ${config.minImages}-${config.maxImages}`);
  console.log(`    默认比例: ${config.defaultRatio}`);
  console.log(`    使用role: ${config.useRole}`);
  console.log(`    Role类型: ${config.roleType || '无'}`);
});

// 测试3: MODE_OPTIONS
console.log('\n✅ 测试3: MODE_OPTIONS UI选项');
MODE_OPTIONS.forEach(option => {
  console.log(`  ${option.icon} ${option.label}: ${option.description}`);
});

// 测试4: getModeConfig
console.log('\n✅ 测试4: getModeConfig 函数');
const firstFrameConfig = getModeConfig(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME);
console.log(`  首帧模式配置:`, firstFrameConfig);

// 测试5: validateImageCount
console.log('\n✅ 测试5: validateImageCount 函数');

// 文生视频模式，0张图片 - 应该通过
const test1 = validateImageCount(VideoGenerationMode.TEXT_TO_VIDEO, 0);
console.log(`  文生视频+0张图: ${test1.valid ? '✅' : '❌'} ${test1.error || ''}`);

// 首帧模式，1张图片 - 应该通过
const test2 = validateImageCount(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME, 1);
console.log(`  首帧模式+1张图: ${test2.valid ? '✅' : '❌'} ${test2.error || ''}`);

// 首尾帧模式，2张图片 - 应该通过
const test3 = validateImageCount(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST, 2);
console.log(`  首尾帧模式+2张图: ${test3.valid ? '✅' : '❌'} ${test3.error || ''}`);

// 参考图模式，5张图片 - 应该通过
const test4 = validateImageCount(VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE, 5);
console.log(`  参考图模式+5张图: ${test4.valid ? '✅' : '❌'} ${test4.error || ''}`);

// 首帧模式，0张图片 - 应该失败
const test5 = validateImageCount(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME, 0);
console.log(`  首帧模式+0张图: ${test5.valid ? '❌' : '✅'} ${test5.error || ''}`);

// 测试6: getImageRole
console.log('\n✅ 测试6: getImageRole 函数');

// 文生视频 - 不应该有role
const role1 = getImageRole(VideoGenerationMode.TEXT_TO_VIDEO, 0);
console.log(`  文生视频第1张: ${role1 || '无role'} ✅`);

// 首帧模式 - 不应该有role（关键测试）
const role2 = getImageRole(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME, 0);
console.log(`  首帧模式第1张: ${role2 || '无role'} ${role2 ? '❌ 错误' : '✅ 正确'}`);

// 首尾帧模式 - 第1张应该是first_frame
const role3 = getImageRole(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST, 0);
console.log(`  首尾帧模式第1张: ${role3 || '无role'} ${role3 === 'first_frame' ? '✅' : '❌'}`);

// 首尾帧模式 - 第2张应该是last_frame
const role4 = getImageRole(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST, 1);
console.log(`  首尾帧模式第2张: ${role4 || '无role'} ${role4 === 'last_frame' ? '✅' : '❌'}`);

// 参考图模式 - 所有图片应该是reference_image
const role5 = getImageRole(VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE, 0);
console.log(`  参考图模式第1张: ${role5 || '无role'} ${role5 === 'reference_image' ? '✅' : '❌'}`);

console.log('\n🎉 所有类型定义测试完成！');
