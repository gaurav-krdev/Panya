---
description: Save chat transcripts by date at turn finish, load by date on-demand only.
trigger: always_on
---

# Chat Context Management Rule

## 1. Automatic Storage By Date (End of Response)
- Chat transcripts are automatically saved at the end of every prompt turn finish via the global `Stop` hook.
- Logs are organized by date under `chat_history/by_date/YYYY-MM-DD/chat_<session_id>.md`.
- `chat_history/SUMMARY.md` maintains a date-indexed directory of all sessions.

## 2. On-Demand Date Lookup (Save Tokens)
- **DO NOT** auto-load past chat files at startup.
- When the user asks for past context (e.g. *"check yesterday's chat"*, *"check chat from 2026-08-09"*, or *"what did we do last week"*):
  1. Inspect `chat_history/SUMMARY.md` to find the session matching the requested date.
  2. Load **ONLY** the specific date file for that request (e.g., `chat_history/by_date/YYYY-MM-DD/chat_<id>.md`).
  3. Do NOT load the entire chat history archive to save tokens.
