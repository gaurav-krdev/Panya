# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Chat Context & History
- **Auto-Save By Date**: Chat transcripts are automatically saved by date (`chat_history/by_date/YYYY-MM-DD/`) in the workspace root at the end of every prompt finish.
- **Date-Targeted On-Demand Load**: Do NOT auto-load past chat logs at session start. When requested (e.g. *"check yesterday's chat"* or *"check chat from Aug 9"*), read `chat_history/SUMMARY.md` first to locate and load ONLY the target date's chat log to avoid wasting tokens.



