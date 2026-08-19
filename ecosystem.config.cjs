module.exports = {
  apps: [
    {
      name: "komplain",
      cwd: "/www/wwwroot/komplain",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "server.ts",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
    },
  ],
};
