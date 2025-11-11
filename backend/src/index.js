import Hapi from '@hapi/hapi';
import dotenv from 'dotenv';
import { authPlugin } from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import entriesRoutes from './routes/entries.js';
import messagesRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import progressRoutes from './routes/progress.js';

dotenv.config();

const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT || 3001,
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
        credentials: true,
      },
    },
  });

  // Register plugins
  await server.register(authPlugin);

  // Register routes
  server.route(authRoutes);
  server.route(entriesRoutes);
  server.route(messagesRoutes);
  server.route(adminRoutes);
  server.route(progressRoutes);

  // Health check route
  server.route({
    method: 'GET',
    path: '/health',
    options: {
      auth: false,
    },
    handler: () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    },
  });

  await server.start();
  console.log(`Server running on ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
