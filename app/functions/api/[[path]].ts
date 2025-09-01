// Proxies /api/* to your existing backend at https://2eatapp.com/api/*
export const onRequest: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);                 // https://<pages-host>/api/...
  const upstreamPath = url.pathname.replace(/^\/api/, ""); // keep the rest after /api
  const upstream = `https://2eatapp.com/api${upstreamPath}${url.search}`;

  const init: RequestInit = {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
  };

  const resp = await fetch(upstream, init);
  return new Response(resp.body, { status: resp.status, headers: resp.headers });
};
