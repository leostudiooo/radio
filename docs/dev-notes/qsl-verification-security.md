# QSL 验证安全说明

**状态日期：** 2026-07-14

**适用范围：** Issue #5 引入的纸质 QSL 验证码、匿名查询/确认 RPC 和管理员发码流程

## 安全模型

QSL 验证码是 bearer credential：持有码的人被视为纸卡收件人，不需要登录。验证码不是普通记录标识，也不是可以提交到公开仓库的测试数据。

- 格式为 Crockford Base32 `XXXX-XXXX`，有效熵为 40 bit（`32^8`）。
- 数据库存储无连字符的大写形式；输入不区分大小写，连字符可省略。
- 一个 QSO 同时最多有一个有效验证码。
- 匿名查询只能精确匹配验证码，不支持枚举。
- 匿名响应只包含确认页面所需的 QSO 字段。
- 确认操作只设置 `verified_at`，重复确认是幂等的。
- `verification_code` 不属于公开 QSO 数据，不能通过 `qsos` Data API 直接读取。

验证码一旦出现在公开 Issue、提交、日志、截图或 URL 中，应立即视为泄露并轮换。

## 权限矩阵

| 操作                         | anon | authenticated                             | 所有者 admin           |
| ---------------------------- | ---- | ----------------------------------------- | ---------------------- |
| 读取公开 QSO 字段            | 允许 | 允许                                      | 允许                   |
| 直接读取 `verification_code` | 拒绝 | 拒绝                                      | 拒绝，必须走管理员 RPC |
| 按验证码查询有限 QSO 信息    | 允许 | 允许                                      | 允许                   |
| 按验证码确认收到纸卡         | 允许 | 允许                                      | 允许                   |
| 读取某个 QSO 的验证码        | 拒绝 | RPC 可调用，但函数内拒绝非 admin/非所有者 | 允许                   |
| 为 QSO 签发验证码            | 拒绝 | RPC 可调用，但函数内拒绝非 admin/非所有者 | 允许                   |

管理员 RPC 同时校验：

1. `auth.uid()` 与 QSO 的 `profile_id` 一致；
2. 当前 profile 的 `role = 'admin'`；
3. 发码时 QSO 尚未持有验证码。

所有 Issue #5 新增的 `SECURITY DEFINER` 函数都使用空 `search_path`，并显式限定表的 schema。

## Security Advisor 告警

以下告警是设计预期，不表示已发生越权：

- `get_qso_by_verification_code` 可由 `anon` 执行：匿名查卡是产品要求。
- `confirm_qso_by_code` 可由 `anon` 执行：验证码本身就是确认凭证。
- 两个管理员 RPC 可由 `authenticated` 执行：真正授权在函数内部完成；普通登录用户无法读写其他 profile 的验证码。

Supabase Advisor 无法理解“验证码即权限”或函数内部的 admin/所有权判断，因此会对这些 `SECURITY DEFINER` RPC 给出通用警告。不得为了消除警告而直接撤销匿名确认能力，也不得忽略新出现的其他告警；每次改动后仍需复核函数权限和函数体。

与 Issue #5 无关但仍需后续加固的现有告警：

- `handle_new_user`、`prevent_last_admin_demotion`、`prevent_role_escalation` 的 `search_path` 可变；
- Supabase Auth leaked-password protection 未开启。当前主要使用 passkey/magic link，若启用密码登录则必须先开启。

## SaaS 验证记录

迁移已应用到托管 Supabase：

- `20260713123029_qsl_verification`
- `20260713123725_qsl_verification_function_grants`

2026-07-14 的验证结果：

- 匿名调用公开查询 RPC：HTTP 200；
- 匿名直接查询 `qsos.verification_code`：HTTP 401 / PostgreSQL `42501`；
- 匿名调用管理员读码 RPC：HTTP 401 / `permission denied`；
- `anon` 仅拥有查询、确认两个 RPC 的 EXECUTE 权限；
- `authenticated` 拥有四个 RPC 的 EXECUTE 权限，但管理员 RPC 仍执行函数内授权；
- 两条预留记录已正确关联纸卡发送状态，且 `verified_at` 均为空。

## 已知公开码与风险接受

仓库 `leostudiooo/radio` 是公开仓库。Issue #5 评论和首次迁移包含两条预先保留的真实验证码，而对应匿名 RPC 已在 SaaS 上启用。因此这两条验证码已经公开，不能继续被视为有效凭证。

项目所有者已接受这两条预留码公开的风险，理由是：

- 对应 QSO 信息本来就是公开数据；
- 持有码的人最多能把该 QSO 标记为已确认；
- 确认操作幂等，不能修改其他 QSO 字段；
- 验证码不提供登录、管理员权限或其他记录的访问能力。

因此，这两条已知公开码不作为合并或发布阻断项。后续新签发的验证码仍应按 bearer credential 管理，不应进入公开 Issue、提交、日志或截图；如果用途或可写范围扩大，必须重新评估这一风险接受决定。

## 运行与事件处理

### 正常发码

1. 管理员打开 QSO 详情页并执行“寄送 QSL 卡”；
2. 系统生成验证码、更新 QSO，并 upsert 一条已发送的 paper QSL 记录；
3. 仅把固定确认网址和验证码写在纸卡上；
4. 不把带码 URL 放入分析日志、聊天记录或公开图片。

### 怀疑验证码泄露

1. 立即停止使用旧码；
2. 检查 `verified_at` 是否出现非预期变化；
3. 清除或替换 `verification_code`；
4. 如果已发生可疑确认，人工核实后再决定是否清除 `verified_at`；
5. 为收件人提供新码，并确认旧码无法再查询；
6. 记录泄露渠道，避免新码再次进入相同渠道。

当前 UI 没有“撤销/轮换验证码”操作。上线前至少应准备一条受控的数据库处置流程，后续再补管理员 UI。

## 后续加固

- 为公开查询/确认入口增加按 IP 和时间窗口的速率限制；40 bit 空间降低猜中概率，但不能防止数据库负载攻击。
- 将高权限实现移动到不暴露的 private schema，public schema 仅保留窄接口包装函数。
- 增加管理员撤销/轮换验证码功能和相应审计记录。
- 为验证码查询和确认增加异常流量监控，但日志中不得记录原始验证码。
- 修复现有触发器函数的可变 `search_path` 和不必要的 EXECUTE 权限。
