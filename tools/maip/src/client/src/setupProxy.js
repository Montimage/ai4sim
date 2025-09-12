const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Configuration pour permettre l'embedding en iframe
  app.use((req, res, next) => {
    // Permettre l'embedding en iframe
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', 'frame-ancestors *');
    
    // CORS headers pour l'iframe
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    next();
  });
  
  // Proxy vers le serveur MAIP
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:31057',
      changeOrigin: true,
      secure: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'X-Frame-Options': 'ALLOWALL'
      }
    })
  );
};
