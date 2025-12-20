module.exports = {
  apps: [
    {
      name: 'yieldvault',
      script: 'npx',
      args: 'vite --host 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      // Auto restart on failure
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000
    }
  ]
}
