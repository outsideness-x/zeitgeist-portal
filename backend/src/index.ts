import { buildServer } from './server.js';
import { getEnv } from './config/env.js';

const start = async () => {
  const env = getEnv();
  const app = buildServer();

  try {
    await app.listen({
      host: env.BACKEND_HOST,
      port: env.BACKEND_PORT,
    });
  } catch (error) {
    app.log.error(error, 'failed to start backend server');
    process.exit(1);
  }
};

void start();
