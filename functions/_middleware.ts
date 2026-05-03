export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const { pathname, origin } = url;

  // 1. 基础重定向
  if (pathname === '/zh') {
    return Response.redirect(new URL('/zh/', origin), 301);
  }

  const response = await context.next();

  // 2. 只有在确定是 CN 且是 HTML 时才进行复杂处理
  const contentType = response.headers.get("content-type");
  const country = context.request.cf?.country;

  if (country === 'CN' && contentType?.includes("text/html")) {
    if (pathname === '/') {
      return Response.redirect(new URL('/zh/', origin), 302);
    }

    // 暂时注释掉 HTMLRewriter 逻辑，看看样式是否恢复
    /*
    const rewriter = new HTMLRewriter()
      .on('[data-block-region="CN"]', { element(e) { e.remove(); } });
    return rewriter.transform(response);
    */
  }

  return response;
};