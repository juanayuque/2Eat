// functions/api/[[path]].js
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url); ß
  const upstreamPath = url.pathname.replace(/^\/api/, "");
  const upstreamUrl = `https://2eatapp.com/api${upstreamPath}${url.search}`;

  const init = {
    method: request.method,
    headers: request.headers,
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const resp = await fetch(upstreamUrl, init);
  return new Response(resp.body, { status: resp.status, headers: resp.headers });
}
