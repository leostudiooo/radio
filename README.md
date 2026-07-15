# BA4VUN QSO Log

个人业余电台 QSO 日志单页应用。呼号 BA4VUN,常驻南京。

## 技术栈

- **前端**: SvelteKit 5(SPA,SSR 关闭)+ Svelte 5 runes + Tailwind 4
- **后端**: Supabase(PostgreSQL 17 + Auth + Passkey)
- **部署**: Cloudflare Pages + Pages Functions
- **终端**: 主页使用 vendored wterm(submodule)

## 主要功能

- QSO 日志增删改查,支持呼号、频段、模式、日期筛选
- 设备管理(收发信机、天线、调谐器等),可激活/停用
- QSL 卡片管理
- ADIF 格式导入/导出
- Passkey 与 Magic Link 登录(管理员可写,公开只读)
- 主页终端界面,支持 `ls` / `cd` / `cat` / `auth` / `qso` / `equipment` 等命令
- QRZ.com 呼号查询(经 Cloudflare Function 代理)

## 本地开发

需要 Node.js、pnpm、Supabase CLI。克隆时记得带 submodule:

```bash
git clone --recursive <repo-url>
cd radio
pnpm install
pnpm gen-types    # 需要先 supabase link
pnpm dev
```

常用命令:`pnpm build` / `pnpm test` / `pnpm check` / `pnpm lint` / `pnpm format`。
本地 Supabase:`supabase start` → `supabase db push`。

## 环境变量

参考 `.env.example`。Supabase、QRZ、Cloudflare 相关变量都在里面。
`QRZ_USERNAME` / `QRZ_PASSWORD` 应配置在 Cloudflare Pages 后台,不要写进 `.env`。

## 项目结构

- `src/lib/logic/` — 纯 TS 业务逻辑(ESLint 禁止 import Svelte/UI/浏览器全局)
- `src/lib/ui/` — Svelte 5 组件 + runes stores
- `src/lib/i18n/` — typesafe-i18n(en/zh)
- `src/routes/` — SvelteKit 路由(SPA 模式,用 `onMount` 加载数据)
- `functions/` — Cloudflare Pages Functions(呼号查询 API)
- `supabase/` — 数据库迁移 + 本地配置
- `vendors/wterm/` — wterm 终端组件源码(submodule)

详细架构约束、设计系统规则、命名约定见 `AGENTS.md`。

QSL 验证码的权限模型、Supabase Advisor 告警解释和泄露处置流程见
[`docs/dev-notes/qsl-verification-security.md`](docs/dev-notes/qsl-verification-security.md)。

## 部署

`pnpm build` 后部署到 Cloudflare Pages,Functions 随仓库自动走。
