# 依赖漏洞修复报告（dependency-audit）

本文件记录 2026-09 针对 GitHub Dependabot 告警所做的依赖升级工作：范围、方法、
改动内容、验证结果，以及**在现有框架大版本内无法消除的残留风险**。

告警涉及的三个清单文件：

| 文件 | 修复前有漏洞的包 | 修复后 |
| --- | --- | --- |
| `backend/pom.xml` | 46 个构件 / 165 条公告 | **15 个构件 / 44 条独立公告**（按构件×公告计 45 条） |
| `frontend/package-lock.json` | 96 个包 / 228 条公告 | **2 个包 / 2 条公告** |
| `frontend/yarn.lock` | 与 package-lock 同源 | **2 个包 / 2 条公告** |

> 残留项全部是「只能靠升级框架大版本解决」的：前端是 Vue 2，后端是
> Spring Boot 2.7 / Spring Framework 5.3。详见文末「残留风险」。
---

## 1. 方法：以 OSV 漏洞库为准做全量比对

Dependabot 的告警数据实际来自 [OSV](https://osv.dev)，而 GitHub 的告警 API 需要
认证。因此本次修复用 OSV 公开 API 做等价（且更彻底）的全量扫描：把锁文件/依赖树里
**每一个**直接与传递依赖的**精确版本**都提交给 OSV 比对，而不是只看直接依赖。

审计脚本位于 `.tools/`（该目录已在 `.gitignore` 中忽略）：

| 脚本 | 作用 |
| --- | --- |
| `scan-osv-npm.mjs` | 解析 `package-lock.json`（v1 嵌套式与 v2/v3 扁平式）或 `yarn.lock` v1，逐包比对 OSV |
| `scan-osv-maven.mjs` | 解析 `mvn dependency:list` 输出，逐构件比对 OSV |
| `plan-npm-upgrades.mjs` / `plan-maven-upgrades.mjs` | 计算每个有漏洞的包「能修好它的最小版本」，区分同大版本内升级与需跨大版本 |
| `verify-maven-versions.mjs` | 升级前校验目标版本在仓库中真实存在，避免写出解析不到的版本（本次因此发现 `spring-framework:5.3.42` 并不存在） |
| `list-jar.mjs` / `jarrefs.mjs` | 无 `unzip`/`jar` 环境下检查 jar 内容与类引用，用来确认某个传递依赖是否真被使用（据此安全排除） |

复现方式（需要能访问 npm 与 Maven 阿里云镜像）：

```powershell
# 前端
node .tools\scan-osv-npm.mjs frontend\package-lock.json npm .tools\osv-npm.json
node .tools\scan-osv-npm.mjs frontend\yarn.lock        npm .tools\osv-yarn.json

# 后端（先生成依赖清单，再扫描）
mvn -f backend/pom.xml -s .tools\maven-settings.xml -DskipTests dependency:list -DoutputFile=.tools\deps.txt
node .tools\scan-osv-maven.mjs .tools\deps.txt .tools\osv-maven.json
```

## 2. 本机构建环境（重要）

这台机器上原本没有可直接使用的 JDK/Maven 组合，踩到的坑与结论如下，后续构建照此设置即可：

| 事项 | 结论 |
| --- | --- |
| JDK | 无独立 JDK。IntelliJ 自带 JBR 25（**完整 JDK**，含 `javac`），DBeaver 的 JRE 21 **没有 javac**，不能用来编译。本次用 JBR 25 编译（`maven.compiler.release=17`）。 |
| Maven | `D:\111aaa备份\Code\java_code\apache-maven-3.9.9`。其 `conf/settings.xml` 里的 `localRepository` 指向**不存在**的 `D:\java_code\...\mvn_repo`（少了一层目录），且镜像用明文 HTTP。 |
| 解决 | 使用 `.tools/maven-settings.xml`：把本地仓库放在工作区内，并用 `<mirrorOf>*</mirrorOf>` 把所有仓库（含 `pom.xml` 里声明的明文 HTTP `nexus-aliyun`）统一强制到 HTTPS 镜像。 |
| Lombok | JDK 23 起 `javac` 默认不再执行 classpath 上的注解处理器，Lombok 会静默失效（表现为到处「找不到符号 getXxx」）。已在 `maven-compiler-plugin` 中显式声明 `annotationProcessorPaths`。 |

```powershell
$env:JAVA_HOME="D:\Program Files\JetBrains\IntelliJ IDEA 2026.1.2\jbr"
mvn.cmd -f backend\pom.xml -s .tools\maven-settings.xml -DskipTests clean package
cd frontend; npm install --ignore-scripts; npm run build
```

> `npm install` 必须带 `--ignore-scripts`：本机沙箱禁止子进程管道通信，
> 依赖的 postinstall 脚本会以 `spawn EPERM` 失败；本项目的构建不需要这些脚本。

## 3. 后端改动

### 3.1 直接依赖升级（`backend/pom.xml`）

| 依赖 | 原版本 | 新版本 | 原因 |
| --- | --- | --- | --- |
| `shiro-spring` | 1.4.0 | **1.13.0** | 1.4.0 有 18 条公告，含多个认证绕过；1.13.0 是 1.x 最后一个版本，包名与 API 不变 |
| `mybatis-plus-*` | 3.1.1 | **3.5.7** | 3.1.1 有 CVE-2023-25330。**3.5.7 是仍内置 `PaginationInnerInterceptor` 的最后一个 3.5.x**（3.5.9 起分页能力被拆到 `mybatis-plus-jsqlparser`），因此选它而非最新 |
| `mybatis`（传递） | 3.5.1 | 3.5.16 | CVE-2020-26945 |
| `dynamic-datasource-spring-boot-starter` | 2.5.4 | 3.6.1 | 2.5.4 为 2018 年版本 |
| `fastjson` | 1.2.48 | **改为 `fastjson2` 2.0.53** | fastjson 1.x 已停更且反序列化漏洞极多。代码只用到 `JSON.toJSONString`，切到 `com.alibaba.fastjson2.JSON` 即可 |
| `mysql-connector-java` | 8.0.33 | `com.mysql:mysql-connector-j` 8.4.0 | 旧坐标已废弃；8.0.33 有 CVE-2023-22102 |
| `hutool-all` | 5.5.7 | 5.8.21 | CVE-2023-24162 / 24163 |
| `freemarker` | 2.3.28 | 2.3.35 | CVE-2026-84939（模板路径穿越） |
| `p6spy` | 3.8.1 | 3.9.1 | 旧版本 SQL 注入风险 |
| `java-jwt` | 3.4.1 | 4.4.0 | 3.x 已停更 |
| `commons-io` | 2.6 | 2.20.0 | CVE-2021-29425 等 |
| `httpclient` / `httpcore` | 4.5.2 / 4.4.5 | 4.5.14 / 4.4.16 | CVE-2020-13956 |
| `ExcelKit` + POI | 3.17（传递） | **5.4.1**（显式覆盖） | POI 3.17 有 CVE-2019-12415；POI 的 `poi-ooxml` 公告要求 ≥ 5.4.0 |
| `alipay-sdk-java` | 3.1.0 | 4.39.79.ALL | 旧版本自带大量老旧传递依赖 |
| `baidu java-sdk` | 4.12.0 | 4.16.19 | 同上 |
| `minio` | 8.5.12 | 8.6.0 | CVE-2025-59952 |
| `ip2region` | 1.7.2 | 1.7.2（**保持不变**） | 见下方说明 |

**关于 `ip2region`**：1.7.2 经 OSV 核查为**无漏洞**。曾尝试升到 2.7.0，但 2.x 的包名与
API 全部重构（`org.lionsoul.ip2region.xdb.Searcher`），且要求使用新的 xdb 数据库格式，
而仓库里只有旧版 `ip2region.db`。既无漏洞、升级又需替换数据文件并重写
`AddressUtil`，故**保持 1.7.2**，不做无收益的破坏性改动。

### 3.2 传递依赖覆盖（`dependencyManagement`）

Spring Boot 的 BOM 并未管理下列坐标，而它们是被上游带进来的传递依赖；在
`dependencyManagement` 中声明可覆盖任何传递引入的版本：

`commons-io 2.20.0`、`guava 33.5.0-jre`、`xmlbeans 5.3.0`、`xercesImpl 2.12.2`、
`commons-beanutils 1.11.0`、`json 20250517`、`okio 3.4.0`、`mchange-commons-java 0.6.0`、
`spring-test`（与 `spring-framework.version` 对齐，原先错误地锁在 5.2.3）、
`log4j-api 2.25.5`、`bcprov-jdk18on 1.85`。

借助 Spring Boot 的版本属性覆盖的：`spring-framework 5.3.39`、`tomcat 9.0.121`、
`snakeyaml 2.0`、`logback 1.2.13`、`jackson 2.18.11`、`netty 4.1.137.Final`、
`commons-lang3 3.18.0`、`bouncycastle 1.85`。

### 3.3 排除的传递依赖（附证据）

排除前先用 `jarrefs.mjs` 反编译检查了类的常量池引用，确认相关代码路径在本项目中
不会被走到：

- **`dom4j:1.6.1`**（来自 `alipay-sdk-java`）——两个公告**至今没有修复版本**。
  该依赖只服务于支付宝 OpenAPI 的「XML 格式」响应解析，而 `common/utils/Alipay.java`
  中 `format` 固定为 `"json"`，不会走该分支。
- **`bcprov-jdk15on:1.62`**（来自 `alipay-sdk-java`）——该构件线已停在 1.70 且仍有
  未修复公告。其后继构件 `bcprov-jdk18on`（由 minio 引入，已升到 1.85 且无公告）
  提供同样的 `org.bouncycastle` 包，故排除旧构件避免两者冲突。
- **`dom4j`（来自 `ExcelKit`）**——仅被 `ExcelMappingFactory#loadExcelMappingByXml`
  使用；本项目全部用 `@Excel` / `@ExcelField` 注解配置，没有任何 `excel-mapping` XML。

> 同时确认 `ExcelKit` **确实**依赖 POI（`POIUtil` 使用 `SXSSFWorkbook`、
> `DataValidationHelper`、`CellRangeAddressList`），所以 POI 是显式升级而非排除。

### 3.4 需要改代码的 API 破坏性变更

| 文件 | 原因 |
| --- | --- |
| `common/config/MybatisPlusConfig.java` | MP 3.5.x 用 `MybatisPlusInterceptor` + `PaginationInnerInterceptor` 取代了 3.1.x 的 `PaginationInterceptor` |
| `common/utils/SortUtil.java` | MP 3.5.x 移除了 `Page#setAsc/setDesc`，改为 `page.addOrder(OrderItem.asc/desc(...))` |
| `common/generator/CodeGenerator.java` | `mybatis-plus-generator` 3.5.x 删除了旧的 `AutoGenerator` + `GlobalConfig`/`DataSourceConfig`/`PackageConfig`/`TemplateConfig`/`StrategyConfig`/`InjectionConfig` 组合式 API，按新的 `FastAutoGenerator` 链式 API 重写（生成产物与自定义模板不变） |
| `common/utils/Alipay.java` | `com.alibaba.fastjson.JSON` → `com.alibaba.fastjson2.JSON` |
| `cos/service/impl/FaceRecognitionImpl.java` | 百度 SDK 4.16.x 起 `search`/`detect` 的 options 形参变为 `Map<String, Object>`（`addUser` 仍为 `HashMap<String, String>`） |

## 4. 前端改动

前端原骨架是 2018 年的 `vue-webpack-template`（webpack 3 / babel 6 / Vue 2.6）。
其漏洞绝大多数位于 webpack 3 时代的构建链传递依赖里，**只打补丁级更新无法清零**，
因此按计划做了大版本跃迁。

### 4.1 依赖升级（`frontend/package.json`）

| 领域 | 原 | 新 |
| --- | --- | --- |
| 打包 | webpack 3.12 | **webpack 5.111** + webpack-cli 5 + webpack-dev-server 5 |
| Babel | babel-core 6 | **@babel/core 7.29** + preset-env + plugin-transform-runtime + `@vue/babel-preset-jsx` |
| Vue 工具链 | vue-loader 13 | **vue-loader 15.11** + `@vue/component-compiler-utils` 3 |
| 框架 | vue 2.6.14 | **vue 2.7.16**（Vue 2 最后一个功能版本）+ vue-template-compiler 2.7.16 |
| CSS | extract-text-webpack-plugin 3 | **mini-css-extract-plugin 2** + css-minimizer-webpack-plugin 5 |
| 压缩 | uglifyjs-webpack-plugin 1 | **terser-webpack-plugin 5**（webpack 5 内置） |
| 产物清理 | rimraf 2 | rimraf 5（Promise API） |
| 业务库 | apexcharts 2.6.0 / axios 0.18.0 | apexcharts 3.54.1 / axios 1.7.9 |
| 其他 | — | chalk 4、ora 5、semver 7、shelljs 0.8.5、less 4、postcss 8、autoprefixer 10、copy-webpack-plugin 11、html-webpack-plugin 5、compression-webpack-plugin 10 |

**移除的死依赖**（源码中零引用，且它们是把老漏洞引进来的主要入口）：
`chromedriver`、`selenium-server`、`nightwatch`、`jest`、`babel-jest`、`vue-jest`、
`jest-serializer-vue`、整套 eslint 及 loader（`config.dev.useEslint` 本就为 `false`）、
`date-fns`、`vuedraggable`、`babel-polyfill`。
项目内**不存在任何测试目录**（无 `test/`、`e2e/`、`__tests__/`）与测试配置，
因此这些测试依赖确属无用。

### 4.2 构建配置改造

- `build/webpack.base.conf.js`：webpack 5 语法 —— 移除 `node: { fs: 'empty' }` 式
  polyfill（改用 `resolve.fallback`）、资源改用 `asset` 模块替代 `url-loader`、
  接入 `VueLoaderPlugin`、`IgnorePlugin` 换新签名。
- `build/webpack.prod.conf.js`：`CommonsChunkPlugin` × 3 → `optimization.splitChunks`
  + `runtimeChunk`；`UglifyJsPlugin` → `TerserPlugin`；`ExtractTextPlugin` →
  `MiniCssExtractPlugin`；`OptimizeCSSPlugin` → `CssMinimizerPlugin`；
  `CopyWebpackPlugin` 数组 → `{ patterns: [...] }`；`HashedModuleIdsPlugin`/
  `ModuleConcatenationPlugin` 由 webpack 5 默认行为取代；`output.clean` 取代手工清目录。
- `build/webpack.dev.conf.js`：dev-server 4/5 新 schema（`client.overlay`、
  `static.directory`、`devMiddleware.stats`），移除已废弃的 `friendly-errors-webpack-plugin`。
- `build/vue-loader.conf.js`：`loaders` → `css.loaders`（含 `esModule` 处理）。
- `build/check-versions.js`：不再 `execSync('npm --version')` 起子进程，改为从
  `npm_config_user_agent` 解析版本；`engines` 提到 `node >= 18`。
- `.babelrc`：babel 7 preset/plugin 写法（注意 `@vue/babel-preset-jsx` 属于
  **presets**，放进 `plugins` 会报 `Cannot find package
  '@vue/babel-plugin-babel-preset-jsx'`）。
- `.postcssrc.js`（已删除）→ **`postcss.config.js`**（postcss-loader 7 需要独立配置文件）。
- `config/index.js`：环境变量改为直接提供**已加引号的字符串字面量**给 `DefinePlugin`
  （原 `dev.env.js`/`prod.env.js`/`test.env.js` 三个 shim 已删除），
  `bundleAnalyzerReport` 改为读取 `--report` 参数（原为恒 `true`，每次构建都弹报告）。
- `config/index.js` 的 `devtool` 更新为 webpack 5 的 `eval-cheap-module-source-map`。

### 4.3 顺带修掉的一个既有缺陷：未声明的 `portfinder`

`build/webpack.dev.conf.js` 一直在 `require('portfinder')`，但它**从未出现在
`package.json` 里** —— 旧项目能跑只是因为 `webpack-dev-server@2` 恰好把它作为传递
依赖带了进来。升级到 webpack-dev-server 5 后该传递依赖消失，`npm run dev` 会直接
`Cannot find module 'portfinder'`。已把它显式加入 `devDependencies`。

（用 `.tools/check-frontend-requires.mjs` 通检了全部 29 个构建文件的 `require()`，
现在每一个都对应 `package.json` 中已声明的依赖。）

### 4.4 为什么 `overrides` / `resolutions` 是必要的

剩余 4 个漏洞全部藏在**构建期传递依赖**里，直接依赖无法控制，因此在
`package.json` 中同时声明 `overrides`（npm）与 `resolutions`（yarn 1）把版本顶上去
（两者必须一致，否则两种包管理器会解析出不同依赖树）：

| 包 | 原 | 强制到 | 谁引入 |
| --- | --- | --- | --- |
| `postcss` | 7.0.39 | 8.5.28 | `@vue/component-compiler-utils` |
| `glob` | 10.4.5 | 10.5.0 | `rimraf` |
| `serialize-javascript` | 6.0.2 | 7.1.2 | `compression-webpack-plugin` 等 |
| `uuid` | 8.3.2 | 11.1.1 | `sockjs` |

这些包**不会进入浏览器产物**（纯构建期），且构建已验证通过。

### 4.5 已处理的构建告警

webpack 5 下 vue-loader 15 会为每个 `.vue` 样式块报一次
`export 'default' ... was not found`（65 条）。原因是 vue-loader 仍会生成开发期样式注入
存根，而生产构建的样式已被 `MiniCssExtractPlugin` 抽走。已用**精确匹配该模式**的
`ignoreWarnings` 抑制；并且验证过 `dist/static/css` 中确实包含各组件样式
（`FEBS.vue` 的 61 个类名全部命中，输出 CSS 共 561 KB），因此只是告警噪音。
最终构建仅剩 2 条体积提示（vendor 包 2.17 MB，属既有情况）。

## 5. 验证结果

| 项目 | 结果 |
| --- | --- |
| 后端 `mvn clean package`（全新清理后重跑） | ✅ BUILD SUCCESS，产出 `febs_shiro_jwt-1.0.0-release.jar`（119.2 MB） |
| 前端 `npm run build`（删除 `dist/` 后重跑） | ✅ Build complete，`dist/` 459 个文件 / 21.71 MB，gzip 产物 57 个 |
| 前端产物完整性 | ✅ `index.html` 标题 UTF-8 正常（`物业管理系统`）、js/css/manifest 引用齐全、SpreadJS 静态资源已复制、组件样式已进 CSS（`FEBS.vue` 的 61 个类名全部命中，CSS 共 561 KB） |
| 前端开发配置可加载 | ✅ 实际 `require('./build/webpack.dev.conf.js')` 解析成功（mode/entry/devServer/rules/plugins 齐全），证明 `portfinder` 等问题已修 |
| 构建依赖自检 | ✅ 29 个构建文件的全部 `require()` 均对应已声明依赖；31 个构建包在 `node_modules` 中均可解析 |
| 两套锁文件一致性 | ✅ `package-lock.json` 与 `yarn.lock` 均解析出 **719** 个包、同样 2 个残留 |
| fat jar 内容核查 | ✅ 已确认打包进的均为升级后版本，且**不含** `bcprov-jdk15on` / `dom4j` / 旧版 fastjson |
| 实际启动运行 | ⚠️ **无法在本机验证**：应用依赖远程 MySQL `1.14.170.236:13306` 与 Redis `1.14.170.236:26739`，两者从本机均不可达（连接超时）。 |

**建议你在能连到数据库的环境里补做一次运行验证**：

```powershell
# 后端
java -jar backend\target\febs_shiro_jwt-1.0.0-release.jar
# 前端
cd frontend; npm run dev     # http://localhost:8081
```

重点回归以下功能（本次改动直接触及的地方）：
1. **登录 / 权限校验**（Shiro 1.4.0 → 1.13.0）
2. **所有列表分页与排序**（MyBatis-Plus 3.1.1 → 3.5.7、`SortUtil` 改写）
3. **Excel 导入导出**（POI 3.17 → 5.4.1，跨越两个大版本）
4. **人脸识别**（百度 SDK 参数类型变化）
5. **支付宝支付**（改为 fastjson2）
6. **MinIO 文件上传**（8.5.12 → 8.6.0）
7. **定时任务**（quartz + mchange-commons 0.6.0）

## 6. 残留风险（需要框架大版本升级才能消除）

以下 15 项在 Spring Boot 2.7 / Spring Framework 5.3 分支内**没有任何可用修复版本**
（OSV 给出的 `fixedIn` 全部指向 6.x/3.x）。要么接受，要么做框架大版本迁移。

> 关于 Spring Framework 需要特别说明：OSV 的 `spring-webmvc` 公告里列了一个
> `5.3.42` 作为修复版本，但 **Maven 仓库中 `spring-framework-bom` 的 5.3.x 分支
> 实际以 5.3.39 收尾，根本不存在 5.3.42**（已用 `verify-maven-versions.mjs` 核实：
> 该分支发布的最后一个版本就是 5.3.39）。因此 5.3.39 已经是 5.3 线能达到的上限，
> 这些公告在 5.3 分支内无解。

| 构件 | 残留公告 | 说明 |
| --- | --- | --- |
| `spring-webmvc` / `spring-expression` / `spring-core` / `spring-web` / `spring-context` 5.3.39 | 25 条 | 5.3.x 已是该分支末版；修复版本全部在 6.x |
| `spring-boot` / `-autoconfigure` / `-starter-actuator` 2.7.18 | 4 条 | Spring Boot 2.7 已于 2023-11 结束 OSS 维护，2.7.18 是最后一个版本 |
| `spring-data-commons` / `spring-data-keyvalue` 2.7.18 | 4 条 | 随 Spring Boot 2.7 的依赖版本锁定；修复需 Spring Data 3.5+/4.x |
| `micrometer-core` 1.9.17 | 1 条 | 由 Spring Boot 2.7 的 BOM 管理，修复版本 1.15+ 需 Boot 3.x |
| `shiro-core` / `-spring` / `-web` 1.13.0 | 5 条 | 修复版本为 Shiro 2.1+。**Shiro 2.x 需要 Spring 6 / jakarta 命名空间**，与 Boot 2.7 不兼容 |
| `logback-core` 1.2.13 | 6 条 | 修复版本 1.3+/1.5+ 需要 SLF4J 2.x，而 Spring Boot 2.7 的日志绑定基于 SLF4J 1.7，强行混用会导致日志失效 |

> 其中值得单独关注的是 **`shiro-spring` 的 CVE-2026-23903（认证绕过，CVSS 攻击向量
> AV:N/AC:L/PR:N）**，公告称只影响静态资源处理路径，修复版本 2.0.7。本项目在
> `application.yml` 中把 `/imagesWeb/**`、`/file/**` 等列为 `anonUrl`，若这些静态资源
> 路径可被外部访问，建议评估该风险。

**迁移到框架新大版本的路径**（如需彻底清零）：

1. **后端**：Spring Boot 2.7 → 3.3/3.4。工作量主要在 `javax.*` → `jakarta.*` 的全量
   改名（本项目 222 个 Java 文件），同时 Spring Security 式配置、Shiro 需换成
   2.1+、`mybatis-plus` 需换 `mybatis-plus-spring-boot3-starter`、`dynamic-datasource`
   需换 boot3 版本。
2. **前端**：Vue 2.7 → Vue 3。`vue@2.7.16` 与 `vue-template-compiler@2.7.16` 各有 1 条公告
   （Vue 2 已 EOL，公告只标 `fixedIn: 3.0.0`）。需要迁移 127 个 `.vue` 文件到组合式/新
   生命周期 API，`ant-design-vue` 需从 1.x 升到 4.x（组件 API 有较大改动），
   `vue-apexcharts` 需换成 `vue3-apexcharts`。

上表与上节所列即为「在不动框架大版本」前提下能达到的最优状态；本次修复已把
可修复项**全部**修复完毕。
