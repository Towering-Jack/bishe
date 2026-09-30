# 前端部署说明（前后端分离）

本文对应「前端打包成一个 html 文件夹，直接拖到云服务器」这种部署方式。

> **本项目实际服务器：`property.qqiukulele.cn`**
> 站点目录 `/www/wwwroot/property/distDL`，已有 nginx 配置使用
> `/propertyCosApi/`（后端）与 `/propertyCosImg/imagesWeb/`（MinIO）。
> 对应的前端配置已经设好，见第 2 节；服务器配置需要改的 3 处见第 8 节。

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

现在这些地址统一由 **`static/app-config.js`** 控制。因为服务器上「后端接口」和
「图片」是两个不同的 nginx location，所以有**两个**前缀：

```js
window.__APP_CONFIG__ = {
  apiBase: '/propertyCosApi',    // 后端接口，nginx 去前缀后转 127.0.0.1:9527
  imageBase: '/propertyCosImg'   // 图片，nginx 转 MinIO 的 property-cos 桶
}
```

前端最终发出的地址：

| 用途 | 实际请求 |
| --- | --- |
| 登录 | `/propertyCosApi/login` |
| 任意接口 | `/propertyCosApi/<后端路径>` |
| 上传 | `/propertyCosApi/file/fileUpload/` |
| 人脸注册 | `/propertyCosApi/cos/face/registered/` |
| 图片 | `/propertyCosImg/imagesWeb/<文件名>` |

**这是运行时配置**：改完刷新浏览器即可生效，不需要重新构建。

> `imageBase` 后面固定拼 `/imagesWeb/`，所以图片完整前缀就是
> `/propertyCosImg/imagesWeb/` —— 与服务器上已有的 location 一致。

---

## 3. nginx 配置（推荐方案）

配套文件：**`deploy/nginx-bishe.conf`**（通用模板）

> 如果你就用本仓库的实际服务器 `property.qqiukulele.cn`，
> 请直接看 **第 8 节** 和 **`deploy/nginx-property.qqiukulele.cn.conf`**。

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

## 7. 图片显示排查（含一个既有隐患）

你的 nginx 已经把图片交给 MinIO：

```nginx
location /propertyCosImg/imagesWeb/ {
    proxy_pass http://1.14.170.236:19000/property-cos/;
}
```

前端请求 `/propertyCosImg/imagesWeb/<文件名>`，nginx 去掉
`/propertyCosImg/imagesWeb/` 后转发到 `property-cos` 桶。**后端不参与图片读取**
（后端 `MyWebMvcConfigurerAdapter` 只注册了 `/images/**`，与前端用的
`/imagesWeb/` 不是同一个前缀，所以那条映射其实用不上）。

要让这条路走通，数据库里存的必须是**纯文件名**（如 `a1b2c3-uuid.jpg`）。
前端也已经做了兼容：`imageUrl()` 会先去掉完整 URL 只取最后一段文件名，所以
即使库里存的是 `http://1.14.170.236:19000/property-cos/a1b2c3.jpg` 也能正确显示成
`/propertyCosImg/imagesWeb/a1b2c3.jpg`。

### 确认方法

```sql
SELECT id, images FROM cos_building_info WHERE images IS NOT NULL LIMIT 5;
```

- `a1b2c3-uuid.jpg` —— 纯文件名，正常
- `http://1.14.170.236:19000/property-cos/a1b2c3-uuid.jpg` —— 完整地址，前端已兼容
- 如果同一列里两种都有，前端也都能处理

> 之所以会出现完整地址：后端 `FileController#fileUpload` 返回的是
> `endpoint + '/' + bucket + '/' + 文件名`，而前端保存时把上传响应直接写进了库
> （`images.push(image.response)`）。这是项目里**既有的前后端约定不一致**，
> 与依赖升级无关。想让库里数据干净，可以把 `FileController` 改成只返回
> `newFileName`（需要你重新打 jar）。

---

## 8. 你的服务器配置（`property.qqiukulele.cn`）需要改的 3 处

你那份配置**整体是对的**，前缀也已经对上了。逐条核对结论：

| 你的 location | 前端会请求的地址 | 结论 |
| --- | --- | --- |
| `/propertyCosApi/` | `/propertyCosApi/login` 等全部接口 | ✅ 正确 |
| `/propertyCosApi/` | `/propertyCosApi/file/fileUpload/` 上传 | ✅ 正确 |
| `/propertyCosApi/` | `/propertyCosApi/cos/face/registered/` 人脸 | ✅ 正确 |
| `/propertyCosImg/imagesWeb/` | `/propertyCosImg/imagesWeb/<文件名>` | ✅ 正确 |

> `proxy_pass http://127.0.0.1:9527/;` 结尾的 `/` 是关键，它会把
> `/propertyCosApi/` 前缀去掉，所以后端收到的仍是 `/login`，**后端不用改**。

对照参考文件：**`deploy/nginx-property.qqiukulele.cn.conf`**（不要整体覆盖，
照着改你自己那份）。

### 【改1】确认站点目录与产物位置

你写的是 `root /www/wwwroot/property/distDL;`。
把打好的 `dist` **里面的内容**放进这个目录，让它直接包含 `index.html` 和 `static/`：

```
/www/wwwroot/property/distDL/
├── index.html
└── static/
```

### 【改2】开启 gzip（否则构建出的 `.gz` 全白做）

你现在**没有** `gzip` 相关指令，所以 `dist` 里那 57 个 `.gz` 文件永远不会被使用，
浏览器拿到的是未压缩版本。加三行：

```nginx
gzip on;
gzip_vary on;
gzip_static on;     # 若 nginx 未编译 gzip_static 模块，nginx -t 会报错，去掉这行即可
```

顺带建议加 `client_max_body_size 100m;`，与你后端 100MB 的上传上限对齐
（在 `location /propertyCosApi/` 里加也可以）。

### 【改3】`.js/.css` 那条 location 的正则写错了，是死代码

你现在写的是：

```nginx
location ~ .*\\.(js|css)?$        # ← 两个反斜杠，正则里表示「字面反斜杠」
```

这行**从未生效过**（所以也就一直没有缓存头）。正确写法：

```nginx
location ~* \.(js|css)$ {
    expires 12h;
    error_log /dev/null;
    access_log /dev/null;
}
```

同时建议补上这两条（顺序放在上面正则**之前**，`=` 精确匹配优先级最高）：

```nginx
# 部署配置绝不能缓存，否则改了地址刷新不生效
location = /static/app-config.js {
    add_header Cache-Control "no-store, no-cache, must-revalidate";
    expires -1;
}

# 带内容哈希的产物可以长缓存
location ~* ^/static/(js|css)/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

### 可以删掉的

`location /propertyCosFile/` 现在前端不再使用（上传已统一走
`/propertyCosApi/file/fileUpload/`）。留着不影响功能，想干净可以删。
`location /propertyCosFace/` 同理，前端人脸注册走的是 `/propertyCosApi/cos/face/registered/`。

---

## 9. 常见问题

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
