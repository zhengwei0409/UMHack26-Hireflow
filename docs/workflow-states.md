# Workflow State Diagram


## 1. 什么是 State Machine？

一个 **state machine (状态机)** 有三样东西：
1. **States** — 系统可能处于的所有状态 (例如 `CV_UNDER_REVIEW`)
2. **Events** — 触发状态改变的事件 (例如 `HR_ACCEPTS`)
3. **Transitions** — 规则：在 state A，发生 event X，就跳到 state B

例子：
```
state: CV_UNDER_REVIEW
event: HR_ACCEPTS
→ new state: INTERVIEW_PENDING
```

---

## 2. 所有 States (候选人状态)

| State | 中文 | 说明 |
|---|---|---|
| `APPLIED` | 已申请 | Candidate 刚上传 CV，还没被处理 |
| `CV_PARSING` | CV 分析中 | GLM 正在分析 CV |
| `CV_PARSE_FAILED` | CV 分析失败 | GLM 挂了 / CV 格式错 — 需要 HR 介入 |
| `CV_UNDER_REVIEW` | HR 审核中 | GLM 出了 recommendation，等 HR 决定 |
| `CV_REJECTED` | CV 阶段拒绝 | HR 拒了 — 终止状态 |
| `INTERVIEW_PENDING` | 等待安排面试 | HR点了Accept，等HR安排时间 |
| `INTERVIEW_SCHEDULED` | 面试已安排 | Email发了，等候选人确认 |
| `INTERVIEW_CONFIRMED` | 候选人已确认 | 候选人确认参加面试 |
| `INTERVIEW_RESCHEDULE_REQUESTED` | 候选人请求改期 | 候选人要求改时间 |
| `INTERVIEW_INVITE_FAILED` | 邀请发送失败 | Email API 挂了 — 需要重试 |
| `INTERVIEW_DONE` | 面试完成 | 面试结束，等 HR 决定 |
| `INTERVIEW_REJECTED` | 面试阶段拒绝 | HR 面试后拒了 — 终止状态 |
| `OFFER_GENERATING` | Offer 生成中 | GLM 在写 offer letter |
| `OFFER_SENT` | Offer 已发 | Offer email 发出去了 |
| `HIRED` | 已入职 | 终止状态 ✅ |
| `FAILED` | 系统失败 | 终止状态 ❌ 需要 HR 手动处理 |

---

## 3. Events (触发事件)

| Event | 谁触发 | 说明 |
|---|---|---|
| `CV_UPLOADED` | Candidate | 上传 CV 到 portal |
| `GLM_PARSE_SUCCESS` | System (GLM service) | GLM 成功分析 CV |
| `GLM_PARSE_FAIL` | System | GLM 失败 |
| `HR_ACCEPT_CV` | HR | HR 审核后点 Accept |
| `HR_REJECT_CV` | HR | HR 审核后点 Reject |
| `HR_SCHEDULE_INTERVIEW` | HR | HR 安排面试时间并发送邮件 |
| `INTERVIEW_CONFIRMED` | Candidate | 候选人确认面试 |
| `RESCHEDULE_REQUESTED` | Candidate | 候选人请求改期 |
| `HR_MARK_INTERVIEW_DONE` | HR | HR 标记面试完成 |
| `HR_ACCEPT_INTERVIEW` | HR | 面试后 HR Accept |
| `HR_REJECT_INTERVIEW` | HR | 面试后 HR Reject |
| `OFFER_GENERATED` | System (GLM) | Offer letter 写好了 |
| `OFFER_EMAIL_SENT` | System | Offer 发给 candidate |
| `RETRY` | HR | 从失败状态重试 |

---

## 4. Transitions (状态转移图)

```
[START]
   │
   │ CV_UPLOADED
   ▼
APPLIED
   │
   │ (auto) → send to GLM
   ▼
CV_PARSING
   │
   ├── GLM_PARSE_SUCCESS ──▶ CV_UNDER_REVIEW
   │                              │
   │                              ├── HR_REJECT_CV ──▶ CV_REJECTED [END]
   │                              │
   │                              └── HR_ACCEPT_CV ──▶ INTERVIEW_PENDING
   │                                                        │
   │                                                        ├── HR_SCHEDULE_INTERVIEW ──▶ INTERVIEW_SCHEDULED
   │                                                        │                         │
   │                                                        │                         ├── INTERVIEW_CONFIRMED ──▶ (等面试)
   │                                                        │                         │
   │                                                        │                         ├── RESCHEDULE_REQUESTED ──▶ (HR安排新课程)
   │                                                        │                         │
   │                                                        │                         │ HR_MARK_INTERVIEW_DONE
   │                                                        │                         ▼
   │                                                        │                   INTERVIEW_DONE
   │                                                        │                         │
   │                                                        │                         ├── HR_REJECT_INTERVIEW ──▶ INTERVIEW_REJECTED [END]
   │                                                        │                         │
   │                                                        │                         └── HR_ACCEPT_INTERVIEW ──▶ OFFER_GENERATING
   │                                                        │                                                          │
   │                                                        │                                                          │ OFFER_GENERATED
   │                                                        │                                                          ▼
   │                                                        │                                                     OFFER_SENT
   │                                                        │                                                          │
   │                                                        │                                                          │ OFFER_ACCEPTED
   │                                                        │                                                          ▼
   │                                                        │                                                       HIRED [END]
   │                                                        │
   │                                                        └── INVITE_FAIL ──▶ INTERVIEW_INVITE_FAILED
   │                                                                                  │
   │                                                                                  │ RETRY
   │                                                                                  ▼
   │                                                                           (back to INTERVIEW_PENDING)
   │
   └── GLM_PARSE_FAIL ──▶ CV_PARSE_FAILED
                               │
                               │ RETRY
                               ▼
                         (back to CV_PARSING)
```

---
