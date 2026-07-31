import { buildApp } from './app.js';

// Start standalone server locally
const start = async () => {
  try {
    const fastify = await buildApp();
    const port = Number(process.env.PORT) || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 GURLZ Backend running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
