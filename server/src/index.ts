import http from 'http';
import mongoose from 'mongoose';
import { getEnv } from './config/env';
import { connectDB } from './config/db';
import { createApp } from './app';
import { attachSyncServer, SyncHandle } from './sync/syncServer';
import { createSyncDeps } from './sync/deps';

async function start(): Promise<void> {
  const env = getEnv(); // stops here if .env is wrong
  await connectDB(env.mongoUri);

  let sync: SyncHandle | null = null;

  // the rest api tells the sync engine when something important happens
  const app = createApp({
    onDocumentDeleted: (docId) => sync?.evictRoom(docId),
    onAccessRevoked: (docId, userId) => sync?.kickUser(docId, userId),
    flushDocument: async (docId) => {
      if (sync) await sync.flushRoom(docId);
    },
  });

  // express and websocket share the same http server / port
  const server = http.createServer(app);
  sync = attachSyncServer(server, createSyncDeps(), { allowedOrigins: env.clientOrigins });

  server.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });

  // when the server stops, save all the live documents first
  const shutdown = async (): Promise<void> => {
    console.log('Shutting down, saving documents...');
    server.close();
    await sync?.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

start().catch((err) => {
  console.error('Could not start server:', err.message);
  process.exit(1);
});
