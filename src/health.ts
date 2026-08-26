type HealthServer = ReturnType<typeof Bun.serve>;

/**
 * Hosting platforms expect an open port and a health endpoint.
 * The bot itself uses long polling, so this server exists only to keep
 * the deployment alive and to answer health checks.
 */
export function startHealthServer(): HealthServer | null {
  const port = Number(Bun.env.PORT);
  if (!Number.isInteger(port) || port <= 0) return null;

  const startedAt = new Date().toISOString();

  const server = Bun.serve({
    port,
    fetch: () =>
      Response.json({ status: "ok", startedAt, uptimeSeconds: Math.round(process.uptime()) }),
  });

  console.log(`Health server listening on port ${server.port}`);

  return server;
}
