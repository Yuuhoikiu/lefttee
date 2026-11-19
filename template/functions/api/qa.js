const PREFIX = 'qa:q:';
const VID_COOKIE = 'qa_vid';
const MAX_QUESTION = 500;
const MAX_NAME = 30;
const MAX_ANSWER = 2000;
const ID_PATTERN = /^[A-Za-z0-9:_-]{1,80}$/;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers
    }
  });
}

function parseCookies(request) {
  const out = {};
  const raw = request.headers.get('Cookie') || '';
  raw.split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index < 0) return;
    const key = part.slice(0, index).trim();
    if (!key) return;
    try {
      out[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch (err) {
      out[key] = part.slice(index + 1).trim();
    }
  });
  return out;
}

function cookieHeader(vid, request) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${VID_COOKIE}=${encodeURIComponent(vid)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}`;
}

function visitor(request, create = false) {
  const vid = parseCookies(request)[VID_COOKIE];
  if (vid && /^[0-9a-fA-F-]{36}$/.test(vid)) {
    return { vid, setCookie: '' };
  }
  if (!create) return { vid: '', setCookie: '' };
  const fresh = crypto.randomUUID();
  return { vid: fresh, setCookie: cookieHeader(fresh, request) };
}

function shanghaiDay() {
  const now = Date.now();
  const shifted = new Date(now + 8 * 3600 * 1000);
  const day = shifted.toISOString().slice(0, 10);
  const nextUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1
  ) - 8 * 3600 * 1000;
  return { day, ttl: Math.max(60, Math.ceil((nextUtc - now) / 1000)) };
}

async function loadQuestions(env) {
  const listed = await env.COUNTERS.list({ prefix: PREFIX, limit: 1000 });
  const values = await Promise.all(
    listed.keys.map(async (key) => {
      const raw = await env.COUNTERS.get(key.name);
      try {
        return JSON.parse(raw);
      } catch (err) {
        return null;
      }
    })
  );
  return values
    .filter((item) => item && item.id && item.question)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function publicView(question, vid) {
  const answered = Boolean(question.answer);
  const own = Boolean(vid && question.vid === vid);
  if (!answered && !own) return null;
  return {
    id: question.id,
    name: question.name || '匿名',
    question: question.question,
    createdAt: question.createdAt || '',
    answer: answered ? question.answer : '',
    answeredAt: question.answeredAt || '',
    likes: Number(question.likes) || 0,
    pending: !answered
  };
}

function adminView(question) {
  return {
    id: question.id,
    name: question.name || '匿名',
    question: question.question,
    createdAt: question.createdAt || '',
    answer: question.answer || '',
    answeredAt: question.answeredAt || '',
    likes: Number(question.likes) || 0,
    pending: !question.answer
  };
}

async function canAsk(env, vid) {
  if (!vid) return true;
  const { day } = shanghaiDay();
  return !(await env.COUNTERS.get(`qa:limit:${vid}:${day}`));
}

function checkAdmin(request, env) {
  const expected = env.QA_ADMIN_TOKEN;
  if (!expected) return { ok: false, status: 500, error: 'QA_ADMIN_TOKEN 未配置' };
  const provided = request.headers.get('x-qa-token')
    || (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (provided !== expected) return { ok: false, status: 403, error: '管理令牌不正确' };
  return { ok: true };
}

async function ask(body, request, env) {
  const question = String(body.question || '').replace(/\s+/g, ' ').trim();
  if (question.length < 2 || question.length > MAX_QUESTION) {
    return json({ error: `问题长度需在 2–${MAX_QUESTION} 字之间` }, 400);
  }
  const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) || '匿名';
  const { vid, setCookie } = visitor(request, true);
  const { day, ttl } = shanghaiDay();
  const limitKey = `qa:limit:${vid}:${day}`;
  if (await env.COUNTERS.get(limitKey)) {
    return json(
      { error: '今天已经提过问题了，明天再来。', canAsk: false },
      429,
      setCookie ? { 'Set-Cookie': setCookie } : {}
    );
  }
  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const item = {
    id,
    vid,
    name,
    question,
    createdAt: new Date().toISOString(),
    answer: '',
    answeredAt: '',
    likes: 0
  };
  await env.COUNTERS.put(PREFIX + id, JSON.stringify(item));
  await env.COUNTERS.put(limitKey, '1', { expirationTtl: ttl });
  return json(
    { ok: true, question: publicView(item, vid), canAsk: false },
    200,
    setCookie ? { 'Set-Cookie': setCookie } : {}
  );
}

async function like(body, request, env) {
  const id = String(body.id || '').trim();
  if (!ID_PATTERN.test(id)) return json({ error: '问题不存在' }, 404);
  const raw = await env.COUNTERS.get(PREFIX + id);
  if (!raw) return json({ error: '问题不存在' }, 404);
  let item;
  try {
    item = JSON.parse(raw);
  } catch (err) {
    return json({ error: '问题数据损坏' }, 500);
  }
  if (!item.answer) return json({ error: '回答后才能点赞' }, 400);

  const { vid, setCookie } = visitor(request, true);
  const likeKey = `qa:like:${id}:${vid}`;
  if (await env.COUNTERS.get(likeKey)) {
    return json(
      { error: '已经点过赞了', likes: Number(item.likes) || 0 },
      409,
      setCookie ? { 'Set-Cookie': setCookie } : {}
    );
  }
  item.likes = (Number(item.likes) || 0) + 1;
  await env.COUNTERS.put(PREFIX + id, JSON.stringify(item));
  await env.COUNTERS.put(likeKey, '1');
  return json(
    { ok: true, likes: item.likes },
    200,
    setCookie ? { 'Set-Cookie': setCookie } : {}
  );
}

async function answer(body, request, env) {
  const auth = checkAdmin(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const id = String(body.id || '').trim();
  if (!ID_PATTERN.test(id)) return json({ error: '问题不存在' }, 404);
  const text = String(body.answer || '').trim();
  if (text.length < 1 || text.length > MAX_ANSWER) {
    return json({ error: `回答长度需在 1–${MAX_ANSWER} 字之间` }, 400);
  }

  const raw = await env.COUNTERS.get(PREFIX + id);
  if (!raw) return json({ error: '问题不存在' }, 404);
  let item;
  try {
    item = JSON.parse(raw);
  } catch (err) {
    return json({ error: '问题数据损坏' }, 500);
  }
  item.answer = text;
  item.answeredAt = new Date().toISOString();
  await env.COUNTERS.put(PREFIX + id, JSON.stringify(item));
  return json({ ok: true, question: adminView(item) });
}

async function remove(body, request, env) {
  const auth = checkAdmin(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const id = String(body.id || '').trim();
  if (!ID_PATTERN.test(id)) return json({ error: '问题不存在' }, 404);
  const raw = await env.COUNTERS.get(PREFIX + id);
  if (!raw) return json({ error: '问题不存在' }, 404);

  await env.COUNTERS.delete(PREFIX + id);
  const likes = await env.COUNTERS.list({ prefix: `qa:like:${id}:`, limit: 1000 });
  await Promise.all(likes.keys.map((key) => env.COUNTERS.delete(key.name)));
  return json({ ok: true, deleted: id });
}

export async function onRequestGet({ request, env }) {
  if (!env.COUNTERS) return json({ error: 'binding missing' }, 500);

  const url = new URL(request.url);
  if (url.searchParams.get('admin') === '1') {
    const auth = checkAdmin(request, env);
    if (!auth.ok) return json({ error: auth.error }, auth.status);
    const questions = await loadQuestions(env);
    const views = questions.map(adminView);
    return json({
      ok: true,
      questions: views,
      pending: views.filter((item) => item.pending).length
    });
  }

  const { vid } = visitor(request, false);
  const questions = await loadQuestions(env);
  return json({
    ok: true,
    questions: questions.map((item) => publicView(item, vid)).filter(Boolean),
    canAsk: await canAsk(env, vid)
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.COUNTERS) return json({ error: 'binding missing' }, 500);

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json({ error: '请求格式错误' }, 400);
  }

  const action = body && body.action;
  if (action === 'ask') return ask(body, request, env);
  if (action === 'like') return like(body, request, env);
  if (action === 'answer') return answer(body, request, env);
  if (action === 'delete') return remove(body, request, env);
  return json({ error: '未知操作' }, 400);
}
