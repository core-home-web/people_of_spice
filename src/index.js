// Cloudflare Worker to serve static files for People of Spice website
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let pathname = url.pathname;
    
    // Handle root path
    if (pathname === '/') {
      pathname = '/index.html';
    }
    
    // Handle file extensions
    if (!pathname.includes('.')) {
      pathname += '.html';
    }
    
    // Try to fetch the file from the static assets
    try {
      // For now, we'll return a simple response
      // In a real deployment, you'd need to bundle your static files
      // or use a different approach to serve them
      
      if (pathname === '/index.html' || pathname === '/') {
        return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>People of Spice - Coming Soon</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #d2691e; }
        p { color: #666; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌶️ People of Spice</h1>
        <p>Your website is being deployed to Cloudflare Workers!</p>
        <p>This is a placeholder while we set up the full static file serving.</p>
        <p>Check back soon for the complete culinary experience!</p>
    </div>
</body>
</html>
        `, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
      
      // For other paths, return 404
      return new Response('File not found', { status: 404 });
      
    } catch (error) {
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
