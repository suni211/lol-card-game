const path = require('path');
const fs = require('fs');

// .env 파일 읽기 함수
function loadEnvFile(envPath) {
  const env = {};
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
  }
  return env;
}

// 백엔드 .env 파일 로드
const backendEnv = loadEnvFile(path.join(__dirname, 'backend', '.env'));

module.exports = {
  apps: [
    {
      name: 'lol-backend',
      script: path.join(__dirname, 'backend', 'dist', 'server.js'),
      cwd: path.join(__dirname, 'backend'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        ...backendEnv, // .env 파일의 모든 환경 변수 추가
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      error_file: path.join(__dirname, 'logs', 'backend-error.log'),
      out_file: path.join(__dirname, 'logs', 'backend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // 백엔드 빌드가 필요한 경우
      // pre_start: 'cd backend && npm run build',
    },
    {
      name: 'lol-frontend',
      script: 'npx',
      args: 'serve -s dist -l 3000',
      cwd: path.join(__dirname, 'frontend'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      error_file: path.join(__dirname, 'logs', 'frontend-error.log'),
      out_file: path.join(__dirname, 'logs', 'frontend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      // 프론트엔드 빌드가 필요한 경우
      // pre_start: 'cd frontend && npm run build',
    },
  ],
};

