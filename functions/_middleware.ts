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
    // @ts-ignore - HTMLRewriter 是 Cloudflare Pages 的原生全局变量
    const rewriter = new HTMLRewriter()
      // 1. 删除所有标记为 CN 屏蔽的元素
      .on('[data-block-region="CN"]', {
        element(element) {
          element.remove();
        },
      })
      // 2. 详情页特殊处理
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

  return response;
};
