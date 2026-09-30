# bishe

物业管理系统（毕业设计）。Spring Boot 2.7 + Shiro + MyBatis-Plus 后端，Vue 2 前端。

## 目录结构

```
backend/    Spring Boot 后端（Maven）
frontend/   Vue 2 前端（webpack 5）
db/         数据库相关文件
docs/       文档
```

## 构建与运行

后端：

```bash
cd backend
mvn clean package -DskipTests
java -jar target/febs_shiro_jwt-1.0.0-release.jar
```

前端（需要 Node 18+）：

```bash
cd frontend
npm install --ignore-scripts
npm run dev      # 开发服务器 http://localhost:8081
npm run build    # 生产构建，产物在 dist/
```

后端默认连接远程 MySQL 与 Redis，配置见 `backend/src/main/resources/application.yml`。

## 依赖安全

2026-09 已针对 GitHub Dependabot 告警完成一次全量依赖升级与漏洞修复：

- `backend/pom.xml`：有漏洞构件 46 → 15
- `frontend/package-lock.json` / `yarn.lock`：有漏洞包 96 → 2

改动明细、验证方式与**残留风险**详见 **[docs/dependency-audit.md](docs/dependency-audit.md)**。

> 残留项均需升级框架大版本（后端 Spring Boot 2.7 → 3.x，前端 Vue 2 → Vue 3）才能消除，
> 在现有框架分支内已无可用的修复版本。
