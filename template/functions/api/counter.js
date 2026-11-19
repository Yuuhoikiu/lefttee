const KEY_PATTERN = /^[A-Za-z0-9:_-]{1,80}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function readKey(request) {
  const key = new URL(request.url).searchParams.get('key') || '';
  if (key.startsWith('qa:')) return null;
  return KEY_PATTERN.test(key) ? key : null;
}

export async function onRequestGet({ request, env }) {
  const key = readKey(request);
  if (!key) return json({ error: 'invalid key' }, 400);
  if (!env.COUNTERS) return json({ error: 'binding missing' }, 500);

  const value = Number(await env.COUNTERS.get(key)) || 0;
  return json({ count: value });
}

export async function onRequestPost({ request, env }) {
  const key = readKey(request);
  if (!key) return json({ error: 'invalid key' }, 400);
  if (!env.COUNTERS) return json({ error: 'binding missing' }, 500);

  const current = Number(await env.COUNTERS.get(key)) || 0;
  const next = current + 1;
  await env.COUNTERS.put(key, String(next));
  return json({ count: next });
}
