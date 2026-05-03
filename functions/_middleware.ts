export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const { pathname, origin } = url;

  // 1. 基础重定向：统一补全末尾斜杠
  if (pathname === '/zh') {
    return Response.redirect(new URL('/zh/', origin), 301);
  }

  // 2. 获取响应
  const response = await context.next();

  // 3. 严格过滤：非 HTML 资源（CSS/JS/图片）直接返回，不做任何处理
  // 这样能确保手机端加载静态资源时 100% 原始、无损
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  // 4. 获取地理位置
  const country = context.request.cf?.country;

  // 5. 核心逻辑：CN 用户处理
  if (country === 'CN') {
    // 首页重定向
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
    // 注入安全头
    newResponse.headers.set("X-Content-Type-Options", "nosniff");
    newResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
    return newResponse;
  }

  return response;
};