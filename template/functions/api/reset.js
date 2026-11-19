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

export async function onRequestPost({ request, env }) {
  if (!env.COUNTERS) return json({ error: 'binding missing' }, 500);

  const expected = env.RESET_TOKEN;
  if (!expected) return json({ error: 'reset token not configured' }, 500);

  const url = new URL(request.url);
  const provided = url.searchParams.get('token') || request.headers.get('x-reset-token') || '';
  if (provided !== expected) return json({ error: 'forbidden' }, 403);

  // 带 key 参数时只清指定键；不带时清空全部
  if (url.searchParams.has('key')) {
    const key = url.searchParams.get('key') || '';
    if (!KEY_PATTERN.test(key)) return json({ error: 'invalid key' }, 400);
    await env.COUNTERS.delete(key);
    return json({ deleted: [key], count: 1 });
  }

  const deleted = [];
  let cursor;
  do {
    const page = await env.COUNTERS.list({ cursor });
    for (const item of page.keys) {
      // 问答数据与访问计数共用 KV，清空计数时保留问答。
      if (item.name.startsWith('qa:')) continue;
      await env.COUNTERS.delete(item.name);
      deleted.push(item.name);
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);

  return json({ deleted, count: deleted.length });
}
