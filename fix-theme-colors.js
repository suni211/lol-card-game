const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 색상 매핑 (라이트 모드 -> 다크 모드)
const colorMap = {
  'text-gray-900': 'text-gray-900 dark:text-white',
  'text-gray-800': 'text-gray-800 dark:text-gray-100',
  'text-gray-700': 'text-gray-700 dark:text-gray-200',
  'text-gray-600': 'text-gray-600 dark:text-gray-300',
  'text-gray-500': 'text-gray-500 dark:text-gray-400',
  'text-gray-400': 'text-gray-400 dark:text-gray-500',
  'text-gray-300': 'text-gray-300 dark:text-gray-600',
  'text-black': 'text-black dark:text-white',
};

function fixThemeColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 각 색상 매핑에 대해 처리
  for (const [light, darkLight] of Object.entries(colorMap)) {
    // 이미 dark: 클래스가 있는 경우는 건너뛰기
    const regex = new RegExp(`${light}(?!\\s+dark:)`, 'g');

    if (regex.test(content)) {
      content = content.replace(regex, darkLight);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

// frontend/src 디렉토리의 모든 .tsx 파일 찾기
const files = glob.sync('frontend/src/**/*.tsx', {
  cwd: __dirname,
  absolute: true
});

let fixedCount = 0;

console.log(`Found ${files.length} .tsx files\n`);

files.forEach(file => {
  if (fixThemeColors(file)) {
    fixedCount++;
  }
});

console.log(`\n🎉 Fixed ${fixedCount} files!`);
