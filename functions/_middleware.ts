export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const origin = url.origin;

  // 1. 基础重定向（处理末尾斜杠）
  if (pathname === '/zh') {
    return Response.redirect(new URL('/zh/', origin), 301);
  }

  // 2. 静态资源“绝对放行”
  // 如果是 CSS, JS, 图片等，直接跳过所有逻辑，不请求 next() 之后的处理
  const isStaticAsset = /\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|woff|woff2)$/i.test(pathname);
  if (isStaticAsset) {
    return context.next();
  }

  const response = await context.next();

  // 3. 仅处理 200 OK 的 HTML 响应
  // 避开 304 Not Modified，防止缓存失效导致的样式掉落
  const contentType = response.headers.get("content-type") || "";
  if (response.status !== 200 || !contentType.includes("text/html")) {
    return response;
  }

  // 4. 获取地理位置
  const country = context.request.cf?.country;

  // 5. 核心逻辑：CN 用户处理
  if (country === 'CN') {
    if (pathname === '/') {
      return Response.redirect(new URL('/zh/', origin), 302);
    }

    // @ts-ignore
    const rewriter = new HTMLRewriter()
      .on('[data-block-region="CN"]', {
        element(element) {
          element.remove();
        },
      })
      .on('main[data-block-region="CN"]', {
        element(element) {
          element.setInnerContent(
            '<div class="p-10 text-center"><h2 class="text-2xl font-bold mb-4">内容不可见</h2><p>根据相关法律法规，该内容在您所在的地区不可见。</p></div>', 
            { html: true }
          );
        }
      });

    const newResponse = rewriter.transform(response);
    newResponse.headers.set("X-Content-Type-Options", "nosniff");
    return newResponse;
  }

  return response;
};