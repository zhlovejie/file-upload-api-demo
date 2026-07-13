const app = require('../src/app');

module.exports = async function handler(req, res) {
  try {
    await app.initializeRuntime({ startCleanupJob: false });
    return app(req, res);
  } catch (error) {
    console.error('Vercel function failed to initialize', error);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          message: 'Upload service failed to initialize.',
          error: {
            code: 500,
            details: null,
          },
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }
};
