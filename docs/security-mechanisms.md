# 安全机制检查记录

更新时间：2026-07-07

## 已加固项

- 后端业务 API 默认要求登录：DRF 默认权限从匿名可读改为 `IsAuthenticated`。
- 认证方式收敛：移除 DRF `BasicAuthentication`，公网业务接口只使用 Django Session。
- 登录与退出接口启用 CSRF 校验：前端先调用 `/api/accounts/session/` 获取 CSRF token，再提交登录/退出请求。
- AI 能力接口要求登录：推荐车型、话术生成、报价建议和 AI 会话记录不再允许匿名访问。
- 租户/门店范围隔离：线索、客户、互动、任务、库存、销售政策、试驾、报价、订单和看板统计按用户 profile 绑定的租户/门店过滤；超级管理员可看全局。
- AI 会话隔离：普通用户只能访问自己的 AI 会话和工具调用记录。
- CSV 上传限制：线索导入只允许 CSV 类型，并限制默认最大 2 MB。
- 安全响应与 Cookie 默认值：开启 `SECURE_CONTENT_TYPE_NOSNIFF`、`X_FRAME_OPTIONS=DENY`、`SECURE_REFERRER_POLICY=same-origin`，并设置 Session/CSRF SameSite 策略。
- API 限流：启用 DRF 匿名和登录用户基础 throttle。

## 当前部署约束

当前公网入口仍是 HTTP：`http://111.228.9.40:58900/`。因此以下 HTTPS 强制项保持为环境开关，默认未开启，避免破坏现有访问：

- `SECURE_SSL_REDIRECT`
- `SESSION_COOKIE_SECURE`
- `CSRF_COOKIE_SECURE`
- `SECURE_HSTS_SECONDS`
- `SECURE_HSTS_INCLUDE_SUBDOMAINS`
- `SECURE_HSTS_PRELOAD`

## HTTPS 后建议开启

当公网入口切到 HTTPS 后，在生产 `.env` 中设置：

```env
SECURE_SSL_REDIRECT=true
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=true
SECURE_HSTS_PRELOAD=true
```

开启后执行：

```bash
python manage.py check --deploy
```
