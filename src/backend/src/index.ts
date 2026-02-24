// ============================================
// Server Entry Point
// ============================================

import { serve } from '@hono/node-server';
import { env } from './lib/config';
import app from './routes';

const port = env.PORT;

console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   📰 Political News Assistant API                      ║
║                                                       ║
║   Server starting on port ${port}...                      ║
║   Environment: ${env.NODE_ENV}                            ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server is running on http://localhost:${port}`);
console.log(`📚 API docs: http://localhost:${port}/api/v1`);
