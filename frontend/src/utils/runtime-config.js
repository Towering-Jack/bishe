/**
 * 地址配置的唯一来源。
 *
 * 有两个前缀需要分别配置，因为服务器上它们由不同的 nginx location 提供：
 *
 *   apiBase   —— 后端接口（Spring Boot 9527）的前缀
 *                例：'/propertyCosApi'  nginx 去掉该前缀后转发给后端
 *   imageBase —— 图片（MinIO 桶）的前缀
 *                例：'/propertyCosImg'   前端再拼 '/imagesWeb/<文件名>'
 *                    即最终为 /propertyCosImg/imagesWeb/xxx.jpg
 *
 * 两者都可以「打完包再改」：dist 目录里的 static/app-config.js 是纯文本文件，
 * 部署到服务器后直接改它，刷新浏览器即生效，不需要重新构建。
 *
 * 取值优先级：
 *   apiBase   : __APP_CONFIG__.apiBase   > 构建期 APP_API_BASE   > '/api'
 *   imageBase : __APP_CONFIG__.imageBase > 构建期 APP_IMAGE_BASE > '/propertyCosImg'
 *
 * 归一化保证前缀带不带首尾斜杠都能得到正确结果。
 */

/* eslint-disable no-undef */
const API_FALLBACK = typeof APP_API_BASE === 'undefined' ? '/api' : APP_API_BASE
const IMAGE_FALLBACK = typeof APP_IMAGE_BASE === 'undefined' ? '/propertyCosImg' : APP_IMAGE_BASE
/* eslint-enable no-undef */

/**
 * 归一化一个前缀。
 * '' 或 '/' 表示「同域根路径」，返回空串，拼接时得到 '/xxx'。
 */
function normalize (value, fallback) {
  let base = value
  if (typeof base !== 'string' || base.trim() === '') {
    base = fallback
  }
  base = String(base || '').trim()

  if (base === '' || base === '/') {
    return ''
  }
  if (/^https?:\/\//i.test(base)) {
    return base.replace(/\/+$/, '')
  }
  // 站内相对路径，如 '/propertyCosApi'
  return '/' + base.replace(/^\/+|\/+$/g, '')
}

/** 安全地读取运行时配置（SSR / 单测环境下 window 可能不存在）。 */
function runtimeConfig () {
  return (typeof window !== 'undefined' && window.__APP_CONFIG__) || {}
}

export const API_BASE = normalize(runtimeConfig().apiBase, API_FALLBACK)
export const IMAGE_BASE = normalize(runtimeConfig().imageBase, IMAGE_FALLBACK)

/**
 * 拼接一个后端路径。
 *
 *   apiUrl('/login')             -> '/propertyCosApi/login'
 *   apiUrl('/imagesWeb/a.jpg')   -> '/propertyCosImg/imagesWeb/a.jpg'
 *        （图片前缀和接口前缀不同，服务器上是两个 location，这里自动分流）
 *   apiUrl('http://x/y')         -> 原样返回（已是绝对地址）
 *   apiUrl(undefined)            -> ''
 */
export function apiUrl (path) {
  if (path === undefined || path === null || path === '') {
    return ''
  }
  const p = String(path)
  if (/^(https?:)?\/\//i.test(p) || p.startsWith('data:') || p.startsWith('blob:')) {
    return p
  }
  const trimmed = p.replace(/^\/+/, '')
  // 图片走 imageBase，其余走 apiBase
  const base = /^imagesWeb\//i.test(trimmed) ? IMAGE_BASE : API_BASE
  return base + '/' + trimmed
}

/**
 * 接口请求用的基址（axios baseURL）。
 * 保持以 '/' 结尾，以兼容 axios 对相对路径的拼接规则。
 */
export const API_REQUEST_BASE = API_BASE + '/'

/**
 * 图片地址前缀，等于 imageBase + '/imagesWeb/'，例如
 *   '/propertyCosImg/imagesWeb/'
 *
 * 模板里直接拼即可：  :src="imagePrefix + item.images.split(',')[0]"
 * 注意不要再套反引号模板字符串（`${...}`），因为在双引号 HTML 属性内部会产生
 * 引号嵌套，把属性提前截断，导致 ${...} 以文本形式显示在页面上。
 */
export const IMAGE_PREFIX = IMAGE_BASE + '/imagesWeb/'

/**
 * 把「数据库里存的图片引用」拼成可访问的地址。
 *
 *   imageUrl('a.jpg')                                  -> '/propertyCosImg/imagesWeb/a.jpg'
 *   imageUrl('http://1.14.170.236:19000/property-cos/a.jpg')
 *                                                      -> '/propertyCosImg/imagesWeb/a.jpg'
 *
 * 之所以要处理第二种，是因为后端 FileController#fileUpload 返回的是**完整 MinIO
 * 地址**，而前端保存时把这个响应直接写进了数据库（images.push(image.response)），
 * 所以库里既可能是纯文件名（早期数据），也可能是完整 URL。
 * 直接拼前缀会把完整 URL 拼坏：
 *   /propertyCosImg/imagesWeb/http://1.14.170.236:19000/property-cos/a.jpg  ← 坏地址
 * 这里统一先取出最后一段文件名再拼，两种历史数据都能正常显示。
 */
export function imageUrl (stored) {
  if (stored === undefined || stored === null || stored === '') {
    return ''
  }
  const s = String(stored).trim()
  if (s.startsWith('data:') || s.startsWith('blob:')) {
    return s
  }
  // 去掉 query/hash 后取最后一段，兼容 MinIO 带签名的 URL
  const withoutQuery = s.split(/[?#]/)[0]
  const fileName = withoutQuery.split('/').filter(Boolean).pop() || ''
  return IMAGE_PREFIX + fileName
}

export default API_BASE
