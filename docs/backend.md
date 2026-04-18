# Backend API Documentation

> **Stack**: Node.js + Express + PostgreSQL + Prisma ORM
> **Base URL**: `http://localhost:3000/api/v1`
>

---

## 📦 Module Overview

| # | Module | Status | Priority | 说明 |
|---|---|---|---|---|
| 1 | [Auth](#module-1-auth) | ⬜ | P0 | HR 登录 |
| 2 | [Jobs](#module-2-jobs) | ⬜ | P0 | Job posting CRUD |
| 3 | [Candidates](#module-3-candidates) | ⬜ | P0 | CV 上传、候选人列表 |
| 4 | [Workflow](#module-4-workflow) | ⬜ | P0 | HR Accept/Reject 操作 |
| 5 | [GLM Integration](#module-5-glm-integration) | ⬜ | P0 | 触发 AI 分析 (internal) |
| 6 | [Email](#module-6-email) | ⬜ | P1 | 发送邀请/offer email |
| 7 | [Calendar](#module-7-calendar) | ⬜ | P1 | Google Calendar 集成 |
| 8 | [Onboarding](#module-8-onboarding) | ⬜ | P2 | 账号创建、IT 请求 |

**Legend**: ⬜ Not started · 🟡 In progress · ✅ Done  
**Priority**: P0 = demo 必须 · P1 = demo 最好有 · P2 = bonus

---

## 🛠 Conventions (所有 endpoint 都遵守)

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>   (除了 login 和 candidate 上传 CV)
```

### Success Response Format
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required"
  }
}
```

### HTTP Status Codes
- `200` OK — 成功
- `201` Created — 资源创建成功
- `400` Bad Request — 请求参数错误
- `401` Unauthorized — 没登录
- `403` Forbidden — 没权限
- `404` Not Found — 资源不存在
- `500` Internal Server Error — 服务器错误

---

## Module 1: Auth

> HR 登录系统。Candidate 不需要登录 (他们通过 public link 上传 CV)。

### `POST /auth/login`
HR 登录。

**Request**:
```json
{
  "email": "hr@company.com",
  "password": "password123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "hr@company.com",
      "name": "Jane HR",
      "role": "HR"
    }
  }
}
```

### `GET /auth/me`
获取当前登录的 HR 资料。

**Response (200)**: 同上的 `user` object。

---

## Module 2: Jobs

> HR 创建招聘岗位。Candidate 看到的申请 portal 是基于 job 的。

### `POST /jobs`
创建新 job posting。

**Request**:
```json
{
  "title": "Software Engineer",
  "department": "Engineering",
  "description": "We are looking for...",
  "requirements": ["3+ years experience", "React", "Node.js"],
  "location": "Kuala Lumpur"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "job-uuid",
    "title": "Software Engineer",
    "publicApplyUrl": "http://localhost:5173/apply/job-uuid",
    "createdAt": "2026-04-18T10:00:00Z"
  }
}
```

### `GET /jobs`
列出所有 jobs (HR dashboard 用)。

**Query params**: `?status=open&page=1&limit=20`

### `GET /jobs/:id`
获取单个 job 详情。**Public** (candidate 不需登录就能看)。

### `PATCH /jobs/:id`
更新 job。

### `DELETE /jobs/:id`
关闭 job (软删除，status 改成 `closed`)。

---

## Module 3: Candidates

> Candidate 上传 CV，HR 查看候选人列表。

### `POST /candidates/apply`
Candidate 上传 CV。**Public endpoint (不需登录)**。

**Request**: `multipart/form-data`
- `jobId`: string (required)
- `fullName`: string (required)
- `email`: string (required)
- `phone`: string (optional)
- `cvFile`: file (required, PDF/DOCX, max 5MB)

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "candidateId": "uuid",
    "status": "APPLIED",
    "message": "Application received. We will contact you soon."
  }
}
```

### `GET /candidates`
HR 看所有候选人列表。

**Query params**: `?jobId=xxx&status=CV_UNDER_REVIEW&page=1`

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "fullName": "John Doe",
        "email": "john@example.com",
        "jobTitle": "Software Engineer",
        "status": "CV_UNDER_REVIEW",
        "glmScore": 85,
        "appliedAt": "2026-04-18T10:00:00Z"
      }
    ],
    "pagination": { "page": 1, "total": 42 }
  }
}
```

### `GET /candidates/:id`
获取单个 candidate 完整信息，包括：
- 基本资料
- GLM 分析结果 (match score, strengths, weaknesses, recommendation)
- CV 文件下载 link
- Status history (所有 state 变化记录)

### `GET /candidates/:id/cv`
下载 CV 文件 (return the PDF)。

---

## Module 4: Workflow

> HR 在每个 checkpoint 做决定 (Accept/Reject)。这是整个系统的核心。

### `POST /candidates/:id/actions/accept-cv`
HR 审核 CV 后 Accept。

**Request**: (空 body 或 optional note)
```json
{
  "note": "Strong background, proceed to interview"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "candidateId": "uuid",
    "previousStatus": "CV_UNDER_REVIEW",
    "newStatus": "INTERVIEW_PENDING",
    "nextActions": ["Email will be sent automatically"]
  }
}
```

### `POST /candidates/:id/actions/reject-cv`
Reject CV 阶段。

### `POST /candidates/:id/actions/mark-interview-done`
HR 标记面试已完成。

### `POST /candidates/:id/actions/accept-interview`
面试后 Accept → 触发 offer 生成。

### `POST /candidates/:id/actions/reject-interview`
面试后 Reject。

### `POST /candidates/:id/actions/retry`
从失败状态 retry (例如 `CV_PARSE_FAILED`, `INTERVIEW_INVITE_FAILED`)。

### `GET /candidates/:id/history`
返回 candidate 的所有 state 变化。

```json
{
  "success": true,
  "data": [
    { "from": null, "to": "APPLIED", "event": "CV_UPLOADED", "at": "..." },
    { "from": "APPLIED", "to": "CV_PARSING", "event": "AUTO", "at": "..." },
    { "from": "CV_PARSING", "to": "CV_UNDER_REVIEW", "event": "GLM_PARSE_SUCCESS", "at": "..." }
  ]
}
```

---

## Module 5: GLM Integration

> **Internal module** — 不直接暴露给 frontend。由 backend/workflow engine 内部 call。
>
> 由 AI/ML Engineer 实现 `glm.service.js`，backend 只负责 call。

### Functions (内部 API，不是 HTTP)

```js
glmService.parseCV(cvFilePath, jobDescription)
// Returns: { score: 85, strengths: [...], weaknesses: [...], recommendation: "ACCEPT" }

glmService.generateOfferLetter(candidateInfo, jobInfo)
// Returns: { subject: "...", body: "..." }

glmService.generateInterviewQuestions(cvAnalysis, jobDescription)
// Returns: ["Q1...", "Q2...", ...]
```

### Failure handling
- Timeout: 30s
- Retry: 3 次 (exponential backoff)
- 全部失败 → 触发 `GLM_PARSE_FAIL` event

---

## Module 6: Email

> 发送 email (SendGrid / Resend / Nodemailer + Gmail SMTP)。

### Internal functions

```js
emailService.sendInterviewInvitation(candidate, interviewDetails)
emailService.sendOfferLetter(candidate, offerContent)
emailService.sendRejectionEmail(candidate, reason)
```

### Config (.env)
```
EMAIL_PROVIDER=resend
RESEND_API_KEY=xxx
FROM_EMAIL=hr@yourcompany.com
```

---

## Module 7: Calendar

> Google Calendar integration — 订面试时间。

### Internal functions

```js
calendarService.createInterviewEvent({
  candidateEmail,
  hrEmail,
  startTime,
  duration: 60,
  title: "Interview: John Doe"
})
// Returns: { eventId, meetLink, calendarUrl }
```

### OAuth setup 要做的事
1. 在 Google Cloud Console 开 project
2. 启用 Google Calendar API
3. 下载 OAuth credentials → 存成 `credentials.json`
4. 第一次跑的时候 HR 授权一次 → 存 refresh token

---

## Module 8: Onboarding

> 最后一步 — bonus feature，时间不够可以砍。

### `POST /candidates/:id/actions/start-onboarding`
触发入职流程：
- 在 `employees` 表建 record
- 发 welcome email
- 建 IT equipment request (mock: 存到 `it_requests` 表)

---

## 🗄 Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(HR)
  createdAt DateTime @default(now())
}

model Job {
  id           String   @id @default(uuid())
  title        String
  department   String
  description  String
  requirements String[]
  location     String
  status       JobStatus @default(OPEN)
  createdAt    DateTime @default(now())
  candidates   Candidate[]
}

model Candidate {
  id           String   @id @default(uuid())
  fullName     String
  email        String
  phone        String?
  cvFilePath   String
  jobId        String
  job          Job      @relation(fields: [jobId], references: [id])
  status       CandidateStatus @default(APPLIED)
  glmAnalysis  Json?    // GLM 返回的完整 JSON
  glmScore     Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  history      StatusHistory[]
}

model StatusHistory {
  id          String   @id @default(uuid())
  candidateId String
  candidate   Candidate @relation(fields: [candidateId], references: [id])
  fromStatus  String?
  toStatus    String
  event       String
  triggeredBy String?  // user id 或 "SYSTEM"
  metadata    Json?
  createdAt   DateTime @default(now())
}

enum Role { HR ADMIN }
enum JobStatus { OPEN CLOSED }
enum CandidateStatus {
  APPLIED
  CV_PARSING
  CV_PARSE_FAILED
  CV_UNDER_REVIEW
  CV_REJECTED
  INTERVIEW_PENDING
  INTERVIEW_SCHEDULED
  INTERVIEW_INVITE_FAILED
  INTERVIEW_DONE
  INTERVIEW_REJECTED
  OFFER_GENERATING
  OFFER_SENT
  ONBOARDING
  HIRED
  FAILED
}
```

---

## 🚀 Suggested Build Order (8 天计划)

| Day | 目标 |
|---|---|
| Day 1 | 环境搭建：Express + Prisma + Postgres + folder structure + .env |
| Day 2 | Module 1 (Auth) + Module 2 (Jobs) |
| Day 3 | Module 3 (Candidates) + 文件上传 (multer) |
| Day 4 | Module 4 (Workflow actions) + state machine skeleton |
| Day 5 | Module 5 (GLM integration) — 先 mock 再接真的 API |
| Day 6 | Module 6 (Email) + Module 7 (Calendar) |
| Day 7 | Module 8 (Onboarding) + 边缘情况处理 + 日志 |
| Day 8 | 集成测试 + demo 脚本 + 部署 |

---

