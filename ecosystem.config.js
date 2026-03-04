module.exports = {
  apps: [
    {
      name: 'hosthaven-backend',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // Logging
      error_file: '/var/log/hosthaven/error.log',
      out_file: '/var/log/hosthaven/out.log',
      log_file: '/var/log/hosthaven/combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
};
