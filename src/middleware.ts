import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  
  // 仅处理 HTML 页面
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    return response;
  }

  // 获取地理位置信息 (Cloudflare 提供的标头)
  const country = context.locals.runtime?.cf?.country || context.request.headers.get('cf-ipcountry');

  // 如果是中国大陆用户，且当前环境支持 HTMLRewriter (Cloudflare 环境)
  if (country === 'CN' && typeof HTMLRewriter !== 'undefined') {
    // @ts-ignore
    const rewriter = new HTMLRewriter()
      // 1. 删除所有标记为 CN 屏蔽的元素（包括文章卡片和对应的分界线容器）
      .on('[data-block-region="CN"]', {
        element(element) {
          element.remove();
        },
      })
      // 2. 特殊处理：如果是详情页且文章本身被屏蔽，直接重定向或显示 404
      // 我们可以通过检查 body 上的属性来判断
      .on('main[data-block-region="CN"]', {
        element(element) {
            // 这里我们不直接 remove，而是可以改成一个友好的提示或者直接让页面渲染失败
            element.setInnerContent('<div class="p-10 text-center">根据相关法律法规，该内容在您所在的地区不可见。</div>', { html: true });
        }
      });

    return rewriter.transform(response);
  }

  return response;
});
