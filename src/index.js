// Cloudflare Worker to serve static files for People of Spice website
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let pathname = url.pathname;
    
    // Handle root path
    if (pathname === '/') {
      pathname = '/index.html';
    }
    
    // Handle file extensions for HTML files
    if (!pathname.includes('.') && !pathname.endsWith('/')) {
      pathname += '.html';
    }
    
    // Remove leading slash for file lookup
    const filePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    
    try {
      // For now, return a comprehensive placeholder that shows the site structure
      // In production, you would integrate with R2 storage or another static file service
      
      if (filePath === 'index.html' || filePath === '') {
        // Fetch the real index.html from GitHub
        try {
          const githubUrl = 'https://raw.githubusercontent.com/core-home-web/people_of_spice/main/index.html';
          const response = await fetch(githubUrl);
          if (response.ok) {
            const html = await response.text();
            return new Response(html, {
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=3600',
                'X-Content-Type-Options': 'nosniff'
              }
            });
          }
        } catch (error) {
          console.log('Failed to fetch from GitHub, serving fallback');
        }
        
        // Fallback to a simple page with a link to the Pages site
        return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>People of Spice - Redirecting...</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Arial', sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 60px 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
        }
        .logo { font-size: 3em; margin-bottom: 20px; }
        h1 { color: #d2691e; margin-bottom: 30px; font-size: 2.5em; }
        .redirect-link {
            display: inline-block;
            background: #d2691e;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            margin-top: 20px;
            transition: background 0.3s;
        }
        .redirect-link:hover {
            background: #b8571a;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🌶️</div>
        <h1>People of Spice</h1>
        <p>Your website is being served by Cloudflare Worker.</p>
        <p>For the full website experience, visit:</p>
        <a href="https://people-of-spice.pages.dev" class="redirect-link">
            View Full Website →
        </a>
    </div>
    <script>
        // Auto-redirect after 3 seconds
        setTimeout(() => {
            window.location.href = 'https://people-of-spice.pages.dev';
        }, 3000);
    </script>
</body>
</html>
        `, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff'
          }
        });
      }
      
      // Handle other common pages
      const commonPages = ['about', 'shop', 'recipes', 'contact-us', 'videos', 'world-of-spice'];
      const pageName = filePath.replace('.html', '');
      
      if (commonPages.includes(pageName)) {
        return new Response(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageName.charAt(0).toUpperCase() + pageName.slice(1)} - People of Spice</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
        h1 { color: #d2691e; }
        .back-link { color: #666; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌶️ ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</h1>
        <p>This page is being served by your Cloudflare Worker!</p>
        <p><a href="/" class="back-link">← Back to Home</a></p>
    </div>
</body>
</html>
        `, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
      
      // For other requests, return 404
      return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>404 - Page Not Found</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; }
        h1 { color: #d2691e; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌶️ 404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <p><a href="/">← Back to Home</a></p>
    </div>
</body>
</html>
      `, {
        status: 404,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
      
    } catch (error) {
      return new Response('Internal Server Error', { 
        status: 500,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
  }
};
