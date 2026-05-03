export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;
  const origin = url.origin;
  const search = url.search;

  // 1. 基础重定向：统一补全末尾斜杠
  if (pathname === '/zh') {
    return Response.redirect(new URL('/zh/' + search, origin), 301);
  }

  // 2. 静态资源“绝对放行”
  // 匹配特定后缀，或者直接匹配 Astro 的专属静态目录
  // 增加对 .xml, .txt 等常见静态文件的放行
  const isStaticAsset = /\.(css|js|png|jpg|jpeg|webp|gif|svg|ico|woff|woff2|xml|txt)$/i.test(pathname);
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
  }

  // 6. 全局安全加固与响应优化
  // 我们创建一个新的 Headers 对象来修改响应头
  const newHeaders = new Headers(finalResponse.headers);
  
  // 注入安全头
  newHeaders.set("X-Content-Type-Options", "nosniff");
  newHeaders.set("X-Frame-Options", "SAMEORIGIN");
  newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 关键点：安卓设备在开启 nosniff 后，如果 Content-Type 缺少 charset，
  // 可能会导致解析器在遇到非 ASCII 字符时报错或放弃加载后续资源（如样式）。
  if (!contentType.includes("charset")) {
    newHeaders.set("content-type", "text/html; charset=UTF-8");
  }

  // 如果进行了 HTML 重写，原始的 Content-Length 就不再准确了
  if (country === 'CN') {
    newHeaders.delete("Content-Length");
  }

  // 返回重建的响应，确保流和头信息正确结合
  return new Response(finalResponse.body, {
    status: finalResponse.status,
    statusText: finalResponse.statusText,
    headers: newHeaders
  });
};