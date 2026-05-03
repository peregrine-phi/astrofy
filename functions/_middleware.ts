export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const { pathname, origin } = url;

  // 1. 获取响应
  const response = await context.next();
  
  // 2. 仅对 HTML 进行处理
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  // 3. 获取地理位置
  const country = context.request.cf?.country;

  // 4. 核心逻辑：仅针对 CN 用户进行拦截和重定向
  if (country === 'CN') {
    // 首页重定向
    if (pathname === '/') {
      return Response.redirect(new URL('/zh/', origin), 302);
    }

    // HTML 内容改写
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

    return rewriter.transform(response);
  }

  // 非 CN 用户或非 HTML 资源，直接返回原响应
  return response;
};
