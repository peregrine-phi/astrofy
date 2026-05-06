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
            `<div class="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-in fade-in duration-700">
              <div class="relative mb-6">
                <div class="absolute -inset-4 bg-error/10 blur-2xl rounded-full opacity-50"></div>
                <div class="relative w-20 h-20 bg-base-200 rounded-3xl flex items-center justify-center border border-base-content/5 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-error/70"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
              </div>
              <h2 class="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/40">
                内容不可见
              </h2>
              <p class="text-base-content/60 max-w-sm leading-relaxed mb-8">
                抱歉，根据相关法律法规及政策，该内容在您所在的地区暂不提供。
              </p>
              <a href="/zh/" class="btn btn-outline btn-sm rounded-xl px-6 border-base-content/10 hover:bg-base-content/5 transition-all">
                返回花园首页
              </a>
            </div>`, 
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

  // 移除内部使用的辅助头，避免暴露给客户端
  newHeaders.delete("X-Block-Region");

  // 返回重建的响应，确保流和头信息正确结合
  return new Response(finalResponse.body, {
    status: finalResponse.status,
    statusText: finalResponse.statusText,
    headers: newHeaders
  });
};