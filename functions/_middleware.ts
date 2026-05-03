export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const { pathname, origin } = url;

  // 1. SEO 优化：URL 规范化 (URL Normalization)
  // 强制小写并移除 index.html 结尾，避免重复内容惩罚
  if (pathname.includes("index.html") || pathname !== pathname.toLowerCase()) {
    const normalizedPath = pathname.replace("index.html", "").toLowerCase();
    return Response.redirect(new URL(normalizedPath, origin), 301);
  }

  const response = await context.next();
  
  // 2. 性能优化：Early Hints (预加载关键资源)
  // 告诉浏览器在解析 HTML 前先下载 CSS
  response.headers.append("Link", "</index.css>; rel=preload; as=style");

  // 仅处理 HTML 页面
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  // 获取地理位置信息
  const country = context.request.cf?.country;

  // 如果是中国大陆用户，进行内容清理
  if (country === 'CN') {
    // 3. 智能重定向：如果是访问英文首页，自动跳转到中文首页
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
    newResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
    return newResponse;
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  return response;
};

