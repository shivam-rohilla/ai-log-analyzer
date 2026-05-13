import os
import re
import json
import time
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Log Analyzer", version="1.0.0")

_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = ["*"] if _origins_env == "*" else _origins_env.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

# ── Log parsing ──────────────────────────────────────────────────────────────

PATTERNS = [
    # Standard ISO: 2024-01-15T10:23:45 [ERROR] message
    re.compile(
        r"(?P<ts>\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[,\.]\d+)?)"
        r"\s*\[?(?P<level>ERROR|WARN(?:ING)?|INFO|DEBUG|CRITICAL|FATAL)\]?"
        r"\s*(?P<msg>.+)"
    ),
    # Nginx: 127.0.0.1 - - [15/Jan/2024:10:23:45 +0000] "GET /path" 500
    re.compile(
        r"(?P<ip>\d+\.\d+\.\d+\.\d+).+\[(?P<ts>[^\]]+)\]"
        r'\s+"(?P<req>[^"]+)"\s+(?P<status>\d{3})\s+(?P<bytes>\d+)'
    ),
    # Python logging: 2024-01-15 10:23:45,123 ERROR module: message
    re.compile(
        r"(?P<ts>\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:[,\.]\d+)?)"
        r"\s+(?P<level>ERROR|WARN(?:ING)?|INFO|DEBUG|CRITICAL|FATAL)"
        r"\s+(?P<msg>.+)"
    ),
]

LEVEL_KEYWORDS = re.compile(r"\b(ERROR|WARN(?:ING)?|INFO|DEBUG|CRITICAL|FATAL)\b", re.IGNORECASE)


def parse_line(line: str) -> dict:
    line = line.strip()
    if not line:
        return None

    # Standard / Python patterns
    for pat in [PATTERNS[0], PATTERNS[2]]:
        m = pat.match(line)
        if m:
            level = m.group("level").upper()
            if level == "WARNING":
                level = "WARN"
            if level == "CRITICAL" or level == "FATAL":
                level = "ERROR"
            return {"timestamp": m.group("ts"), "level": level, "message": m.group("msg").strip()}

    # Nginx pattern
    m = PATTERNS[1].match(line)
    if m:
        status = int(m.group("status"))
        level = "ERROR" if status >= 500 else ("WARN" if status >= 400 else "INFO")
        return {
            "timestamp": m.group("ts"),
            "level": level,
            "message": f'{m.group("req")} -> {status} ({m.group("bytes")} bytes)',
        }

    # Fallback: keyword scan
    kw = LEVEL_KEYWORDS.search(line)
    if kw:
        level = kw.group(1).upper()
        if level == "WARNING":
            level = "WARN"
        if level in ("CRITICAL", "FATAL"):
            level = "ERROR"
        ts_m = re.search(r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}", line)
        return {
            "timestamp": ts_m.group(0) if ts_m else "",
            "level": level,
            "message": line,
        }

    return {"timestamp": "", "level": "INFO", "message": line}


def parse_logs(content: str) -> list[dict]:
    entries = []
    for line in content.splitlines():
        parsed = parse_line(line)
        if parsed:
            entries.append(parsed)
    return entries


# ── Groq helpers ─────────────────────────────────────────────────────────────

def call_groq(messages: list, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            resp = groq_client.chat.completions.create(
                model=MODEL,
                messages=messages,
                temperature=0.2,
                max_tokens=1024,
            )
            return resp.choices[0].message.content
        except Exception as e:
            if "429" in str(e) and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise


def safe_json(text: str, fallback: dict) -> dict:
    text = text.strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except Exception:
        # Try to find first {...} block
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
    return fallback


def analyze_chunk(chunk: list[dict], chunk_idx: int) -> dict:
    lines_text = "\n".join(
        f"[{e['level']}] {e['timestamp']} {e['message']}" for e in chunk
    )
    prompt = f"""Analyze these log entries (chunk {chunk_idx + 1}) and respond ONLY with valid JSON.

Log entries:
{lines_text}

Respond with this exact JSON structure (no extra text):
{{
  "summary": "brief summary of what happened in this chunk",
  "severity": <integer 1-10>,
  "issues": ["issue 1", "issue 2"],
  "root_cause": "likely root cause",
  "fixes": ["fix 1", "fix 2"]
}}"""

    raw = call_groq([{"role": "user", "content": prompt}])
    return safe_json(raw, {
        "summary": raw[:300],
        "severity": 5,
        "issues": ["Could not parse AI response"],
        "root_cause": "Unknown",
        "fixes": ["Review logs manually"],
    })


def generate_overall_summary(chunk_analyses: list[dict], counts: dict) -> dict:
    analyses_text = json.dumps(chunk_analyses, indent=2)
    prompt = f"""Based on these log chunk analyses, generate an overall system health summary.
Respond ONLY with valid JSON.

Chunk analyses:
{analyses_text}

Log counts: {counts}

Respond with this exact JSON structure (no extra text):
{{
  "status": "<healthy|degraded|critical>",
  "top_issues": ["issue 1", "issue 2", "issue 3"],
  "actions": ["action 1", "action 2", "action 3"],
  "prevention": ["prevention tip 1", "prevention tip 2"]
}}"""

    raw = call_groq([{"role": "user", "content": prompt}])
    return safe_json(raw, {
        "status": "degraded",
        "top_issues": ["Analysis incomplete"],
        "actions": ["Review logs manually"],
        "prevention": ["Set up monitoring alerts"],
    })


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze-logs")
async def analyze_logs(file: UploadFile = File(...)):
    if not file.filename.endswith((".log", ".txt")):
        raise HTTPException(status_code=400, detail="Only .log and .txt files are supported")

    content = (await file.read()).decode("utf-8", errors="replace")
    entries = parse_logs(content)

    if not entries:
        raise HTTPException(status_code=400, detail="No parseable log entries found in file")

    counts = {
        "total": len(entries),
        "errors": sum(1 for e in entries if e["level"] == "ERROR"),
        "warnings": sum(1 for e in entries if e["level"] == "WARN"),
        "info": sum(1 for e in entries if e["level"] == "INFO"),
    }

    # Chunk entries into groups of 50
    chunk_size = 50
    chunks = [entries[i: i + chunk_size] for i in range(0, len(entries), chunk_size)]

    chunk_analyses = []
    for idx, chunk in enumerate(chunks):
        analysis = analyze_chunk(chunk, idx)
        analysis["chunk_index"] = idx
        analysis["line_range"] = [idx * chunk_size, min((idx + 1) * chunk_size, len(entries))]
        chunk_analyses.append(analysis)

    summary = generate_overall_summary(chunk_analyses, counts)

    timeline = [
        {
            "timestamp": e["timestamp"],
            "level": e["level"],
            "message": e["message"][:200],
        }
        for e in entries[:100]
    ]

    return {
        "total_logs": counts["total"],
        "errors": counts["errors"],
        "warnings": counts["warnings"],
        "info": counts["info"],
        "chunk_analyses": chunk_analyses,
        "summary": summary,
        "timeline": timeline,
    }


@app.post("/chat-about-logs")
async def chat_about_logs(
    question: str = Query(..., description="Question about the logs"),
    log_context: str = Query(..., description="Log context for the AI"),
):
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert log analysis assistant. "
                "Answer questions about log files clearly and concisely. "
                "Focus on actionable insights and root cause analysis."
            ),
        },
        {
            "role": "user",
            "content": f"Log context:\n{log_context[:3000]}\n\nQuestion: {question}",
        },
    ]

    answer = call_groq(messages)
    return {"answer": answer}
