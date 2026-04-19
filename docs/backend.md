# Backend API Documentation

> **Owner**: Backend Developer
> **Stack**: Node.js + Express + PostgreSQL + Prisma ORM
> **Base URL**: `http://localhost:3000/api/v1`

---

## 📦 Module Overview

| # | Module | Status | Priority | 说明 |
|---|---|---|---|---|
| 1 | [Auth](#module-1-auth) | ✅ | P0 | HR 登录 |
| 2 | [Jobs](#module-2-jobs) | ✅ | P0 | Job posting CRUD |
| 3 | [Candidates](#module-3-candidates) | ✅ | P0 | CV 上传、候选人列表 |
| 4 | [Workflow Actions](#module-4-workflow-actions) | ✅ | P0 | HR Accept/Reject API endpoints |

**Legend**: ⬜ Not started · 🟡 In progress · ✅ Done
**Priority**: P0 = demo 必须

> **Not in scope (其他队友负责)**:
> - GLM integration → AI/ML Engineer (`glm.service.ts`)
> - Email sending, offer letter, interview scheduling → Workflow Engineer
> - Frontend UI → Frontend Developer

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

### `POST /auth/register`
注册新 HR 账号。

**Request**:
```json
{
  "email": "hr@company.com",
  "password": "password123",
  "name": "Jane HR"
}
```

**Response (201)**:
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

**Errors**: `409 EMAIL_TAKEN`, `400 VALIDATION_ERROR`

---

### `POST /auth/login`
HR 用 email + password 登录。

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

**Errors**: `401 INVALID_CREDENTIALS`, `400 VALIDATION_ERROR`

---

### `GET /auth/google`
发起 Google OAuth 登录。**Public**。

前端直接跳转到这个 URL：
```
http://localhost:3000/api/v1/auth/google
```

会自动 redirect 到 Google 登录页，不需要 request body。

---

### `GET /auth/google/callback`
Google OAuth callback。**由 Google 自动调用，前端不需要直接 call**。

登录成功后 redirect 到：
```
http://localhost:5173/auth/callback?token=eyJhbGc...
```

前端在 `/auth/callback` 页面读取 token：
```js
const token = new URLSearchParams(window.location.search).get('token');
```

逻辑：用 Google 返回的 email 查数据库，有就直接登录，没有就自动创建新 HR 账号（`password` 为空）。

**Errors**: `400 MISSING_CODE`, `500 GOOGLE_AUTH_FAILED`

---

### `GET /auth/me`
获取当前登录的 HR 资料。需要 JWT。

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "hr@company.com",
    "name": "Jane HR",
    "role": "HR"
  }
}
```

**Errors**: `401 UNAUTHORIZED`, `404 USER_NOT_FOUND`

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

### `GET /candidates/:id/history`
返回 candidate 的所有 state 变化记录。

**Response (200)**:
```json
{
  "success": true,
  "data": [
    { "from": null, "to": "APPLIED", "event": "CV_UPLOADED", "triggeredBy": "SYSTEM", "at": "..." },
    { "from": "CV_UNDER_REVIEW", "to": "INTERVIEW_PENDING", "event": "HR_ACCEPT_CV", "triggeredBy": "hr-uuid", "at": "..." }
  ]
}
```

---

## Module 4: Workflow Actions

> 提供 HR 做决定的 API endpoints。**只负责更新状态 + 记录 history**。
> 后续自动触发 (发 email、schedule 面试) 由 Workflow Engineer 负责。

### `POST /candidates/:id/actions/accept-cv`
HR 审核 CV 后 Accept。状态：`CV_UNDER_REVIEW` → `INTERVIEW_PENDING`。

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

**Errors**: `404 CANDIDATE_NOT_FOUND`, `409 INVALID_STATE_FOR_ACTION`

---

### `POST /candidates/:id/actions/reject-cv`
Reject CV 阶段。状态：`CV_UNDER_REVIEW` → `CV_REJECTED`。

---

### `POST /candidates/:id/actions/mark-interview-done`
HR 标记面试已完成。状态：`INTERVIEW_SCHEDULED` → `INTERVIEW_DONE`。

---

### `POST /candidates/:id/actions/accept-interview`
面试后 Accept。状态：`INTERVIEW_DONE` → `OFFER_GENERATING`。

---

### `POST /candidates/:id/actions/reject-interview`
面试后 Reject。状态：`INTERVIEW_DONE` → `INTERVIEW_REJECTED`。

---

### `POST /candidates/:id/actions/retry`
从失败状态 retry。

| 当前状态 | Retry 后 |
|---|---|
| `CV_PARSE_FAILED` | `CV_PARSING` |
| `INTERVIEW_INVITE_FAILED` | `INTERVIEW_PENDING` |
| `FAILED` | `CV_PARSING` |

**Errors**: `409 RETRY_NOT_ALLOWED`, `409 CANDIDATE_IN_TERMINAL_STATE`

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
  glmAnalysis  Json?
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
  triggeredBy String?
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
