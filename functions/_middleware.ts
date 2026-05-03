export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const origin = url.origin;
  const search = url.search; // 保留可能的查询参数如 ?ref=twitter

  // 1. 基础重定向：统一补全末尾斜杠
  if (pathname === '/zh') {
    return Response.redirect(new URL('/zh/' + search, origin), 301);
  }

  // 2. 静态资源“绝对放行”
  // 匹配特定后缀，或者直接匹配 Astro 的专属静态目录
  const isStaticAsset = /\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|woff|woff2)$/i.test(pathname);
  if (isStaticAsset || pathname.startsWith('/_astro/')) {
    return context.next();
  }

  const response = await context.next();

  // 3. 仅处理 200 OK 的 HTML 响应
  const contentType = response.headers.get("content-type") || "";
  if (response.status !== 200 || !contentType.includes("text/html")) {
    return response;
  }

  // 4. 获取地理位置
  const country = context.request.cf?.country;
  let finalResponse = response;

  // 5. 核心逻辑：CN 用户处理
  if (country === 'CN') {
    // 首页重定向
    if (pathname === '/') {
      return Response.redirect(new URL('/zh/' + search, origin), 302);
    }

    // @ts-ignore - HTMLRewriter 边缘运行时原生支持
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

    finalResponse = rewriter.transform(response);
  } else {
    // 如果是非 CN 用户，我们需要克隆响应才能修改其 Header
    finalResponse = new Response(response.body, response);
  }

  // 6. 全局安全加固：为所有 HTML 页面注入安全头
  finalResponse.headers.set("X-Content-Type-Options", "nosniff");
  finalResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
  finalResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return finalResponse;
};