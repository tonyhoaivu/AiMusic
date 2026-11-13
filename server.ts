import express from 'express';
import path from 'path';
import fs from 'fs';
import app from './src/server/app.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  const runningBuiltBundle = process.argv[1]?.endsWith('server.js') || process.env.NODE_ENV === 'production';
  const distExists = fs.existsSync(path.resolve('./dist/index.html'));
  const isDev = process.env.NODE_ENV === 'development' || (!runningBuiltBundle && !distExists);

  if (isDev) {
    const vite = await import('vite');
    const viteDevServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(viteDevServer.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve('./index.html'), 'utf-8');
        template = await viteDevServer.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        viteDevServer.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve('./dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`AI MUSIC STUDIO Server listening on port ${PORT} (${isDev ? 'DEV' : 'PRODUCTION'})`);
  });
}

startServer();
