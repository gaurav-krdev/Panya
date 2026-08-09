const fs = require('fs');
const path = require('path');
const os = require('os');

function parseUserContent(content) {
  if (!content) return '';
  if (typeof content !== 'string') return JSON.stringify(content);
  
  const match = content.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return content
    .replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '')
    .replace(/<USER_SETTINGS_CHANGE>[\s\S]*?<\/USER_SETTINGS_CHANGE>/g, '')
    .trim();
}

function formatDate(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function formatTime(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().slice(11, 19);
  return d.toISOString().slice(11, 19);
}

function processTranscript(jsonlPath, conversationId, workspaceDir) {
  if (!fs.existsSync(jsonlPath)) {
    return;
  }

  let rawData = '';
  try {
    rawData = fs.readFileSync(jsonlPath, 'utf8');
  } catch (e) {
    return;
  }

  const lines = rawData.split('\n').filter(l => l.trim());

  let userPrompt = '';
  let conversationItems = [];
  let firstTimestamp = null;

  for (const line of lines) {
    let item;
    try {
      item = JSON.parse(line);
    } catch (e) {
      continue;
    }

    if (!firstTimestamp && item.created_at) {
      firstTimestamp = item.created_at;
    }

    if (item.type === 'USER_INPUT') {
      const userText = parseUserContent(item.content);
      if (!userPrompt) userPrompt = userText;
      conversationItems.push({
        role: 'User',
        text: userText,
        timestamp: item.created_at || new Date().toISOString()
      });
    } else if (item.type === 'PLANNER_RESPONSE' && item.source === 'MODEL') {
      let assistantText = '';
      if (item.content) {
        assistantText = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
      }
      
      let toolsUsed = [];
      if (Array.isArray(item.tool_calls)) {
        toolsUsed = item.tool_calls.map(tc => {
          let summary = tc.name;
          if (tc.args) {
            let parsedArgs = tc.args;
            if (typeof tc.args === 'string') {
              try { parsedArgs = JSON.parse(tc.args); } catch(e) {}
            }
            if (typeof parsedArgs === 'object' && parsedArgs !== null) {
              if (parsedArgs.toolSummary) summary += `: ${parsedArgs.toolSummary}`;
              else if (parsedArgs.CommandLine) summary += `: \`${parsedArgs.CommandLine}\``;
              else if (parsedArgs.AbsolutePath) summary += `: \`${parsedArgs.AbsolutePath}\``;
              else if (parsedArgs.TargetFile) summary += `: \`${parsedArgs.TargetFile}\``;
            }
          }
          return summary;
        });
      }

      let thinkingText = item.thinking || '';

      if (assistantText || thinkingText || toolsUsed.length > 0) {
        conversationItems.push({
          role: 'Assistant',
          text: assistantText,
          thinking: thinkingText,
          tools: toolsUsed,
          timestamp: item.created_at || new Date().toISOString()
        });
      }
    }
  }

  if (conversationItems.length === 0) {
    return;
  }

  const dateStr = formatDate(firstTimestamp);
  const timeStr = formatTime(firstTimestamp);
  const targetDir = path.join(workspaceDir, 'chat_history');
  const byDateDir = path.join(targetDir, 'by_date', dateStr);

  try {
    if (!fs.existsSync(byDateDir)) {
      fs.mkdirSync(byDateDir, { recursive: true });
    }
  } catch (e) {
    return;
  }

  const now = new Date().toISOString();
  let markdown = `# Chat Session Log - ${dateStr}\n\n`;
  markdown += `- **Date:** \`${dateStr}\`\n`;
  markdown += `- **Time Started:** \`${timeStr}\` UTC\n`;
  markdown += `- **Session ID:** \`${conversationId}\`\n`;
  markdown += `- **Last Updated:** \`${now}\`\n`;
  markdown += `- **Workspace:** \`${workspaceDir}\`\n\n`;
  markdown += `---\n\n`;

  for (const entry of conversationItems) {
    if (entry.role === 'User') {
      markdown += `### 👤 User (${entry.timestamp})\n\n${entry.text}\n\n---\n\n`;
    } else if (entry.role === 'Assistant') {
      markdown += `### 🤖 Assistant (${entry.timestamp})\n\n`;
      if (entry.thinking) {
        markdown += `<details>\n<summary>Thinking Process</summary>\n\n${entry.thinking}\n\n</details>\n\n`;
      }
      if (entry.text) {
        markdown += `${entry.text}\n\n`;
      }
      if (entry.tools && entry.tools.length > 0) {
        markdown += `**Actions Executed:**\n`;
        for (const tool of entry.tools) {
          markdown += `- ${tool}\n`;
        }
        markdown += `\n`;
      }
      markdown += `---\n\n`;
    }
  }

  const sessionRef = conversationId.slice(0, 8);
  const dateSessionFile = path.join(byDateDir, `chat_${sessionRef}.md`);
  
  try {
    fs.writeFileSync(dateSessionFile, markdown, 'utf8');
  } catch (e) {}

  const summaryPath = path.join(targetDir, `SUMMARY.md`);
  let summaryContent = '';
  try {
    if (fs.existsSync(summaryPath)) {
      summaryContent = fs.readFileSync(summaryPath, 'utf8');
    }
    
    if (!summaryContent.includes('| Date |')) {
      summaryContent = `# Chat History Index\n\n| Date | Time (UTC) | Session ID | Initial Prompt / Topic | Log File |\n| --- | --- | --- | --- | --- |\n`;
    }

    const shortPrompt = (userPrompt || 'N/A').replace(/[\r\n]+/g, ' ').slice(0, 60) + ((userPrompt && userPrompt.length > 60) ? '...' : '');
    const relPath = `./by_date/${dateStr}/chat_${sessionRef}.md`;
    const newRow = `| **${dateStr}** | ${timeStr} | \`${sessionRef}\` | ${shortPrompt} | [chat_${sessionRef}.md](${relPath}) |\n`;

    if (summaryContent.includes(sessionRef)) {
      const lines = summaryContent.split('\n');
      const updatedLines = lines.map(line => line.includes(sessionRef) ? newRow.trim() : line);
      summaryContent = updatedLines.join('\n');
      if (!summaryContent.endsWith('\n')) summaryContent += '\n';
    } else {
      summaryContent += newRow;
    }

    fs.writeFileSync(summaryPath, summaryContent, 'utf8');
  } catch (e) {}
}

function getTranscriptPath(payload) {
  if (payload.transcriptPath && fs.existsSync(payload.transcriptPath)) {
    return payload.transcriptPath;
  }

  const convId = payload.conversationId;
  if (convId) {
    const home = os.homedir();
    const possiblePaths = [
      path.join(home, '.gemini', 'antigravity-cli', 'brain', convId, '.system_generated', 'logs', 'transcript_full.jsonl'),
      path.join(home, '.gemini', 'antigravity-cli', 'brain', convId, '.system_generated', 'logs', 'transcript.jsonl'),
      path.join(home, '.gemini', 'antigravity', 'brain', convId, '.system_generated', 'logs', 'transcript_full.jsonl'),
      path.join(home, '.gemini', 'antigravity', 'brain', convId, '.system_generated', 'logs', 'transcript.jsonl'),
      path.join(home, '.gemini', 'antigravity-ide', 'brain', convId, '.system_generated', 'logs', 'transcript_full.jsonl'),
      path.join(home, '.gemini', 'antigravity-ide', 'brain', convId, '.system_generated', 'logs', 'transcript.jsonl'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

function main() {
  let inputData = '';
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    let payload = {};
    try {
      payload = JSON.parse(inputData || '{}');
    } catch (e) {}

    const convId = payload.conversationId || 'unknown_session';
    let workspaceDir = (payload.workspacePaths && payload.workspacePaths[0]) ? payload.workspacePaths[0] : process.cwd();
    
    if (path.basename(workspaceDir) === '.agents') {
      workspaceDir = path.dirname(workspaceDir);
    }

    const transcriptPath = getTranscriptPath(payload);
    if (transcriptPath) {
      processTranscript(transcriptPath, convId, workspaceDir);
    }

    process.stdout.write(JSON.stringify({}));
  });
}

main();
