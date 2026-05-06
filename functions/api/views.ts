export const onRequest: PagesFunction<{ VIEWS: KVNamespace }> = async (context) => {
  const url = new URL(context.request.url);
  const slug = url.searchParams.get('slug');

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const key = `views:${slug}`;
  
  try {
    // 1. 获取当前阅读量
    let views = parseInt(await context.env.VIEWS.get(key) || '0');
    
    // 2. 增加阅读量
    // 注意：这里为了简单直接在 GET 时增加。
    // 如果需要更精确，可以区分 GET 和 POST，或者加一些基本的防刷逻辑（如校验 Referer）
    views++;
    
    // 3. 存回 KV
    await context.env.VIEWS.put(key, views.toString());

    return new Response(JSON.stringify({ views }), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'KV Error', details: e.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
