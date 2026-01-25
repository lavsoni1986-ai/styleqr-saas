// PM2 Ecosystem Configuration for StyleQR SaaS
// Place in: /var/www/styleqr/ecosystem.config.js
// Start with: pm2 start ecosystem.config.js
// Save: pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: "styleqr-saas",
      script: "npm",
      args: "start",
      cwd: "/var/www/styleqr",
      instances: "max", // Use all CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/www/styleqr/logs/pm2-error.log",
      out_file: "/var/www/styleqr/logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "1G",
      watch: false,
      max_restarts: 10,
      min_uptime: "10s",
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,
      // Health check
      health_check_grace_period: 3000,
    },
  ],
};
