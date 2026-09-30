/**
 * ============================================================================
 *  部署配置 —— 改这个文件即可切换地址，保存后 Ctrl+F5 生效，无需重新打包
 * ============================================================================
 *  当前值对应服务器 property.qqiukulele.cn 的 nginx 配置：
 *    /propertyCosApi/  -> 后端 127.0.0.1:9527
 *    /propertyCosImg/  -> MinIO 129.204.58.109:19000/property-cos
 *
 *  注意：这里的 imageBase 只是「前端请求的前缀」，真正连哪台 MinIO 由
 *  nginx 的 proxy_pass 决定。换服务器时两处都要改，否则 nginx 会一直转发到
 *  旧地址并等待超时（图片一直转圈），而 MinIO 本身是好的。
 *
 *  两个前缀分开配置，因为服务器上它们是两个不同的 location。
 *  详细说明与排查步骤见 docs/deploy.md
 */
window.__APP_CONFIG__ = {
  // 后端接口前缀。前端最终请求 /propertyCosApi/xxx，
  // nginx 去掉该前缀后转发给后端，所以后端不需要做任何适配。
  apiBase: '/propertyCosApi',

  // 图片前缀。前端最终请求 /propertyCosImg/imagesWeb/<文件名>，
  // nginx 转到 MinIO 的 property-cos 桶。
  imageBase: '/propertyCosImg'
}
