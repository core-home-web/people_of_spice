// Read-only image CDN in front of R2. Objects are immutable (new photo = new key), so
// responses are cached for a year at the edge and in browsers.
const CACHE = "public, max-age=31536000, immutable";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key || key.includes("..")) return new Response("Not found", { status: 404 });

    const cache = caches.default;
    const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });
    let res = await cache.match(cacheKey);
    if (!res) {
      const obj = await env.MEDIA.get(key);
      if (!obj) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("ETag", obj.httpEtag);
      headers.set("Cache-Control", CACHE);
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Timing-Allow-Origin", "*");
      headers.set("X-Content-Type-Options", "nosniff");
      res = new Response(obj.body, { headers });
      ctx.waitUntil(cache.put(cacheKey, res.clone()));
    }
    if (request.headers.get("If-None-Match") === res.headers.get("ETag")) {
      return new Response(null, { status: 304, headers: res.headers });
    }
    return request.method === "HEAD" ? new Response(null, { headers: res.headers }) : res;
  },
};
