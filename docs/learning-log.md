# Learning Log

> 这份文档记录我们在 hackathon 过程中学到的每个重要概念。
> 目标：读完每个 section 后，你能向别人解释这个概念。

---

## 目录

1. [项目结构：为什么这样分文件夹？](#1-项目结构为什么这样分文件夹)
2. [Express 应用的启动流程](#2-express-应用的启动流程)
3. [Prisma：ORM 是什么？为什么用它？](#3-prismaorm-是什么为什么用它)
4. [State Machine：状态机是什么？](#4-state-machine状态机是什么)
5. [API 设计：Conventions 为什么重要？](#5-api-设计conventions-为什么重要)
6. [Auth Module：密码、JWT、Middleware 怎么运作？](#6-auth-module密码jwt-middleware-怎么运作)

---

## 1. 项目结构：为什么这样分文件夹？

### 大图景
这是 backend 的标准分层架构 (Layered Architecture)。每一层只做一件事，不越权。

```
Request 进来
    ↓
routes/       ← 只管"这个 URL 交给谁处理"
    ↓
controllers/  ← 只管"读 req，写 res"，不做业务逻辑
    ↓
services/     ← 真正的业务逻辑在这里 (e.g. 发 email、call GLM)
    ↓
prisma/       ← 数据库读写
```

### 为什么要分层，不直接在 route 里写所有逻辑？

**坏例子 (把所有东西塞在 route 里)**:
```js
app.post('/candidates/apply', async (req, res) => {
  // 验证 input
  // 存文件
  // 写 database
  // call GLM
  // 发 email
  // 更新 state
  // 返回 response
  // ... 200 行
});
```
这叫 **"Fat Route"** — 噩梦：改一行可能坏其他东西，没法测试，别人看不懂。

**好例子 (分层)**:
```js
// routes/candidates.routes.js
router.post('/apply', upload.single('cvFile'), candidateController.apply);

// controllers/candidates.controller.js
async function apply(req, res) {
  const candidate = await candidateService.createApplication(req.body, req.file);
  res.status(201).json({ success: true, data: candidate });
}

// services/cv.service.js
async function createApplication(body, file) {
  // 业务逻辑在这里
}
```

### 每个文件夹的职责

| 文件夹 | 职责 | 比喻 |
|---|---|---|
| `routes/` | URL 路由，只 `require` controller | 前台接待 — 把客人引导到对的部门 |
| `controllers/` | 读 `req`，调用 service，写 `res` | 部门经理 — 接任务、分配、汇报结果 |
| `services/` | 真正的业务逻辑 | 实际干活的员工 |
| `middleware/` | 每个 request 都要过的关卡 (auth, validation) | 安检 |
| `config/` | DB 连接、env 变量 | 公司配置手册 |
| `workflow/` | 状态机 — 管理 candidate 的流程状态 | 流水线管理员 |
| `utils/` | 小工具函数 (e.g. format date) | 工具箱 |

---

## 2. Express 应用的启动流程

### 两个文件分开：`server.js` vs `app.js`

```js
// server.js — 负责"启动"
const app = require('./src/app');
app.listen(3000, () => console.log('Server running'));
```

```js
// app.js — 负责"配置"
const express = require('express');
const app = express();
app.use(cors());
app.use(express.json());
// ...
module.exports = app;
```

**为什么分开？**
- `app.js` export 出来可以被测试框架 import，不用真的启动 server
- `server.js` 只负责监听端口，跟业务逻辑无关

### `npm run dev` 发生了什么？

```
npm run dev
  → 执行 "nodemon server.js"
    → nodemon 启动 server.js
      → require('./src/app') 加载 app.js
        → app.js 配置 middleware 和 routes
          → app.listen(3000) 开始监听
            → 每次文件改变，nodemon 自动重启
```

**nodemon** = Node + Monitor。开发时用，不用每次改代码都手动重启。

### Health endpoint 是什么？

```js
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

这是最简单的 endpoint。用途：
- 确认 server 有在跑 (`curl http://localhost:3000/health`)
- 生产环境 load balancer 会定期 call 这个来检查服务健不健康

---

## 3. Prisma：ORM 是什么？为什么用它？

### 什么是 ORM？

**ORM = Object-Relational Mapper**

没有 ORM，你要写原始 SQL：
```js
// 原始 SQL (ugly, error-prone)
const result = await pool.query(
  'SELECT * FROM candidates WHERE id = $1 AND status = $2',
  [id, 'CV_UNDER_REVIEW']
);
```

有了 Prisma：
```js
// Prisma (readable, type-safe)
const candidate = await prisma.candidate.findUnique({
  where: { id, status: 'CV_UNDER_REVIEW' }
});
```

ORM 把 SQL 翻译成你熟悉的 JavaScript 函数调用。

### Prisma 的三样东西

| 东西 | 文件 | 作用 |
|---|---|---|
| **Schema** | `prisma/schema.prisma` | 定义你的数据库 table 长什么样 |
| **Migration** | `prisma/migrations/` | 自动生成的 SQL，记录每次 schema 变化 |
| **Client** | `@prisma/client` (npm 包) | 在 JS 代码里 query 数据库的工具 |

### 工作流程

```
1. 你改 schema.prisma (加一个 column 或 table)
2. 跑 npx prisma migrate dev --name "add_phone_to_candidate"
3. Prisma 自动：
   - 生成 SQL migration 文件
   - 在 PostgreSQL 执行这个 SQL
   - 更新 Prisma Client 的 TypeScript types
4. 你在代码里直接用新的 column
```

### Schema 怎么读？

```prisma
model Candidate {
  id     String @id @default(uuid())  // 主键，自动生成 UUID
  email  String                        // 必填 string
  phone  String?                       // ? = 可以是 null (optional)
  jobId  String
  job    Job    @relation(fields: [jobId], references: [id])  // Foreign key
  status CandidateStatus @default(APPLIED)  // enum，默认值 APPLIED
}
```

- `@id` = 主键 (Primary Key)
- `@default(uuid())` = 自动生成 UUID，不用你手动填
- `String?` = nullable，这个字段可以不填
- `@relation` = 两个 table 之间的关系 (一个 Job 有多个 Candidates)
- `@default(now())` = 自动填当前时间

---

## 4. State Machine：状态机是什么？

> 完整 state diagram 见 `docs/workflow-states.md`

### 核心概念

一个 State Machine 有三样东西：

| 概念 | 是什么 | 例子 |
|---|---|---|
| **State** | 系统"此刻"的状态 | `CV_UNDER_REVIEW` |
| **Event** | 发生了什么事 | `HR_ACCEPT_CV` |
| **Transition** | 规则：state + event → new state | `CV_UNDER_REVIEW` + `HR_ACCEPT_CV` → `INTERVIEW_PENDING` |

### 为什么不直接用一个 boolean 字段？

假设你用 `is_cv_approved = true/false`、`is_interviewed = true/false`、`is_hired = true/false`...

问题：
- 12 个 boolean = 2¹² = 4096 种组合，大部分是非法的
- 你没法知道 candidate 现在"卡在哪一步"
- 代码里要 check 多个 flag 才能决定下一步 — 很容易出 bug

**State machine 的好处**：任何时刻，一个 candidate 只有**一个** `status`，而且只有**合法的 event** 才能改变它。

### 我们的实现

```js
// workflow/states.js — 所有合法的 state
const STATES = {
  APPLIED: 'APPLIED',
  CV_PARSING: 'CV_PARSING',
  // ...
};

// workflow/engine.js (待实现) — transition 规则
// 核心逻辑：
// 1. 收到一个 event
// 2. 查当前 state + 这个 event → 新 state 是什么？
// 3. 更新 DB
// 4. 触发副作用 (发 email、call GLM)
```

---

## 5. API 设计：Conventions 为什么重要？

### RESTful API 是什么？

REST = **Re**presentational **S**tate **T**ransfer。一套设计 HTTP API 的风格约定：

| HTTP Method | 用途 | 例子 |
|---|---|---|
| `GET` | 读取资源 | `GET /candidates` — 列出所有候选人 |
| `POST` | 创建资源 | `POST /jobs` — 创建新职位 |
| `PATCH` | 部分更新 | `PATCH /jobs/:id` — 改某个字段 |
| `PUT` | 完全替换 | 少用 |
| `DELETE` | 删除 | `DELETE /jobs/:id` |

### 为什么统一 response 格式？

我们约定所有 response 长这样：
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

**如果没有统一格式**，frontend 要这样写：
```js
// 每个 API 的 error 格式都不一样，frontend 要猜
if (res.error || res.err || res.message === 'fail' || ...) { ... }
```

**有了统一格式**：
```js
// 永远只 check 一个字段
if (!res.success) { showError(res.error.message); }
```

### JWT Auth 是什么？(预告 — Module 1 会详细讲)

JWT = **J**SON **W**eb **T**oken。

Login 流程：
```
1. Frontend 发 POST /auth/login { email, password }
2. Backend 验证密码
3. Backend 返回一个 JWT token (一串加密字符串)
4. Frontend 把这个 token 存起来 (localStorage)
5. 之后每个 request 都带上: Authorization: Bearer <token>
6. Backend 每次收到 request 就验证这个 token
```

Token 里藏着 user 信息 (id, role)，但**不存在数据库里** — 这就是它轻量的原因。

---

## 6. TypeScript：为什么要用它？

### 大图景

JavaScript 是动态语言 — 你写 `const x = 5` 然后 `x = "hello"` 完全合法，不会报错。这在小项目没问题，但在团队项目中，一个人改了函数的参数格式，另一个人不知道，直到 runtime 才爆炸。

TypeScript = JavaScript + **静态类型系统**。你在写代码时就告诉编译器 "这个变量是 string，这个函数返回 number"，编译器在你 **run 之前** 就帮你找 bug。

### 设置：我们做了什么

**`tsconfig.json`** — TypeScript 编译器的配置文件：

```json
{
  "compilerOptions": {
    "target": "ES2020",       // 编译成哪个版本的 JS
    "module": "commonjs",     // Node.js 用的模块格式
    "outDir": "./dist",       // 编译后的 JS 输出到哪里
    "rootDir": "./",          // 源码在哪里
    "strict": true,           // 开启严格模式（推荐）
    "esModuleInterop": true   // 让 import/export 和 require 兼容
  }
}
```

**`package.json` scripts 变化**：

```json
"dev": "nodemon --exec ts-node server.ts"  // ts-node = 直接执行 .ts 文件，不用先编译
"build": "tsc"                              // 把 .ts 编译成 .js，部署时用
```

**为什么不需要先 compile 再 run？**

开发时用 `ts-node`，它帮你在内存里即时编译，你不用每次改代码都跑 `tsc`。`tsc` 只有部署到生产时才需要。

### JavaScript vs TypeScript 写法对比

**JS（没有类型，随时可以传错误的值）**：
```js
async function parseCV(cvFilePath, jobDescription) {
  return { score: 82 };
}
parseCV(123, null); // 没有报错，但逻辑是错的
```

**TS（类型错误在写代码时就发现）**：
```ts
async function parseCV(cvFilePath: string, jobDescription: string): Promise<GLMAnalysis> {
  return { score: 82, ... };
}
parseCV(123, null); // 编译器立刻报红：Argument of type 'number' is not assignable to type 'string'
```

### Interface：定义数据的形状

```ts
// 这是一个 interface — 相当于告诉 TS "这个对象长什么样"
export interface GLMAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'ACCEPT' | 'REJECT';  // Union type：只能是这两个值之一
  summary: string;
}
```

用了 interface 之后，任何地方用 `GLMAnalysis` 类型的变量，TS 都会帮你检查它有没有缺少字段，或者字段类型对不对。

### `as const` 和 `typeof`：让 State 类型更安全

```ts
// states.ts
export const STATES = {
  APPLIED: 'APPLIED',
  CV_REJECTED: 'CV_REJECTED',
  // ...
} as const;  // 告诉 TS：这个对象的值永远不会改变，帮我推断最精确的类型

// 自动生成联合类型：'APPLIED' | 'CV_REJECTED' | ...
export type State = (typeof STATES)[keyof typeof STATES];
```

好处：你在别处用 `State` 类型，如果写了一个不存在的 state 字符串，TS 立刻报错。这比 Prisma enum 更早一层保护。

### 文件扩展名变了，模块语法也变了

| 旧（JS） | 新（TS） |
|---|---|
| `const x = require('./app')` | `import x from './app'` |
| `module.exports = x` | `export default x` 或 `export { x }` |
| `.js` 文件 | `.ts` 文件 |

`import/export` 是 ES Module 标准语法，更现代，更清晰，TypeScript 默认用这个。

---

## 6. Auth Module：密码、JWT、Middleware 怎么运作？

### 大图景

HR 登录系统的完整流程涉及三个安全概念：**密码哈希**、**JWT token**、**Middleware 拦截**。

```
Login 请求
    ↓
POST /auth/login { email, password }
    ↓
auth.controller.ts  ← 读 req，检查格式
    ↓
auth.service.ts     ← 验证密码，生成 JWT
    ↓
返回 token 给 frontend

之后每个需要登录的 request：
    ↓
Authorization: Bearer <token>
    ↓
auth.middleware.ts  ← 验证 token，把 userId 塞进 req
    ↓
controller 直接用 req.userId
```

---

### 密码哈希：为什么不能存明文密码？

数据库被黑了？如果你存的是明文 `password123`，黑客直接拿去用。

**bcryptjs** 把密码变成一串看不懂的字符：

```
"password123"  →  "$2a$10$XgPYf8q3Kx..." (60 个字符的哈希值)
```

这个过程是**单向的**：你没法从哈希值反推回原密码。验证时，bcrypt 把用户输入的密码再哈希一次，比较两个哈希值是否一样。

```ts
// 存入数据库前：
const hashed = await bcrypt.hash("password123", 10); // 10 = cost factor (越高越慢，越安全)

// 验证时：
const isMatch = await bcrypt.compare("password123", hashed); // true
```

`cost factor = 10` 意味着哈希计算需要约 100ms — 对用户无感，但黑客暴力破解要慢 2^10 倍。

---

### JWT：什么是 JSON Web Token？

JWT 是一串加密字符串，格式是三段 Base64 用点连起来：

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhYmMiLCJyb2xlIjoiSFIifQ.SflKxw...
      ↑ Header                  ↑ Payload (数据)              ↑ Signature (签名)
```

**Payload** 里藏着你放进去的数据（明文，只是 Base64 编码，不是加密）：
```json
{ "userId": "abc-123", "role": "HR", "iat": 1234567890, "exp": 1234596490 }
```

**Signature** 是用你的 `JWT_SECRET` 签名的。没有这个 secret，任何人改了 payload，signature 就失效了。

关键点：**JWT 不存在数据库里**。每次收到 request，backend 只需验证 signature 是否合法，就能信任 payload 里的数据。

```ts
// 生成 token（login 时）
const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

// 验证 token（每次 request）
const decoded = jwt.verify(token, JWT_SECRET); // 失败会 throw error
```

---

### Middleware：请求的拦截器

Middleware 就是在 request 到达 controller 之前执行的函数。

```
request → [middleware 1] → [middleware 2] → controller → response
```

`requireAuth` middleware 做三件事：
1. 从 `Authorization` header 拿出 token
2. 验证 token 是否合法
3. 把 `userId` 塞进 `req`，让后续的 controller 直接用

```ts
// 用法：哪个 route 需要登录，就加 requireAuth
router.get('/me', requireAuth, authController.me);
//                  ↑ 这个 middleware 先跑，通过了才到 controller
```

如果没有 token 或 token 过期，middleware 直接返回 `401 Unauthorized`，controller 根本不会被执行。

---

### 建了哪些文件

| 文件 | 作用 |
|---|---|
| `src/services/auth.service.ts` | 业务逻辑：验证密码、生成 JWT、查 user |
| `src/controllers/auth.controller.ts` | 处理 HTTP：读 req body，call service，写 res |
| `src/routes/auth.routes.ts` | 注册 URL：`POST /login`、`GET /me` |
| `src/middleware/auth.middleware.ts` | 保护 route：验证 JWT，提取 userId |
| `src/config/prisma.ts` | Prisma client 的 singleton |
| `prisma/seed.ts` | 建测试 HR 账号（`npm run seed`） |

---
