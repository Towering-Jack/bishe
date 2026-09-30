/**
 * 接口基址（apiBase）的唯一来源。
 *
 * 优先级：
 *   1. 运行时配置  static/app-config.js  →  window.__APP_CONFIG__.apiBase
 *   2. 构建时环境变量  APP_API_BASE      →  经 webpack DefinePlugin 注入
 *   3. 默认值 '/api'（同域，由 nginx 反向代理到后端 9527）
 *
 * 之所以做成运行时读取，是为了「打完包再改地址」：dist 目录里的
 * static/app-config.js 是一个纯文本文件，部署到服务器后直接改它即可，
 * 不需要重新构建。
 *
 * 归一化保证「有前缀」和「没前缀」两种调用方式都能得到正确的地址。
 */

const FALLBACK = typeof APP_API_BASE === 'undefined' ? '/api' : APP_API_BASE

/** 读取运行时配置，兼容 IPv6 主机名与末尾多余的斜杠。 */
function resolveBase () {
  const runtime = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {}
  let base = runtime.apiBase

  if (typeof base !== 'string' || base.trim() === '') {
    base = FALLBACK
  }
  base = String(base || '').trim()

  if (base === '' || base === '/') {
    return ''
  }
  if (/^https?:\/\//i.test(base)) {
    return base.replace(/\/+$/, '')
  }
  // 站内相对路径，如 '/api'
  return '/' + base.replace(/^\/+|\/+$/g, '')
}

export const API_BASE = resolveBase()

/**
 * 把后端路径拼成可访问的完整地址。
 *
 *   apiUrl('/login')                  -> '/api/login' 或 'http://host:9527/login'
 *   apiUrl('imagesWeb/a.jpg')         -> '/api/imagesWeb/a.jpg'
 *   apiUrl('http://other/x.jpg')      -> 原样返回，便于兼容库里已存的绝对地址
 *   apiUrl(undefined)                 -> ''
 */
export function apiUrl (path) {
  if (path === undefined || path === null || path === '') {
    return ''
  }
  const p = String(path)
  if (/^(https?:)?\/\//i.test(p) || p.startsWith('data:') || p.startsWith('blob:')) {
    return p
  }
  return API_BASE + '/' + p.replace(/^\/+/, '')
}

/**
 * 接口请求用的基址。默认走同域 /api，由 nginx 反向代理到后端 9527。
 * 保持以 '/' 结尾，以兼容 axios 的 baseURL 相对路径拼接规则。
 */
export const API_REQUEST_BASE = API_BASE + '/'

/**
 * 把「数据库里存的图片引用」拼成可访问的地址。
 *
 * 之所以单独一个函数，是因为历史数据有两种格式，而页面渲染逻辑是
 *   apiUrl('/imagesWeb/') + stored
 * 直接拼字符串，一旦 stored 本身就是完整 URL 就会拼坏：
 *   /api/imagesWeb/http://1.14.170.236:19000/property-cos/a.jpg   ← 坏地址
 *
 * 后端 FileController#fileUpload 返回的是完整 MinIO 地址
 *   endpoint + '/' + bucket + '/' + fileName
 * 而前端保存时直接把上传响应写进了数据库（images.push(image.response)），
 * 所以库里既可能是完整 URL，也可能是纯文件名（早期数据）。
 *
 * 这里统一处理：完整 URL 先取出最后一段文件名，再交给 apiUrl 拼前缀，
 * 这样两种历史数据都能正常显示，服务器端只需要一处 /imagesWeb/ 映射。
 */
export function imageUrl (stored) {
  if (stored === undefined || stored === null || stored === '') {
    return ''
  }
  const s = String(stored).trim()
  if (s.startsWith('data:') || s.startsWith('blob:')) {
    return s
  }
  // 去掉 query/hash 后再取最后一段，兼容 MinIO 带签名的 URL
  const withoutQuery = s.split(/[?#]/)[0]
  const fileName = withoutQuery.split('/').filter(Boolean).pop() || ''
  return apiUrl('imagesWeb/' + fileName)
}

export default API_BASE
