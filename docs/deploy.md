# 前端部署说明（前后端分离）

本文对应「前端打包成一个 html 文件夹，直接拖到云服务器」这种部署方式。

---

## 1. 要上传的东西

执行构建：

```bash
cd frontend
npm install --ignore-scripts
npm run build
```

产物就是 **`frontend/dist/` 这个文件夹**（307 个文件，约 9.9 MB）。
把它里面的**全部内容**（不是 dist 这一层目录）上传到服务器的网站根目录，例如
`/usr/share/nginx/bishe/`。

上传后服务器上的结构：

```
/usr/share/nginx/bishe/
├── index.html
└── static/
    ├── app-config.js          ← 部署配置（改这里就能换后端地址）
    ├── js/                    ← 打包后的 js（含 gzip 版本）
    ├── css/
    ├── img/  avatar/  file/  less/
    └── utils/spreadJS/        ← 报表控件（index.html 直接引用）
```

> 构建已关闭 sourcemap，所以**没有 `.map` 文件**：部署目录是公开的，带 sourcemap
> 等于把 127 个 `.vue` 源码全部公开。

---

## 2. 为什么必须改接口地址

原代码把后端地址**硬编码**成 `http://127.0.0.1:9527/`，一共 45 处，包括：

| 用途 | 处数 | 说明 |
| --- | --- | --- |
| axios 接口 baseURL | 1 | 所有 API 请求 |
| 上传组件 `action` | 17 | 图片/文件上传 |
| 图片显示地址 | 27 | `/imagesWeb/<文件名>` |

不改的话，浏览器会去请求**访问者自己的电脑**（`127.0.0.1`），必然全部失败。

现在这些地址统一由 **`static/app-config.js`** 控制：

```js
window.__APP_CONFIG__ = {
  apiBase: '/api'
}
```

**这是运行时配置**：改完刷新浏览器即可生效，不需要重新构建。

---

## 3. nginx 配置（推荐方案）

配套文件：**`deploy/nginx-bishe.conf`**

```bash
sudo cp deploy/nginx-bishe.conf /etc/nginx/conf.d/bishe.conf
sudo vim /etc/nginx/conf.d/bishe.conf      # 改 root 和 server_name
sudo nginx -t                              # 检查语法
sudo systemctl reload nginx
```

关键的三段：

```nginx
root /usr/share/nginx/bishe;               # 前端产物目录

location /api/ {                           # 接口反向代理
    proxy_pass http://127.0.0.1:9527/;     # ← 结尾的 / 不能少
    ...
}

location /imagesWeb/ {                     # 图片
    proxy_pass http://1.14.170.236:19000/property-cos/;   # 或改成 alias 本地目录
}
```

**`proxy_pass` 结尾的 `/` 是最容易踩的坑**：它负责把 `/api` 前缀去掉。
有斜杠时浏览器请求 `/api/login` → 后端收到 `/login`（正确）；
漏掉斜杠后端会收到 `/api/login`，全部 404。

这条路线的好处：

- 全程**同源**（前端和接口都是同一个域名端口），浏览器不会跨域
- 后端不需要加任何 CORS 配置（本项目后端确实没有跨域配置）
- 后端 9527 端口不必对公网开放

---

## 4. 如果你不想用反向代理

那就把 `static/app-config.js` 改成后端的绝对地址：

```js
window.__APP_CONFIG__ = {
  apiBase: 'http://你的服务器IP:9527'
}
```

但这样浏览器会**跨域**，必须在后端允许跨域，否则请求会被拦掉。
本项目后端目前**没有**任何跨域配置，需要自己加（例如 `WebMvcConfigurer#addCorsMappings`）。
所以更推荐第 3 节的 nginx 方案。

---

## 5. 后端 jar 需要你自己做的事

前端已适配好，后端侧只需：

1. 打 jar、上传、启动：`java -jar febs_shiro_jwt-1.0.0-release.jar`
2. 确认监听 **9527**（`application.yml` 里 `server.port`）
3. 数据库 / Redis 只要 jar 所在机器能连通即可

> 前端反代走的是 `127.0.0.1:9527`，所以 **nginx 和后端要在同一台机器上**。
> 如果后端在另一台机器，把 nginx 配置里的 `127.0.0.1` 换成那台机器的地址。

---

## 6. 上线后自检顺序

按这个顺序排查，能快速定位问题在哪一层：

1. **打开首页**：`http://你的域名/`
   - 白屏 → 看浏览器控制台是否 404 静态资源，多半是 `root` 指错或漏传了 `static/`
   - `index.html` 能打开但样式全丢 → `static/css` 没传全

2. **看网络请求**：F12 → Network，点登录
   - 请求地址应该是 `http://你的域名/api/login`
   - 如果是 `http://127.0.0.1:9527/...` → `app-config.js` 没生效
     （检查它是否 404、是否在 bundle 之前加载）
   - 如果 `/api/login` 返回 404 → nginx `proxy_pass` 少了结尾的 `/`
   - 如果 `/api/login` 返回 502/504 → 后端没起、端口不对，或不在同一台机器

3. **看请求头**：跨域报错（CORS）说明你走了第 4 节直连方案却没配后端跨域

4. **图片是否显示**：见下一节

---

## 7. 图片显示排查（重要，含一个既有隐患）

数据库里只存**文件名**，前端显示时拼 `/imagesWeb/` 前缀。但后端代码里
**没有 `/imagesWeb/` 这个映射**（`MyWebMvcConfigurerAdapter` 只注册了 `/images/**`），
所以这个前缀必须由 nginx（或你服务器上原有的配置）来提供 —— 见第 3 节的
`location /imagesWeb/`。

### 隐患：库里可能存的是完整 URL

后端 `FileController#fileUpload` 返回的是**完整 MinIO 地址**：

```java
String fileUrl = minioProperties.getEndpoint() + "/" + minioProperties.getBucketName() + "/" + newFileName;
// 例如 http://1.14.170.236:19000/property-cos/xxx.jpg
```

而前端保存时直接把上传响应写进了库：`images.push(image.response)`。
如果库里存的是这种完整 URL，那么渲染时拼出来会变成：

```
/api/imagesWeb/http://1.14.170.236:19000/property-cos/xxx.jpg    ← 坏地址
```

这是项目里**既有的前后端约定不一致**（与本次依赖升级无关）。判断方法：

```sql
-- 看库里存的是文件名还是完整地址
SELECT images FROM cos_building_info WHERE images IS NOT NULL LIMIT 5;
```

- 存的是 `xxx.jpg` 这种**纯文件名** → 现在的代码就正常，不用动
- 存的是 `http://...` **完整地址** → 图片显示不出来，二选一修复：
  - **改后端**（推荐）：`FileController` 只返回 `newFileName`，同时前端
    `images.push(image.response)` 保持不动。注意历史上已存的完整地址需要
    清洗数据库，或让前端兼容两种格式。
  - **改前端**：把 27 处 `${apiUrl("/imagesWeb/")}` + 值 的写法收敛成一个
    取文件名的辅助函数（`值.split('/').pop()`），这样两种历史数据都能显示。

  需要我做哪一种，告我一声即可。

---

## 8. 常见问题

**Q：`app-config.js` 改了没反应？**
nginx 配置里已把它设为 `no-store`；如果还不行，检查是不是 CDN/浏览器强缓存，
或者你改的是 `frontend/static/app-config.js`（源码）而不是服务器上
`dist/static/app-config.js`（产物）。

**Q：上传大文件失败？**
nginx 里 `client_max_body_size 100m;` 已和后端 `max-file-size: 100MB` 对齐。

**Q：`.gz` 文件是干嘛的？**
构建时预压缩的产物，配合 nginx `gzip_static on;` 直接发压缩版，省 CPU。
如果 nginx 没编译 `gzip_static` 模块，删掉这些 `.gz` 也不影响功能。

**Q：一定要放在根目录吗？**
不一定。放在子路径（如 `/admin/`）也能用，因为产物用的是相对路径
（`assetsPublicPath: './'`）。但**接口地址**要相应调整：同域根路径接口就写
`apiBase: '/'`，走反代就写 `apiBase: '/admin/api'` 并把 nginx location 一起改。
