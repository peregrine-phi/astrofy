export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  
  // 仅处理 HTML 页面
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  // 获取地理位置信息 (Cloudflare Pages 原生提供)
  const country = context.request.cf?.country;

  // 如果是中国大陆用户，进行边缘侧内容清理
  if (country === 'CN') {
    // 智能重定向：如果是访问英文首页，自动跳转到中文首页
    const url = new URL(context.request.url);
    if (url.pathname === '/') {
      return Response.redirect(new URL('/zh/', url.origin), 302);
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

  // 即使是非 CN 用户也注入安全头
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  return response;
};
