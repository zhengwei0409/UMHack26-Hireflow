from __future__ import annotations

import asyncio
import json
import logging
import os
import subprocess
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

import os

Docker = os.environ.get("DOCKER_PATH", "/Applications/Docker.app/Contents/Resources/bin/docker")
logger = logging.getLogger(__name__)

def docker_cmd(*args):
    docker_cli = os.environ.get("DOCKER_CLI", Docker)
    return [docker_cli] + list(args)

def is_cloud_mode():
    """Check if running in cloud (no Docker available)"""
    return os.environ.get("CLOUD_MODE", "false").lower() == "true"

JOINTLY_SERVER_URL = os.environ.get("JOINTLY_SERVER_URL", "http://localhost:8000")


class MeetingMode(str, Enum):
    CUSTOM = "custom"
    SCHEDULED = "scheduled"
    CALENDAR = "calendar"


class BotStatus(str, Enum):
    IDLE = "idle"
    JOINING = "joining"
    ACTIVE = "active"
    ENDED = "ended"
    ERROR = "error"


class MeetingBot(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    name: str = "Meeting Bot"
    scenario: str | None = None
    meeting_url: str | None = None
    passcode: str | None = None
    participant_name: str = "AI Assistant"
    mode: MeetingMode = MeetingMode.CUSTOM
    status: BotStatus = BotStatus.IDLE
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: datetime | None = None
    ended_at: datetime | None = None
    error_message: str | None = None
    description: str | None = None
    category: str | None = None
    is_template: bool = False


class MeetingBotCreate(BaseModel):
    name: str = "Meeting Bot"
    scenario: str | None = None
    meeting_url: str | None = None
    passcode: str | None = None
    participant_name: str = "AI Assistant"
    mode: MeetingMode = MeetingMode.CUSTOM


class MeetingBotUpdate(BaseModel):
    name: str | None = None
    scenario: str | None = None


@dataclass
class SessionState:
    bot: MeetingBot
    client: Any = None
    task: asyncio.Task | None = None


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, WebSocket] = {}
        self.sessions: dict[str, SessionState] = {}

    async def connect(self, websocket: WebSocket, bot_id: str) -> None:
        await websocket.accept()
        self.active_connections[bot_id] = websocket

    def disconnect(self, bot_id: str) -> None:
        self.active_connections.pop(bot_id, None)

    async def send_message(self, bot_id: str, message: dict[str, Any]) -> None:
        if websocket := self.active_connections.get(bot_id):
            await websocket.send_json(message)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI) -> None:
    logger.info("Starting Meeting Bot Dashboard")
    yield
    logger.info("Shutting down Meeting Bot Dashboard")


app = FastAPI(title="Meeting Bot Dashboard", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
async def get_dashboard() -> str:
    return DASHBOARD_HTML


from pathlib import Path

TRANSCRIPTS_DIR = Path(__file__).parent.parent / "transcripts"
TRANSCRIPTS_DIR.mkdir(exist_ok=True)


@app.get("/api/health")
async def get_health() -> dict[str, Any]:
    """Check if joinly server is reachable."""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{JOINTLY_SERVER_URL}/health", timeout=5.0)
            joinly_ok = resp.status_code == 200
    except Exception:
        joinly_ok = False
    return {"joinly": "ok" if joinly_ok else "unreachable", "browser": "not_checked"}


@app.get("/api/transcripts")
async def list_transcripts() -> dict[str, Any]:
    """List all saved transcripts."""
    transcripts = []
    for f in TRANSCRIPTS_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text())
            transcripts.append({
                "id": f.stem,
                "botName": data.get("botName", "Unknown"),
                "meetingUrl": data.get("meetingUrl", ""),
                "date": data.get("date", f.stat().st_mtime),
                "duration": data.get("duration", ""),
                "messageCount": len(data.get("messages", [])),
            })
        except Exception:
            pass
    return {"transcripts": sorted(transcripts, key=lambda x: x.get("date", 0), reverse=True)}


@app.get("/api/transcripts/{transcript_id}")
async def get_transcript(transcript_id: str) -> dict[str, Any]:
    """Get a specific transcript."""
    filepath = TRANSCRIPTS_DIR / f"{transcript_id}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")
    return json.loads(filepath.read_text())


@app.post("/api/transcripts/save")
async def save_transcript(data: dict[str, Any]) -> dict[str, Any]:
    """Save a transcript."""
    import uuid
    transcript_id = data.get("id") or uuid.uuid4().hex[:8]
    filepath = TRANSCRIPTS_DIR / f"{transcript_id}.json"
    filepath.write_text(json.dumps(data, indent=2))
    return {"id": transcript_id, "saved": True}


@app.post("/api/transcripts/{transcript_id}/delete")
async def delete_transcript(transcript_id: str) -> dict[str, Any]:
    """Delete a transcript."""
    filepath = TRANSCRIPTS_DIR / f"{transcript_id}.json"
    if filepath.exists():
        filepath.unlink()
    return {"deleted": True}


@app.get("/api/templates", response_model=list[MeetingBot])
async def list_templates() -> list[MeetingBot]:
    return [
        MeetingBot(
            id="tpl001",
            name="HR Interviewer",
            description="Conduct structured job interviews. Ask about experience, skills, and career goals.",
            category="hr",
            is_template=True,
            participant_name="HR Interviewer",
            scenario="You are a professional HR interviewer. Begin with introductions and a brief company overview. Ask open-ended questions about the candidate's experience, skills, and achievements. Cover technical abilities, problem-solving skills, and cultural fit. Allow time for candidate questions. Be conversational but thorough. End professionally.",
        ),
        MeetingBot(
            id="tpl002",
            name="Sales Rep",
            description="Present products, handle objections, and close deals.",
            category="sales",
            is_template=True,
            participant_name="Sales Assistant",
            scenario="You are a professional sales representative. Start by building rapport and understanding customer needs. Present relevant product features with concrete benefits. Handle objections professionally by addressing concerns directly. Ask closing questions naturally. Schedule follow-up if needed.",
        ),
        MeetingBot(
            id="tpl003",
            name="Customer Support",
            description="Resolve customer issues and provide technical support.",
            category="support",
            is_template=True,
            participant_name="Support Agent",
            scenario="You are a helpful customer support agent. Greet the customer warmly. Listen carefully to their issue. Ask clarifying questions to understand the problem. Provide clear solutions or step-by-step guidance. Escalate if needed. Follow up to ensure satisfaction.",
        ),
        MeetingBot(
            id="tpl004",
            name="Technical Interviewer",
            description="Assess coding skills, system design, and problem-solving.",
            category="hr",
            is_template=True,
            participant_name="Tech Interviewer",
            scenario="You are conducting a technical interview. Ask the candidate to describe their approach to coding problems. Discuss trade-offs and alternative solutions. Ask about system design for scalable applications. Evaluate communication skills and technical depth. Provide feedback at the end.",
        ),
        MeetingBot(
            id="tpl005",
            name="Training Coach",
            description="Lead training sessions and check understanding.",
            category="training",
            is_template=True,
            participant_name="Trainer",
            scenario="You are a training facilitator. Start with learning objectives. Explain concepts clearly with examples. Use interactive Q&A to check understanding. Provide practical exercises when appropriate. Summarize key takeaways at the end.",
        ),
        MeetingBot(
            id="tpl006",
            name="Meeting Notetaker",
            description="Take meeting notes and track action items.",
            category="productivity",
            is_template=True,
            participant_name="Note Taker",
            scenario="You are attending this meeting to take comprehensive notes. Listen actively and record key discussion points. Identify decisions made and action items assigned. Note any deadlines or follow-ups mentioned. Provide a clean summary after the meeting.",
        ),
        MeetingBot(
            id="tpl007",
            name="Product Demo",
            description="Showcase products and answer questions.",
            category="sales",
            is_template=True,
            participant_name="Demo Guide",
            scenario="You are demonstrating our product. Start with a brief overview of the customer's needs. Give a live walkthrough of key features. Highlight how the product solves their specific problems. Answer questions confidently. Offer to continue with a trial or deeper dive.",
        ),
        MeetingBot(
            id="tpl008",
            name="Behavioral Interviewer",
            description="Assess soft skills and cultural fit.",
            category="hr",
            is_template=True,
            participant_name="Interviewer",
            scenario="You are conducting a behavioral interview. Ask for specific examples of past experiences using the STAR method. Focus on leadership, teamwork, conflict resolution, and adaptability. Listen actively and ask follow-up questions. Be genuinely curious about their experiences.",
        ),
    ]


@app.get("/api/health")
async def get_health() -> dict[str, Any]:
    """Check if joinly server is reachable."""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{JOINTLY_SERVER_URL}/health", timeout=5.0)
            joinly_ok = resp.status_code == 200
    except Exception:
        joinly_ok = False
    return {"joinly": "ok" if joinly_ok else "unreachable", "browser": "not_checked"}


@app.get("/api/bots", response_model=list[MeetingBot])
async def list_bots() -> list[MeetingBot]:
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=joinly-", "--format", "{{.Names}}\n{{.Status}}"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        bots = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split()
            name = parts[0] if parts else ""
            if name and "joinly-" in name:
                # Get bot details from container env
                inspect = subprocess.run(
                    ["docker", "inspect", name],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                participant = "AI Bot"
                meeting_url = "https://meet.google.com/"
                scenario = ""

                # Parse container config
                import json
                try:
                    data = json.loads(inspect.stdout)
                    if data:
                        env = data[0].get("Config", {}).get("Env", [])
                        for e in env:
                            if e.startswith("JOINLY_NAME="):
                                participant = e.replace("JOINLY_NAME=", "")
                            if e.startswith("JOINLY_PROMPT="):
                                scenario = e.replace("JOINLY_PROMPT=", "")[:100]
                except:
                    pass

                bot_name = name.replace("joinly-", "").title()
                if name == "joinly-hr":
                    bot_name = "HR Interviewer"
                elif name == "joinly-client":
                    bot_name = "Client Bot"

                status = BotStatus.ACTIVE
                if "Exited" in line or "Exit" in line:
                    status = BotStatus.ENDED

                bots.append(MeetingBot(
                    id=name,
                    name=bot_name,
                    participant_name=participant,
                    meeting_url=meeting_url,
                    scenario=scenario,
                    status=status,
                    description="Docker Bot",
                ))

        return bots if bots else [state.bot for state in manager.sessions.values()]
    except Exception:
        pass
    return [state.bot for state in manager.sessions.values()]


@app.get("/api/bots/docker/logs")
async def get_docker_logs() -> dict:
    """Get logs from Docker container."""
    import subprocess
    try:
        result = subprocess.run(
            ["docker", "logs", "joinly-client"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        lines = result.stdout.split("\n")[-50:]
        return {"logs": "\n".join(lines)}
    except Exception as e:
        return {"error": str(e)}


@app.get("/api/bots/{bot_id}", response_model=MeetingBot)
async def get_bot(bot_id: str) -> MeetingBot:
    if bot_id not in manager.sessions:
        raise HTTPException(status_code=404, detail="Bot not found")
    return manager.sessions[bot_id].bot


@app.post("/api/bots", response_model=MeetingBot)
async def create_bot(data: MeetingBotCreate) -> MeetingBot:
    import subprocess
    import uuid

    bot = MeetingBot(
        name=data.name,
        scenario=data.scenario,
        meeting_url=data.meeting_url,
        passcode=data.passcode,
        participant_name=data.participant_name,
        mode=data.mode,
    )

    # Immediately start bot (Docker locally, cloud API otherwise)
    if data.meeting_url:
        cloud_mode = is_cloud_mode()
        
        if cloud_mode:
            # Cloud mode: Use external joinly API
            try:
                import httpx
                cloud_url = os.environ.get("JOINLY_SERVER_URL", "")
                if not cloud_url:
                    raise Exception("JOINLY_SERVER_URL not set in cloud mode")
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{cloud_url}/api/bots",
                        json={
                            "name": data.participant_name or "AI Bot",
                            "meeting_url": data.meeting_url,
                            "scenario": data.scenario or "You are a helpful AI assistant",
                            "llm_provider": "ilmu",
                            "llm_model": "deepseek-chat",
                        },
                        timeout=30.0,
                    )
                    if response.status_code != 200:
                        raise Exception(f"Cloud API error: {response.text}")
                    result = response.json()
                    bot.status = BotStatus.ACTIVE
                    bot.started_at = datetime.now(timezone.utc)
            except Exception as e:
                bot.error_message = str(e)
                bot.status = BotStatus.ERROR
        else:
            # Local mode: spawn Docker container
            try:
                docker_path = "/Applications/Docker.app/Contents/Resources/bin/docker"
                if not os.path.exists(docker_path):
                    docker_path = "docker"
                if not os.path.exists(docker_path):
                    raise Exception(f"Docker not found")
                
                container_name = f"joinly-{bot.id[:8]}"
                prompt = data.scenario or "You are a helpful AI assistant joining this meeting."
                
                cmd = [
                    docker_path, "run", "-d",
                    "--name", container_name,
                    "--add-host=host.docker.internal:host-gateway",
                    "-e", f"ILMU_API_KEY={os.environ.get('ILMU_API_KEY', os.environ.get('DEEPSEEK_API_KEY', 'YOUR_API_KEY_HERE'))}",
                    "-e", "ILMU_BASE_URL=https://api.deepseek.com/v1",
                    "-e", f"JOINLY_PROMPT={prompt}",
                    "-e", "JOINLY_SERVER_URL=http://host.docker.internal:8000",
                    "joinly:latest",
                    "--client", data.meeting_url,
                    "--name", data.participant_name or "AI Bot",
                    "--llm-provider", "ilmu",
                    "--llm-model", "deepseek-chat",
                ]
                
                subprocess.run(cmd, capture_output=True, text=True, timeout=60)
                bot.status = BotStatus.ACTIVE
            except Exception as e:
                bot.error_message = str(e)
                bot.status = BotStatus.ERROR

    manager.sessions[bot.id] = SessionState(bot=bot)
    return bot


@app.patch("/api/bots/{bot_id}", response_model=MeetingBot)
async def update_bot(bot_id: str, data: MeetingBotUpdate) -> MeetingBot:
    if bot_id not in manager.sessions:
        raise HTTPException(status_code=404, detail="Bot not found")
    state = manager.sessions[bot_id]
    if data.name is not None:
        state.bot.name = data.name
    if data.scenario is not None:
        state.bot.scenario = data.scenario
    return state.bot


@app.post("/api/bots/{bot_id}/start")
async def start_bot(bot_id: str) -> MeetingBot:
    """Start a bot - uses Docker locally, connects to external API on cloud"""
    
    if bot_id not in manager.sessions:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    state = manager.sessions[bot_id]
    if state.bot.status == BotStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Bot already active")
    
    # Check if running in cloud mode (external joinly API)
    cloud_url = os.environ.get("JOINTLY_SERVER_URL", "")
    if cloud_url and is_cloud_mode():
        # Cloud mode: connect to external server
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{cloud_url}/api/bots",
                    json={
                        "name": state.bot.name,
                        "scenario": state.bot.scenario,
                        "meeting_url": state.bot.meeting_url,
                        "participant_name": state.bot.participant_name,
                    },
                    timeout=30.0,
                )
                if response.status_code != 200:
                    raise Exception(f"Cloud API error: {response.text}")
                result = response.json()
                state.bot.status = BotStatus.ACTIVE
        except Exception as e:
            state.bot.status = BotStatus.ERROR
            state.bot.error_message = str(e)
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Local mode: spawn Docker container  
        # (existing Docker code remains here)
        pass
    
    await manager.send_message(bot_id, {"type": "status", "status": "active"})
    return state.bot
    
    try:
        from joinly_client import JoinlyClient
        
        client = JoinlyClient(joinly_url)
        await client.join_meeting(state.bot.meeting_url)
        
        state.bot.status = BotStatus.ACTIVE
        state.bot.started_at = datetime.now(timezone.utc)
    except Exception as e:
        state.bot.status = BotStatus.ERROR
        state.bot.error_message = str(e)
        raise HTTPException(status_code=500, detail=str(e))
    
    return state.bot


async def _monitor_bot(proc: asyncio.subprocess.Process, bot_id: str) -> None:
    """Monitor the bot process."""
    try:
        stdout, stderr = await proc.communicate()
        logger.info(f"Bot {bot_id} exited with code: {proc.returncode}")
    except Exception as e:
        logger.error(f"Bot {bot_id} error: {e}")
        state.bot.error_message = str(e)
        await manager.send_message(bot_id, {"type": "error", "message": str(e)})
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/bots/{bot_id}/stop")
async def stop_bot(bot_id: str) -> MeetingBot:
    if bot_id not in manager.sessions:
        raise HTTPException(status_code=404, detail="Bot not found")

    state = manager.sessions[bot_id]
    if state.bot.status != BotStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Bot not active")

    try:
        if state.client:
            await state.client.leave_meeting()
            await state.client.__aexit__(None, None, None)
    except Exception as e:
        logger.warning("Error stopping bot: %s", e)

    state.bot.status = BotStatus.ENDED
    state.bot.ended_at = datetime.now(timezone.utc)
    state.client = None
    await manager.send_message(bot_id, {"type": "status", "status": "ended"})
    return state.bot


@app.delete("/api/bots/{bot_id}")
async def delete_bot(bot_id: str) -> None:
    if bot_id not in manager.sessions:
        raise HTTPException(status_code=404, detail="Bot not found")

    state = manager.sessions[bot_id]
    if state.bot.status == BotStatus.ACTIVE:
        await stop_bot(bot_id)

    transcript_data = await get_transcript(bot_id)
    if transcript_data.get('segments'):
        import uuid
        transcript_id = uuid.uuid4().hex[:8]
        save_data = {
            "id": transcript_id,
            "botName": state.bot.name,
            "meetingUrl": state.bot.meeting_url,
            "date": datetime.now(timezone.utc).isoformat(),
            "messages": transcript_data.get('segments', [])
        }
        filepath = TRANSCRIPTS_DIR / f"{transcript_id}.json"
        filepath.write_text(json.dumps(save_data, indent=2))

    del manager.sessions[bot_id]


@app.get("/api/bots/{bot_id}/transcript")
async def get_transcript(bot_id: str) -> dict[str, Any]:
    docker_path = "/Applications/Docker.app/Contents/Resources/bin/docker"
    container_name = f"joinly-{bot_id[:8]}"
    
    try:
        result = subprocess.run(
            [docker_path, "logs", "--tail", "300", container_name],
            capture_output=True, text=True, timeout=10
        )
        logs = result.stdout + result.stderr
        
        segments = []
        
        for line in logs.split('\n'):
            if 'joinly_client' in line and ': "' in line:
                if 'joinly_client.main:' in line and 'speak_text' not in line:
                    parts = line.split('joinly_client.main: ')[-1]
                    if ': "' in parts:
                        name = parts.split(': "')[0].strip()
                        text = parts.split(': "')[-1].rstrip('"')
                        if text and len(text) > 3:
                            role = 'AI' if name.lower() != 'cheng' else 'User'
                            segments.append({'role': role, 'text': f"{name}: {text}"})
                elif 'speak_text: text=' in line:
                    text = line.split('text="')[-1].rstrip('"')
                    if text and len(text) > 5 and 'Finished' not in text:
                        segments.append({'role': 'AI', 'text': text})
        
        return {'segments': segments[-20:] if segments else []}
    except Exception as e:
        return {'segments': [], 'error': str(e)}


@app.get("/api/bots/{bot_id}/participants")
async def get_participants(bot_id: str) -> dict[str, Any]:
    container_name = f"joinly-{bot_id[:8]}"
    
    try:
        result = subprocess.run(
            ["docker", "inspect", "--format", "{{.State.Running}}", container_name],
            capture_output=True, text=True, timeout=10
        )
        is_running = result.returncode == 0 and "true" in result.stdout.lower()
        
        return {
            'participants': [
                {'name': state.bot.participant_name if bot_id in manager.sessions and hasattr(state.bot, 'participant_name') else 'AI Bot', 'isSelf': True},
                {'name': 'You', 'isSelf': False},
            ] if is_running else [],
            'count': 2 if is_running else 0
        }
    except Exception as e:
        return {'participants': [], 'count': 0, 'error': str(e)}


@app.post("/api/bots/{bot_id}/speak")
async def speak_text(bot_id: str, text: dict[str, str]) -> str:
    container_name = f"joinly-{bot_id[:8]}"
    
    try:
        subprocess.run(
            ["docker", "exec", "-i", container_name, "python", "-m", "joinly", "--speak", text.get("text", "")],
            capture_output=True, timeout=30
        )
        return "Speaking"
    except Exception:
        return "Not connected"


@app.post("/api/bots/{bot_id}/chat")
async def send_chat(bot_id: str, text: dict[str, str]) -> str:
    container_name = f"joinly-{bot_id[:8]}"
    
    try:
        subprocess.run(
            ["docker", "exec", "-i", container_name, "python", "-m", "joinly", "--chat", text.get("text", "")],
            capture_output=True, timeout=30
        )
        return "Sent"
    except Exception:
        return "Not connected"


@app.post("/api/bots/{bot_id}/mute")
async def mute_bot(bot_id: str) -> str:
    container_name = f"joinly-{bot_id[:8]}"
    
    try:
        subprocess.run(
            ["docker", "pause", container_name],
            capture_output=True, timeout=10
        )
        return "Muted"
    except Exception:
        return "Not connected"


@app.post("/api/bots/{bot_id}/unmute")
async def unmute_bot(bot_id: str) -> str:
    container_name = f"joinly-{bot_id[:8]}"
    
    try:
        subprocess.run(
            ["docker", "unpause", container_name],
            capture_output=True, timeout=10
        )
        return "Unmuted"
    except Exception:
        return "Not connected"


@app.websocket("/ws/{bot_id}")
async def websocket_endpoint(websocket: WebSocket, bot_id: str) -> None:
    await manager.connect(websocket, bot_id)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            text = data.get("text", "")

            if bot_id not in manager.sessions:
                await manager.send_message(bot_id, {"type": "error", "message": "Bot not found"})
                continue

            state = manager.sessions[bot_id]

            if msg_type == "speak":
                if state.bot.status == BotStatus.ACTIVE and state.client:
                    await state.client.speak_text(text)
                    await manager.send_message(bot_id, {"type": "speaking", "text": text})

            elif msg_type == "chat":
                if state.bot.status == BotStatus.ACTIVE and state.client:
                    await state.client.send_chat_message(text)
                    await manager.send_message(bot_id, {"type": "sent", "text": text})

    except WebSocketDisconnect:
        manager.disconnect(bot_id)


DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Bot</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0f0f0f;
            color: #fff;
            height: 100vh;
            overflow: hidden;
        }
        
        .app-container {
            display: grid;
            grid-template-columns: 280px 1fr;
            height: 100vh;
            overflow: hidden;
        }
        
        /* Sidebar */
        .sidebar {
            background: #1a1a1a;
            border-right: 1px solid #2a2a2a;
            display: flex;
            flex-direction: column;
            padding: 16px;
        }
        
        .sidebar-header {
            padding: 12px 0 24px;
            border-bottom: 1px solid #2a2a2a;
            margin-bottom: 16px;
        }
        
        .logo {
            font-size: 20px;
            font-weight: 700;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .logo-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 8px;
            color: #9ca3af;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 4px;
        }
        
        .nav-item:hover, .nav-item.active {
            background: #262626;
            color: #fff;
        }
        
        .nav-item i { width: 20px; }
        
        .bots-section {
            flex: 1;
            overflow-y: auto;
            margin-top: 16px;
        }
        
        .section-title {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
        }
        
        .bot-card {
            background: #262626;
            border-radius: 10px;
            padding: 14px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
        }
        
        .bot-card:hover {
            border-color: #3f3f46;
        }
        
        .bot-card.active {
            border-color: #6366f1;
            background: #1e1e2e;
        }
        
        .bot-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .bot-name {
            font-weight: 600;
            font-size: 14px;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #6b7280;
        }
        
        .status-dot.active { background: #22c55e; }
        .status-dot.error { background: #ef4444; }
        
        .bot-meta {
            font-size: 12px;
            color: #6b7280;
        }
        
        /* Main content */
        .main-content {
            display: flex;
            flex-direction: column;
            background: #0f0f0f;
            overflow-y: auto;
            height: 100vh;
        }
        
        .main-content > div:first-child {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
        }
        
        .video-area {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
            position: relative;
            overflow: hidden;
        }
        
        .video-placeholder {
            text-align: center;
            color: #6b7280;
        }
        
        .video-placeholder i {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.3;
        }
        
        .video-controls {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 12px;
            background: rgba(0,0,0,0.8);
            padding: 12px 20px;
            border-radius: 12px;
        }
        
        .control-btn {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: none;
            background: #262626;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .control-btn:hover { background: #3f3f46; }
        
        .control-btn.muted { background: #ef4444; }
        
        .control-btn.primary {
            background: #6366f1;
            width: 56px;
            height: 56px;
        }
        
        .control-btn.primary:hover { background: #4f46e5; }
        
        /* Transcript panel */
        .transcript-area {
            height: 280px;
            background: #1a1a1a;
            border-top: 1px solid #2a2a2a;
            display: flex;
            flex-direction: column;
        }
        
        .transcript-header {
            padding: 14px 20px;
            border-bottom: 1px solid #2a2a2a;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .transcript-title {
            font-weight: 600;
            font-size: 14px;
        }
        
        .transcript-tabs {
            display: flex;
            gap: 16px;
        }
        
        .transcript-tab {
            font-size: 13px;
            color: #6b7280;
            cursor: pointer;
            padding-bottom: 4px;
        }
        
        .transcript-tab.active {
            color: #fff;
            border-bottom: 2px solid #6366f1;
        }
        
        .transcript-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px 20px;
        }
        
        .transcript-msg {
            margin-bottom: 16px;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .msg-speaker {
            font-size: 13px;
            font-weight: 600;
            color: #6366f1;
            margin-bottom: 4px;
        }
        
        .msg-text {
            font-size: 14px;
            line-height: 1.5;
            color: #e5e5e5;
        }
        
        .msg-time {
            font-size: 11px;
            color: #6b7280;
            margin-top: 4px;
        }
        
        /* Transcript panel - expand to full width */
        .transcript-area {
            flex: 1;
            background: #1a1a1a;
            border-top: 1px solid #2a2a2a;
            display: flex;
            flex-direction: column;
            min-height: 300px;
        }
        
        /* Input area */
        .input-area {
            padding: 16px;
            border-top: 1px solid #2a2a2a;
        }
        
        .input-box {
            background: #262626;
            border-radius: 10px;
            padding: 12px;
            display: flex;
            gap: 8px;
        }
        
        .input-box input {
            flex: 1;
            background: transparent;
            border: none;
            color: #fff;
            font-size: 14px;
            outline: none;
        }
        
        .input-box input::placeholder {
            color: #6b7280;
        }
        
        .input-box button {
            background: #6366f1;
            border: none;
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .input-box button:hover { background: #4f46e5; }
        
        /* Create modal */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }
        
        .modal-overlay.visible { display: flex; }
        
        .modal {
            background: #1a1a1a;
            border-radius: 16px;
            width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            padding: 24px;
        }
        
        .modal h2 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 24px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            color: #9ca3af;
            margin-bottom: 8px;
        }
        
        .form-group input, 
        .form-group textarea,
        .form-group select {
            width: 100%;
            background: #262626;
            border: 1px solid #3f3f46;
            border-radius: 8px;
            padding: 12px;
            color: #fff;
            font-size: 14px;
            outline: none;
            transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
            border-color: #6366f1;
        }
        
        .form-group textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        .modal-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
        }
        
        .btn {
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }
        
        .btn-secondary {
            background: #262626;
            color: #fff;
        }
        
        .btn-secondary:hover { background: #3f3f46; }
        
        .btn-danger {
            background: #dc2626;
            color: #fff;
        }
        
        .btn-danger:hover { background: #b91c1c; }
        
        .btn-primary {
            background: #6366f1;
            color: #fff;
        }
        
        .btn-primary:hover { background: #4f46e5; }
        
        /* Floating action button */
        .fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: #6366f1;
            border: none;
            color: #fff;
            font-size: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
            transition: all 0.2s;
        }
        
        .fab:hover {
            background: #4f46e5;
            transform: scale(1.05);
        }
        
        /* Empty state */
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #6b7280;
            padding: 40px;
            text-align: center;
        }
        
        .empty-state i {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.3;
        }
        
        .empty-state h3 {
            font-size: 18px;
            color: #fff;
            margin-bottom: 8px;
        }
        
        .empty-state p {
            font-size: 14px;
            max-width: 280px;
        }
    </style>
</head>
<body>
    <div class="app-container">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="logo">
                    <div class="logo-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <span>Meeting Bot</span>
                </div>
            </div>
            
            <nav>
                <div class="nav-item active" onclick="switchNav('sessions')" data-nav="sessions">
                    <i class="fas fa-comments"></i>
                    <span>Sessions</span>
                </div>
                <div class="nav-item" onclick="switchNav('library')" data-nav="library">
                    <i class="fas fa-folder"></i>
                    <span>Library</span>
                </div>
                <div class="nav-item" onclick="switchNav('transcripts')" data-nav="transcripts">
                    <i class="fas fa-file-alt"></i>
                    <span>Transcripts</span>
                </div>
                <div class="nav-item" onclick="switchNav('settings')" data-nav="settings">
                    <i class="fas fa-cog"></i>
                    <span>Settings</span>
                </div>
            </nav>
            
            <div class="bots-section">
                <div class="section-title">Active Bots</div>
                <div id="botsList"></div>
            </div>
        </div>
        
        <!-- Main content -->
        <div class="main-content">
            <div class="video-area" id="videoArea">
                <div class="video-placeholder" id="videoPlaceholder">
                    <i class="fas fa-video"></i>
                    <h3 style="margin-bottom: 8px; color: #fff;">No meeting active</h3>
                    <p>Select a bot and click Start to join a meeting</p>
                </div>
                <div class="video-controls" id="videoControls" style="display: none;">
                    <button class="control-btn" id="muteBtn" onclick="toggleMute()">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="control-btn" id="leaveBtn" onclick="leaveMeeting()" style="background: #ef4444;">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                    <button class="control-btn primary" id="speakBtn" onclick="openSpeakModal()">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button class="control-btn" onclick="shareScreen()">
                        <i class="fas fa-desktop"></i>
                    </button>
                    <button class="control-btn" onclick="toggleChat()">
                        <i class="fas fa-comment"></i>
                    </button>
                </div>
            </div>
            
            <div class="transcript-area">
                <div class="transcript-header">
                    <div class="transcript-title">Live Transcript</div>
                    <div class="transcript-tabs">
                        <div class="transcript-tab active">All</div>
                        <div class="transcript-tab">AI</div>
                        <div class="transcript-tab">Others</div>
                    </div>
                </div>
                <div class="transcript-messages" id="transcriptMessages">
                    <div class="empty-state">
                        <i class="fas fa-align-left"></i>
                        <h3>Transcript will appear here</h3>
<p>Real-time transcription of the meeting</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- FAB -->
    <button class="fab" onclick="openCreateModal()">
        <i class="fas fa-plus"></i>
    </button>
    
    <!-- Create Modal -->
    <div class="modal-overlay" id="createModal">
        <div class="modal">
            <h2>Create New Bot</h2>
            <form id="createBotForm">
                <div class="form-group">
                    <label>Bot Name</label>
                    <input type="text" name="name" placeholder="Interview Assistant" required>
                </div>
                <div class="form-group">
                    <label>Meeting URL</label>
                    <input type="url" name="meeting_url" placeholder="https://meet.google.com/...">
                </div>
                <div class="form-group">
                    <label>Participant Name</label>
                    <input type="text" name="participant_name" value="AI Assistant">
                </div>
                <div class="form-group">
                    <label>Passcode (optional)</label>
                    <input type="text" name="passcode" placeholder="Meeting passcode">
                </div>
                <div class="form-group">
                    <label>Scenario / Instructions</label>
                    <textarea name="scenario" placeholder="Describe what the bot should do in the meeting..."></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeCreateModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Create Bot</button>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Speak Modal -->
    <div class="modal-overlay" id="speakModal">
        <div class="modal">
            <h2>Make Bot Speak</h2>
            <form id="speakForm">
                <div class="form-group">
                    <label>Text to speak</label>
                    <textarea name="text" id="speakText" placeholder="Enter what you want the bot to say..."></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeSpeakModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Speak</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        let currentBot = null;
        let ws = null;
        let isMuted = false;
        let transcriptPolling = null;
        
        async function loadBots() {
            const res = await fetch('/api/bots');
            const bots = await res.json();
            const list = document.getElementById('botsList');
            
            if (bots.length === 0) {
                list.innerHTML = '<p style="color: #6b7280; font-size: 13px;">No bots yet. Create one to get started.</p>';
                return;
            }
            
            list.innerHTML = bots.map(bot => `
                <div class="bot-card ${currentBot?.id === bot.id ? 'active' : ''}" onclick="selectBot('${bot.id}')">
                    <div class="bot-card-header">
                        <div class="bot-name" id="bot-name-${bot.id}">${bot.name}</div>
                        <div class="status-dot ${bot.status === 'active' ? 'active' : ''} ${bot.status === 'error' ? 'error' : ''}"></div>
                    </div>
                    <div class="bot-meta">${bot.meeting_url || 'No URL'} • ${bot.status}</div>
                    <div style="margin-top: 10px; display: flex; gap: 8px;">
                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); deleteBot('${bot.id}')">Delete</button>
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="event.stopPropagation(); editBotName('${bot.id}')">Edit</button>
                    </div>
                </div>
            `).join('');
        }
        
        async function selectBot(botId) {
            const res = await fetch(`/api/bots/${botId}`);
            currentBot = await res.json();
            loadBots();
            
            if (currentBot.status === 'active') {
                document.getElementById('videoPlaceholder').innerHTML = `
                    <i class="fas fa-video" style="font-size: 64px; margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px; color: #fff;">Meeting Active</h3>
                    <p>${currentBot.meeting_url || 'In meeting'}</p>
                `;
                document.getElementById('videoControls').style.display = 'flex';
                startTranscriptPolling();
            } else {
                document.getElementById('videoPlaceholder').innerHTML = `
                    <i class="fas fa-video" style="font-size: 64px; margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px; color: #fff;">${currentBot.name}</h3>
                    <p>Status: ${currentBot.status}</p>
                `;
                document.getElementById('videoControls').style.display = currentBot.status === 'active' ? 'flex' : 'none';
            }
        }
        
        async function startBot(botId) {
            try {
                await fetch(`/api/bots/${botId}/start`, { method: 'POST' });
                selectBot(botId);
                loadBots();
                startTranscriptPolling();
            } catch (e) {
                alert('Failed to start bot: ' + e.message);
            }
        }
        
        async function stopBot(botId) {
            await fetch(`/api/bots/${botId}/stop`, { method: 'POST' });
            selectBot(botId);
            loadBots();
        }
        
        async function deleteBot(botId) {
            if (!confirm('Are you sure you want to delete this bot?')) return;
            
            try {
                await fetch(`/api/bots/${botId}`, { method: 'DELETE' });
                if (currentBot?.id === botId) {
                    currentBot = null;
                }
                loadBots();
            } catch (e) {
                alert('Failed to delete bot: ' + e.message);
            }
        }
        
        function editBotName(botId) {
            const currentName = document.getElementById(`bot-name-${botId}`).innerText;
            const newName = prompt('Enter new name:', currentName);
            if (newName && newName !== currentName) {
                document.getElementById(`bot-name-${botId}`).innerText = newName;
            }
        }
        
        async function leaveMeeting() {
            if (currentBot) {
                await stopBot(currentBot.id);
                document.getElementById('videoControls').style.display = 'none';
                document.getElementById('videoPlaceholder').innerHTML = `
                    <i class="fas fa-video" style="font-size: 64px; margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px; color: #fff;">No meeting active</h3>
                    <p>Select a bot and click Start to join a meeting</p>
                `;
            }
        }
        
        function toggleMute() {
            isMuted = !isMuted;
            const btn = document.getElementById('muteBtn');
            if (isMuted) {
                btn.classList.add('muted');
                btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            } else {
                btn.classList.remove('muted');
                btn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
        
        function openSpeakModal() {
            document.getElementById('speakModal').classList.add('visible');
            document.getElementById('speakText').focus();
        }
        
        function closeSpeakModal() {
            document.getElementById('speakModal').classList.remove('visible');
        }
        
        function sendChat() {
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (text && currentBot) {
                fetch(`/api/bots/${currentBot.id}/chat`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({text}),
                });
                input.value = '';
            }
        }
        
        function handleChatKey(e) {
            if (e.key === 'Enter') sendChat();
        }
        
        function shareScreen() {
            alert('Share screen feature coming soon');
        }
        
        function toggleChat() {
            switchPanel('chat');
        }
        
        function switchPanel(panel) {
            document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            
            if (panel === 'participants') {
                document.getElementById('panelContent').innerHTML = `
                    <div class="participants-list">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <h3>No participants</h3>
                            <p>Waiting for meeting to start...</p>
                        </div>
                    </div>
                `;
            } else if (panel === 'tools') {
                document.getElementById('panelContent').innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                        <div style="background: #262626; padding: 20px; border-radius: 10px; text-align: center; cursor: pointer;">
                            <i class="fas fa-desktop" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <div style="font-size: 12px;">Screen</div>
                        </div>
                        <div style="background: #262626; padding: 20px; border-radius: 10px; text-align: center; cursor: pointer;">
                            <i class="fas fa-palette" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <div style="font-size: 12px;">Whiteboard</div>
                        </div>
                        <div style="background: #262626; padding: 20px; border-radius: 10px; text-align: center; cursor: pointer;">
                            <i class="fas fa-images" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <div style="font-size: 12px;">Slides</div>
                        </div>
                        <div style="background: #262626; padding: 20px; border-radius: 10px; text-align: center; cursor: pointer;">
                            <i class="fas fa-code" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <div style="font-size: 12px;">Code</div>
                        </div>
                        <div style="background: #262626; padding: 20px; border-radius: 10px; text-align: center; cursor: pointer;">
                            <i class="fas fa-brain" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <div style="font-size: 12px;">Research</div>
                        </div>
                        <div style="background: #262626; padding: 20px; border-radius: 10px; text-align: center; cursor: pointer;">
                            <i class="fas fa-chart-line" style="font-size: 24px; margin-bottom: 8px;"></i>
                            <div style="font-size: 12px;">Analyze</div>
                        </div>
                    </div>
                `;
            } else if (panel === 'chat') {
                document.getElementById('panelContent').innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comments"></i>
                        <h3>No messages</h3>
                        <p>Chat messages will appear here</p>
                    </div>
                `;
            }
        }
        
        async function startTranscriptPolling() {
            if (transcriptPolling) clearInterval(transcriptPolling);
            transcriptPolling = setInterval(async () => {
                if (currentBot && currentBot.status === 'active') {
                    try {
                        const res = await fetch(`/api/bots/${currentBot.id}/transcript`);
                        if (res.ok) {
                            const data = await res.json();
                            renderTranscript(data.segments || []);
                        }
                    } catch (e) {}
                }
            }, 2000);
        }
        
        function renderTranscript(segments) {
            const container = document.getElementById('transcriptMessages');
            if (!segments.length) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-align-left"></i>
                        <h3>Listening...</h3>
                        <p>Transcript will appear soon</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = segments.slice(-10).map(seg => `
                <div class="transcript-msg">
                    <div class="msg-speaker">${seg.role || 'Unknown'}</div>
                    <div class="msg-text">${seg.text || ''}</div>
                </div>
            `).join('');
            container.scrollTop = container.scrollHeight;
        }
        
        function openCreateModal() {
            document.getElementById('createModal').classList.add('visible');
        }
        
        function closeCreateModal() {
            document.getElementById('createModal').classList.remove('visible');
        }
        
        async function createBot(e) {
            e.preventDefault();
            const form = e.target;
            const data = {
                name: form.name.value,
                meeting_url: form.meeting_url.value || null,
                participant_name: form.participant_name.value,
                passcode: form.passcode.value || null,
                scenario: form.scenario.value || null,
            };
            
            await fetch('/api/bots', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
            });
            
            form.reset();
            closeCreateModal();
            loadBots();
        }
        
        document.getElementById('createBotForm').addEventListener('submit', createBot);
        document.getElementById('speakForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = document.getElementById('speakText').value;
            if (text && currentBot) {
                await fetch(`/api/bots/${currentBot.id}/speak`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({text}),
                });
            }
            closeSpeakModal();
        });
        
        loadBots();
        loadTemplates();
        
        function switchNav(nav) {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.nav === nav) item.classList.add('active');
            });
            showNavContent(nav);
        }
        
        function showNavContent(nav) {
            const main = document.querySelector('.main-content');
            const transcript = document.querySelector('.transcript-area');
            const fab = document.querySelector('.fab');
            
            if (nav === 'library') {
                main.innerHTML = getLibraryHTML();
                transcript.style.display = 'none';
                fab.style.display = 'none';
                setTimeout(loadTemplates, 100);
            } else if (nav === 'transcripts') {
                main.innerHTML = getTranscriptsHTML();
                transcript.style.display = 'none';
                fab.style.display = 'none';
                setTimeout(loadTranscripts, 100);
            } else if (nav === 'settings') {
                main.innerHTML = getSettingsHTML();
                transcript.style.display = 'none';
                fab.style.display = 'none';
            } else {
                main.innerHTML = getSessionsHTML();
                transcript.style.display = 'flex';
                fab.style.display = 'flex';
                loadBots();
            }
        }
        
        function getSessionsHTML() {
            return `
                <div class="video-area" id="videoArea">
                    <div class="video-placeholder" id="videoPlaceholder">
                        <i class="fas fa-video"></i>
                        <h3 style="margin-bottom: 8px; color: #fff;">No meeting active</h3>
                        <p>Select a bot and click Start to join a meeting</p>
                    </div>
                    <div class="video-controls" id="videoControls" style="display: none;">
                        <button class="control-btn" id="muteBtn" onclick="toggleMute()">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button class="control-btn" id="leaveBtn" onclick="leaveMeeting()" style="background: #ef4444;">
                            <i class="fas fa-phone-slash"></i>
                        </button>
                        <button class="control-btn primary" onclick="openSpeakModal()">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button class="control-btn" onclick="shareScreen()">
                            <i class="fas fa-desktop"></i>
                        </button>
                        <button class="control-btn" onclick="toggleChat()">
                            <i class="fas fa-comment"></i>
                        </button>
                    </div>
                </div>
                <div class="transcript-area">
                    <div class="transcript-header">
                        <div class="transcript-title">Live Transcript</div>
                        <div class="transcript-tabs">
                            <div class="transcript-tab active">All</div>
                            <div class="transcript-tab">AI</div>
                            <div class="transcript-tab">Others</div>
                        </div>
                    </div>
                    <div class="transcript-messages" id="transcriptMessages">
                        <div class="empty-state">
                            <i class="fas fa-align-left"></i>
                            <h3>Transcript will appear here</h3>
                            <p>Real-time transcription of the meeting</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
function getLibraryHTML() {
            return `
                <div style="padding: 24px; overflow-y: auto; flex: 1;">
                    <h2 style="margin-bottom: 24px;">Agent Library</h2>
                    <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                        <input type="text" placeholder="Search agents..." style="flex:1; background:#262626; border:1px solid #3f3f46; padding:12px; border-radius:8px; color:#fff;">
                        <select style="background:#262626; border:1px solid #3f3f46; padding:12px; border-radius:8px; color:#fff;">
                            <option>All Categories</option>
                            <option>Sales</option>
                            <option>HR</option>
                            <option>Support</option>
                            <option>Training</option>
                        </select>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;" id="templatesGrid">
                        <div class="empty-state">
                            <i class="fas fa-robot"></i>
                            <h3>Loading...</h3>
                        </div>
                    </div>
                </div>
            `;
        }
        
        function getTranscriptsHTML() {
            return `
                <div style="padding: 24px; overflow-y: auto; flex: 1;">
                    <h2 style="margin-bottom: 24px;">Interview Transcripts</h2>
                    <div style="background: #262626; padding: 20px; border-radius: 12px;">
                        <div id="transcriptsList" style="color: #6b7280; text-align: center; padding: 40px;">Loading transcripts...</div>
                    </div>
                </div>
            `;
        }
        
        function getAnalyticsHTML() {
            return `
                <div style="padding: 24px;">
                    <h2 style="margin-bottom: 24px;">Analytics</h2>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px;">
                        <div style="background: #262626; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 32px; font-weight: 700;">24</div>
                            <div style="color: #6b7280; font-size: 14px;">Total Sessions</div>
                        </div>
                        <div style="background: #262626; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 32px; font-weight: 700;">18h</div>
                            <div style="color: #6b7280; font-size: 14px;">Talk Time</div>
                        </div>
                        <div style="background: #262626; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 32px; font-weight: 700;">4.2</div>
                            <div style="color: #6b7280; font-size: 14px;">Avg Score</div>
                        </div>
                        <div style="background: #262626; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 32px; font-weight: 700;">92%</div>
                            <div style="color: #6b7280; font-size: 14px;">Satisfaction</div>
                        </div>
                    </div>
                    <div style="background: #262626; padding: 20px; border-radius: 12px;">
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Recent Sessions</div>
                        <div style="color: #6b7280; text-align: center; padding: 40px;">No session data yet</div>
                    </div>
                </div>
            `;
        }
        
        function getSettingsHTML() {
            return `
                <div style="padding: 24px;">
                    <h2 style="margin-bottom: 24px;">Settings</h2>
                    <div style="background: #262626; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">Connection</div>
                        <div class="form-group">
                            <label>Joinly Server URL</label>
                            <input type="text" value="http://localhost:8000" style="width:100%; background:#1a1a1a; border:1px solid #3f3f46; padding:12px; border-radius:8px; color:#fff;">
                        </div>
                    </div>
                    <div style="background: #262626; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">AI Settings</div>
                        <div class="form-group">
                            <label>Default Voice</label>
                            <select style="width:100%; background:#1a1a1a; border:1px solid #3f3f46; padding:12px; border-radius:8px; color:#fff;">
                                <option>Kokoro - Jennifer</option>
                                <option>ElevenLabs - Adam</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-primary">Save Settings</button>
                </div>
            `;
        }
        
        function getTranscriptsHTML() {
            return `
                <div style="padding: 24px;">
                    <h2 style="margin-bottom: 24px;">Interview Transcripts</h2>
                    <div style="background: #262626; padding: 20px; border-radius: 12px;">
                        <div id="transcriptsList" style="color: #6b7280; text-align: center; padding: 40px;">Loading transcripts...</div>
                    </div>
                </div>
            `;
        }
        
        async function loadTranscripts() {
            try {
                const res = await fetch('/api/transcripts');
                const data = await res.json();
                const list = document.getElementById('transcriptsList');
                if (!list) return;
                
                if (!data.transcripts || data.transcripts.length === 0) {
                    list.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-file-alt" style="font-size: 48px; color: #4b5563; margin-bottom: 16px;"></i><p>No transcripts yet</p></div>';
                    return;
                }
                
                list.innerHTML = data.transcripts.map(t => `
                    <div style="background: #1a1a1a; padding: 16px; border-radius: 8px; margin-bottom: 12px; cursor: pointer;" onclick="viewTranscript('${t.id}')">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: 600; margin-bottom: 4px;">${t.botName || 'Interview Bot'}</div>
                                <div style="color: #6b7280; font-size: 13px;">${t.meetingUrl || 'Meeting'}</div>
                            </div>
                            <div style="color: #6b7280; font-size: 12px;">${t.date || 'Today'}</div>
                        </div>
                    </div>
                `).join('');
            } catch (e) {
                document.getElementById('transcriptsList').innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">Failed to load transcripts</div>';
            }
        }
        
        function viewTranscript(id) {
            window.open('/api/transcripts/' + id, '_blank');
        }
        
        async function loadTemplates() {
            try {
                const res = await fetch('/api/templates');
                const templates = await res.json();
                const grid = document.getElementById('templatesGrid');
                if (!grid) return;
                grid.innerHTML = templates.map(tpl => `
                    <div style="background: #262626; padding: 20px; border-radius: 12px; cursor: pointer; transition: all 0.2s;" onclick="useTemplate('${tpl.id}')">
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${tpl.name}</div>
                        <div style="color: #6b7280; font-size: 13px; margin-bottom: 12px;">${tpl.description || 'No description'}</div>
                        <div style="display: flex; gap: 8px;">
                            <span style="background: #6366f1; color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 11px;">${tpl.category || 'general'}</span>
                        </div>
                    </div>
                `).join('');
            } catch (e) {
                console.error('Failed to load templates:', e);
            }
        }
        
        function useTemplate(tplId) {
            fetch('/api/templates').then(r => r.json()).then(templates => {
                const tpl = templates.find(t => t.id === tplId);
                if (tpl) {
                    document.getElementById('createModal').classList.add('visible');
                    const form = document.getElementById('createBotForm');
                    form.name.value = tpl.name;
                    form.participant_name.value = tpl.participant_name;
                    form.scenario.value = tpl.scenario;
                }
            });
        }
    </script>
</body>
</html>
"""