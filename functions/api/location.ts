export const onRequest: PagesFunction = async (context) => {
  const cf = context.request.cf;
  
  // 提取地理位置信息
  const data = {
    city: cf?.city || "Unknown",
    region: cf?.region || "Unknown",
    country: cf?.country || "Unknown",
    latitude: cf?.latitude || "31.23", // 默认上海
    longitude: cf?.longitude || "121.47",
    timezone: cf?.timezone || "Asia/Shanghai"
  };

  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "Cache-Control": "public, max-age=3600" // 缓存 1 小时，IP 地理位置不会频繁变动
    }
  });
};
