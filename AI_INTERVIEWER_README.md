# HireFlow AI Interviewer — Deployment Guide

> Automated AI meeting bot for conducting HR interviews via Google Meet

---

## Overview

HireFlow AI Interviewer is an automated bot that joins Google Meet meetings and conducts interviews using AI. It:

- Joins meetings automatically via browser automation
- Listens to candidate responses (Speech-to-Text via Whisper)
- Processes answers with AI (DeepSeek/ILMU GLM)
- Responds verbally (Text-to-Speech via Kokoro)
- Saves transcripts after the interview

---

## Prerequisites

| Requirement | Version |
|---|---|
| macOS / Linux | Latest |
| Docker Desktop | 4.28+ |
| Chrome/Chromium | Latest |
| Python | 3.12+ |
| API Key | DeepSeek API ([get key](https://platform.deepseek.com)) |

---

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/zhengwei0409/UMHack26-Hireflow.git
cd UMHack26-Hireflow
git checkout ai-interviewer
```

### 2. Configure API Key

```bash
cp .env.example .env
```

Edit `.env` and set your DeepSeek API key:

```env
# DeepSeek / ILMU AI
JOINLY_LLM_MODEL=deepseek-chat
JOINLY_LLM_PROVIDER=ilmu
ILMU_API_KEY=sk-your-deepseek-api-key
ILMU_BASE_URL=https://api.deepseek.com/v1
```

### 3. Start Dashboard

```bash
cd dashboard
uv sync
uv run python -m main
# → http://localhost:8001
```

### 4. Create & Start a Bot

1. Open http://localhost:8001
2. Go to **Library** tab → select an agent template (e.g., "HR Interviewer")
3. Go to **Bots** tab → click **New Bot**
4. Enter:
   - Bot Name: "Interview Bot 1"
   - Meeting URL: Your Google Meet link
5. Click **Create** → bot starts automatically
6. The bot will join the meeting and wait for speech

### 5. Monitor Transcript

- Live transcript appears in the **Transcript** panel
- After bot stops, transcript is saved to `transcripts/` folder

---

## Agent Templates

| Template | Use Case |
|---|---|
| HR Interviewer | General HR screening questions |
| Sales Rep | Sales role interviews |
| Customer Support | Support role interviews |
| Technical Interviewer | Technical/engineering questions |
| Training Coach | Training and onboarding |
| Meeting Notetaker | Meeting documentation |
| Product Demo | Product demonstration |
| Behavioral Interviewer | Behavioral questions (STAR method) |

---

## Troubleshooting

### Bot doesn't join meeting

- Ensure meeting URL is correct and publicly accessible
- Check Docker is running (`docker ps`)
- Check `.env` has valid `ILMU_API_KEY`

### No audio/Speech not detected

- On Mac, use **headphones** in the meeting (no built-in audio output)
- Ensure browser has microphone permissions

### Bot crashes or freezes

- Increase Docker memory: Docker Desktop → Settings → Resources → 4GB+
- Or add to Docker run command: `--shm-size=2g`

### Transcript not saving

- Ensure `transcripts/` folder exists and is writable
- Check bot logs in dashboard

---

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Dashboard  │────▶│   Docker     │────▶│  Browser    │
│  (FastAPI)   │     │ (joinly)    │     │ (Chromium)  │
└──────────────┘     └──────────────┘     └──────────────┘
       │                   │                   │
       │ created           │ transcribes        │ joins meeting
       ▼                   ▼                   ▼
  Bot Registry    ┌──────────────┐     ┌──────��───────┐
                  │ Whisper     │     │ Google Meet │
                  │ (STT)       │     │             │
                  └──────────────┘     └──────────────┘
                         │                   │
                         ▼                   ▼
                  ┌──────────────┐     ┌──────────────┐
                  │ DeepSeek    │◀────│   TTS       │
                  │ (LLM)      │     │ (Kokoro)    │
                  └──────────────┘     └──────────────┘
```

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/bots` | GET | List all bots |
| `/api/bots` | POST | Create new bot |
| `/api/bots/{id}` | DELETE | Stop and delete bot |
| `/api/bots/{id}/transcript` | GET | Get bot transcript |
| `/api/library` | GET | List agent templates |
| `/api/transcripts` | GET | List saved transcripts |

---

## Files

| File | Purpose |
|---|---|
| `dashboard/main.py` | FastAPI dashboard server |
| `joinly/` | MCP server package |
| `docker/Dockerfile` | Docker image for bot |
| `.env.example` | Environment template |
| `transcripts/` | Saved transcripts |

---

## License

MIT