const path = require('path');

module.exports = {
  apps: [
    {
      name: 'lol-backend',
      script: path.join(__dirname, 'backend', 'dist', 'server.js'),
      cwd: path.join(__dirname, 'backend'),
      instances: 1,
      exec_mode: 'fork',
      env_file: path.join(__dirname, 'backend', '.env'),
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
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

