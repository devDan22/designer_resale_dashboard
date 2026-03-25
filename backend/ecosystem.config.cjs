module.exports = {
  apps: [
    {
      name: 'resale-backend-prod',
      script: 'dist/index.js',
      cwd: '/app/resale-dashboard/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'resale-backend-dev',
      script: 'dist/index.js',
      cwd: '/app/resale-dashboard-dev/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};
