import { buildApp } from './app.js';
const app = buildApp();
const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
    console.log(`🚀 GURLZ Express Backend running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
});
