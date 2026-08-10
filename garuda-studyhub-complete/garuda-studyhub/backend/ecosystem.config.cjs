// PM2 process config — run with: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'garuda-api',
      script: 'dist/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      max_memory_restart: '300M',
      time: true,
    },
  ],
};
