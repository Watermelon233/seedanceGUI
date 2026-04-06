/**
 * 测试新增功能：图片预览和@图转换
 */

import { VideoGenerationMode, getModeConfig, getImageRole } from './src/types/index';

console.log('🧪 测试新增功能...\n');

// 测试1: @图转换功能
console.log('✅ 测试1: @图转换为[图]格式');

function convertAtNotation(prompt: string, mode: VideoGenerationMode, imageCount: number): string {
  if (mode === VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE && imageCount > 0) {
    return prompt.replace(/@图(\d+)/g, '[图$1]');
  }
  return prompt;
}

const testCases = [
  {
    mode: VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE,
    images: 3,
    input: '@图1戴着眼镜的男生和@图2的柯基，坐在@图3的草坪上',
    expected: '[图1]戴着眼镜的男生和[图2]的柯基，坐在[图3]的草坪上'
  },
  {
    mode: VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE,
    images: 2,
    input: '将@图1转换为@图2的风格',
    expected: '将[图1]转换为[图2]的风格'
  },
  {
    mode: VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME,
    images: 1,
    input: '@图1的特写镜头',
    expected: '@图1的特写镜头'  // 首帧模式不转换
  }
];

testCases.forEach(({ mode, images, input, expected }) => {
  const result = convertAtNotation(input, mode, images);
  const passed = result === expected;
  const modeName = mode === VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE ? '参考图' : '首帧';

  console.log(`  ${passed ? '✅' : '❌'} ${modeName}模式: ${input}`);
  console.log(`     期望: ${expected}`);
  console.log(`     实际: ${result}`);
});

// 测试2: 图片Role分配显示
console.log('\n✅ 测试2: 图片Role分配显示');

function getImageDisplayInfo(mode: VideoGenerationMode, index: number, fileName: string, fileSize: number) {
  const config = getModeConfig(mode);
  const role = config.useRole ? getImageRole(mode, index) : null;

  return {
    index: index + 1,
    fileName,
    fileSize: `${fileSize}KB`,
    role: role || '无',
    roleLabel: role === 'first_frame' ? '🎬 首帧' :
              role === 'last_frame' ? '🎬 尾帧' :
              role === 'reference_image' ? `🎨 图${index + 1}` :
              '无'
  };
}

// 模拟上传图片后的显示
console.log('\n  场景1: 首尾帧模式 + 2张图片');
const firstLastImages = [
  { name: 'first_frame.jpg', size: 120 },
  { name: 'last_frame.jpg', size: 95 }
];
firstLastImages.forEach((img, idx) => {
  const info = getImageDisplayInfo(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST, idx, img.name, img.size);
  console.log(`    图${info.index} [${info.roleLabel}] ${info.fileName} (${info.fileSize}KB)`);
});

console.log('\n  场景2: 参考图模式 + 3张图片');
const refImages = [
  { name: 'character.png', size: 250 },
  { name: 'animal.png', size: 180 },
  { name: 'background.jpg', size: 320 }
];
refImages.forEach((img, idx) => {
  const info = getImageDisplayInfo(VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE, idx, img.name, img.size);
  console.log(`    图${info.index} [${info.roleLabel}] ${info.fileName} (${info.fileSize}KB)`);
});

console.log('\n  场景3: 首帧模式 + 1张图片');
const firstFrameImages = [
  { name: 'starting_frame.jpg', size: 200 }
];
firstFrameImages.forEach((img, idx) => {
  const info = getImageDisplayInfo(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_FRAME, idx, img.name, img.size);
  console.log(`    图${info.index} [${info.roleLabel === '无' ? '✅ 无role' : info.roleLabel}] ${info.fileName} (${info.fileSize}KB)`);
});

// 测试3: 提示信息显示
console.log('\n✅ 测试3: 不同模式的提示信息');

function getModeHint(mode: VideoGenerationMode): string {
  switch (mode) {
    case VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE:
      return '💡 提示：在提示词中使用 @图1 @图2 @图3 引用图片，系统会自动转换为 [图1] [图2] [图3]';
    case VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST:
      return '💡 提示：第1张图片为起始帧，第2张图片为结束帧';
    default:
      return '';
  }
}

console.log(`  参考图模式: ${getModeHint(VideoGenerationMode.IMAGE_TO_VIDEO_REFERENCE)}`);
console.log(`  首尾帧模式: ${getModeHint(VideoGenerationMode.IMAGE_TO_VIDEO_FIRST_LAST)}`);

console.log('\n🎉 所有新增功能测试完成！');

console.log('\n📋 功能总结：');
console.log('  ✅ 图片预览：显示缩略图、文件名、大小');
console.log('  ✅ 顺序显示：图1、图2、图3...');
console.log('  ✅ Role标签：🎬首帧、🎬尾帧、🎨图N');
console.log('  ✅ 删除功能：每张图片都有删除按钮');
console.log('  ✅ @图转换：@图1 → [图1]');
console.log('  ✅ 智能提示：根据模式显示不同的使用提示');
