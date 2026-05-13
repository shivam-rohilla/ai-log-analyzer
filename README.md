# AI Log Analyzer

An AI-powered web application for analyzing log files using Groq's LLaMA 3 70b model. Upload any log file to get instant AI-generated analysis including severity scoring, root cause detection, suggested fixes, and an interactive chat interface.

## Prerequisites

- Python 3.8+
- Node.js 16+
- A free Groq API key (sign up at [console.groq.com](https://console.groq.com))

## Setup

### 1. Get a Groq API Key

1. Go to [console.groq.com](https://console.groq.com) and sign up for a free account
2. Navigate to **API Keys** and create a new key
3. Copy the key — you'll need it in the next step

### 2. Backend Setup

```bash
cd backend

# Copy the example env file and add your key
cp .env.example .env
# Edit .env and replace 'your_groq_api_key_here' with your actual key

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger UI.

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The app will open at `http://localhost:3000`.

## How to Use

1. **Upload a log file** — Drag and drop or click the upload zone to select a `.log` or `.txt` file
2. **Wait for analysis** — The AI analyzes your logs in chunks (15–30 seconds depending on file size)
3. **Review results** — Check the stats cards, AI summary, severity-scored chunks, and log timeline
4. **Chat with AI** — Ask questions about your logs in the chat section (e.g. "What caused the DB errors?", "Which endpoint had the most failures?")

Sample log files are provided in `sample_logs/` for quick testing.

## Supported Log Formats

| Format | Example |
|--------|---------|
| Standard ISO | `2024-01-15T10:23:45 [ERROR] message` |
| Python logging | `2024-01-15 10:23:45,123 ERROR module: message` |
| Nginx access log | `127.0.0.1 - - [15/Jan/2024:10:23:45] "GET /api" 500 144` |
| Fallback (keyword) | Any line containing ERROR / WARN / INFO / DEBUG |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Model | Groq — LLaMA 3 70b (llama3-70b-8192) |
| Backend | FastAPI + Uvicorn |
| Frontend | React 18 |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP client | Axios |
| Styling | Custom CSS (dark theme) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/analyze-logs` | Upload and analyze a log file |
| `POST` | `/chat-about-logs` | Ask a question about analyzed logs |

## Project Structure

```
log-analyzer/
├── backend/
│   ├── main.py            # FastAPI app — parsing, Groq calls, routes
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variable template
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.jsx        # Main React app
│   │   ├── App.css        # Dark-theme styles
│   │   └── index.js       # React entry point
│   ├── package.json
│   └── .env               # Frontend env (API URL)
├── sample_logs/
│   ├── app_sample.log     # Application log with DB pool incident
│   ├── nginx_sample.log   # Nginx access log with 500 cluster
│   └── db_sample.log      # Database log with deadlock/connection errors
└── README.md
```

## Notes

- Groq's free tier has rate limits. If you see 429 errors, wait a few seconds and retry.
- Large log files are chunked into 50-line segments to stay within token limits.
- The chat feature uses the first 100 log entries as context for AI responses.
