import * as vscode from "vscode";
import * as path from "path";

const CHAT_VIEW_ID = "nexhacks26.chatView";
const CONTAINER_ID = "nexhacks26Container";

// Create a decoration type for the "Real-Time" highlighting in the actual editor
const changeHighlightDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(34, 197, 94, 0.15)', // Light Green background
    isWholeLine: true,
    overviewRulerColor: 'rgba(34, 197, 94, 0.7)',
    overviewRulerLane: vscode.OverviewRulerLane.Left
});

export function activate(context: vscode.ExtensionContext) {
  const provider = new NexHacksChatViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CHAT_VIEW_ID, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nexhacks26.openChat", async () => {
      await vscode.commands.executeCommand(`workbench.view.extension.${CONTAINER_ID}`);
    })
  );
}

export function deactivate() {}

class NexHacksChatViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getWebviewHtml();

    // --- LISTENER: Handle messages from the Webview ---
    webviewView.webview.onDidReceiveMessage(async (data) => {
      
      // 1. GET FILE CONTEXT (For Diff Calculation)
      if (data.command === 'get_file_context') {
        const rootPath = this.getRootPath();
        if (!rootPath) {
            webviewView.webview.postMessage({ command: 'file_context', id: data.id, content: null });
            return;
        }

        const targetUri = vscode.Uri.file(path.join(rootPath, data.path));
        try {
            const fileData = await vscode.workspace.fs.readFile(targetUri);
            webviewView.webview.postMessage({ 
                command: 'file_context', 
                id: data.id, 
                content: fileData.toString() 
            });
        } catch (e) {
            webviewView.webview.postMessage({ command: 'file_context', id: data.id, content: "" });
        }
      }

      // 2. HIGHLIGHT IN EDITOR (Visual feedback in the actual file)
      if (data.command === 'highlight_editor') {
          const rootPath = this.getRootPath();
          if (!rootPath) return;

          const targetUri = vscode.Uri.file(path.join(rootPath, data.path));
          
          // Find the visible editor for this file
          const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === targetUri.toString());
          
          if (editor) {
              const startLine = data.startLine;
              const endLine = data.endLine;
              
              // Create range (VS Code lines are 0-indexed)
              // If it's an insertion (start > end), just highlight the start line
              const range = new vscode.Range(
                  new vscode.Position(startLine, 0),
                  new vscode.Position(Math.max(startLine, endLine), 1000)
              );
              
              editor.setDecorations(changeHighlightDecoration, [range]);
              
              // Optional: Reveal the range so the user sees it
              editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
          }
      }

      // 3. APPLY FILE (Write to Disk)
      if (data.command === 'apply_file') {
        try {
            const rootPath = this.getRootPath();
            if (!rootPath) {
                vscode.window.showErrorMessage("Context Co: Please Open a Folder so I know where to save the file.");
                return;
            }
    
            const filePath = data.path; 
            const newContent = data.content;
            
            const targetUri = vscode.Uri.file(path.join(rootPath, filePath));
    
            await vscode.workspace.fs.writeFile(targetUri, Buffer.from(newContent, 'utf8'));

            const doc = await vscode.workspace.openTextDocument(targetUri);
            await vscode.window.showTextDocument(doc);
            
            // Clear decorations after apply
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.uri.toString() === targetUri.toString()) {
                editor.setDecorations(changeHighlightDecoration, []);
            }
            
            vscode.window.showInformationMessage(`Successfully updated ${filePath}`);

        } catch (e: any) {
            vscode.window.showErrorMessage(`Context Co Error: ${e.message}`);
        }
      }
    });
  }

  private getRootPath(): string | undefined {
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        return vscode.workspace.workspaceFolders[0].uri.fsPath;
    } else if (vscode.window.activeTextEditor) {
        return path.dirname(vscode.window.activeTextEditor.document.uri.fsPath);
    }
    return undefined;
  }
}

function getWebviewHtml(): string {
  const nonce = String(Math.random()).slice(2);
  
  const csp = [
    "default-src 'none';",
    "img-src data: https:;", 
    "style-src 'unsafe-inline';",
    `script-src 'nonce-${nonce}';`, 
    "connect-src http://127.0.0.1:8000 http://localhost:8000;"
  ].join(" ");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Context Co. Chat</title>

  <style>
    :root {
      --bg: var(--vscode-editor-background); 
      --panel: var(--vscode-sideBar-background);
      --border: var(--vscode-panel-border);
      --text: var(--vscode-editor-foreground);
      --muted: rgba(255,255,255,0.60);
      
      --accent: #7dd3fc;
      --accentBg: rgba(125,211,252,0.18);
      --accentBorder: rgba(125,211,252,0.35);
      
      --diff-bg: rgba(34, 197, 94, 0.15); 
      --diff-border: rgba(34, 197, 94, 0.5);
    }

    body {
      margin: 0;
      height: 100vh;
      overflow: hidden;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      background-color: var(--bg);
      color: var(--text);
    }

    #chatRoot {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg);
      overflow: hidden;
    }

    #header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 650;
      letter-spacing: 0.2px;
      background: var(--panel);
    }

    #status {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.04);
    }

    #messages {
      flex: 1;
      padding: 14px;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    #messages::-webkit-scrollbar { width: 10px; }
    #messages::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.10);
      border-radius: 999px;
      border: 2px solid rgba(0,0,0,0);
      background-clip: padding-box;
    }

    .msg {
      max-width: 90%;
      font-size: 14px;
      line-height: 1.5;
      word-break: break-word;
    }

    .me {
      align-self: flex-end;
      background: var(--accentBg);
      border: 1px solid var(--accentBorder);
      color: var(--text);
      padding: 10px 14px;
      border-radius: 14px;
    }

    .bot {
      align-self: flex-start;
      color: var(--text);
      padding-left: 4px;
      width: 100%; 
    }

    /* CODE BLOCK & DIFF */
    .code-wrapper {
        background: var(--vscode-textBlockQuote-background);
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
        margin: 10px 0;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
    }

    .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255,255,255,0.03);
        padding: 6px 12px;
        border-bottom: 1px solid var(--border);
    }

    .file-name {
        font-size: 11px;
        color: var(--muted);
        font-family: 'Consolas', 'Courier New', monospace;
        letter-spacing: 0.5px;
    }

    .review-btn {
        background: rgba(125,211,252,0.95);
        color: #071018;
        border: 1px solid rgba(125,211,252,0.55);
        padding: 4px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .review-btn:hover { opacity: 0.9; transform: translateY(-1px); }

    .code-content {
        padding: 0;
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 13px;
        color: var(--text);
        overflow-x: auto;
        white-space: pre; 
    }

    .diff-line {
        display: block;
        padding: 0 12px;
        min-height: 18px; 
        line-height: 18px;
    }

    /* ONLY highlight the changed lines */
    .diff-highlight {
        background-color: var(--diff-bg);
        border-left: 3px solid var(--diff-border);
        padding-left: 9px;
    }
    
    .diff-ellipsis {
        background: rgba(255,255,255,0.02);
        color: var(--muted);
        text-align: center;
        font-size: 10px;
        padding: 2px 0;
        font-style: italic;
        opacity: 0.7;
    }
    
    .loading-diff { padding: 20px; color: var(--muted); text-align: center; font-style: italic; }
    .data-card { background: rgba(30, 35, 45, 0.6); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin: 8px 0; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; }
    .jira-row { display: flex; align-items: flex-start; margin-bottom: 8px; color: rgba(255,255,255,0.9); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; }
    .jira-bullet { margin-right: 8px; color: var(--accent); font-weight: bold; }
    .confluence-row { display: flex; align-items: flex-start; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; }
    .confluence-link { color: var(--accent); text-decoration: none; font-weight: 600; }
    .slack-container { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .slack-header { font-size: 0.9em; color: var(--accent); margin-bottom: 4px; font-weight: 700; opacity: 0.95; }
    
    .banner { align-self: center; width: 100%; color: var(--accent); margin-bottom: 10px; opacity: 0.9; }
    .banner pre { font-family: 'Courier New', Courier, monospace; font-size: 5px; font-weight: bold; line-height: 1.1; white-space: pre; overflow-x: hidden; margin: 0; text-align: center; }

    #composer { padding: 12px; border-top: 1px solid var(--border); display: flex; gap: 10px; background: rgba(0,0,0,0.12); }
    #input { flex: 1; height: 42px; border-radius: 12px; border: 1px solid var(--border2); background: rgba(10, 12, 20, 0.65); color: var(--text); padding: 0 12px; outline: none; }
    #input:focus { border-color: rgba(125,211,252,0.45); box-shadow: 0 0 0 3px rgba(125,211,252,0.15); }
    #send { height: 42px; padding: 0 14px; border-radius: 12px; border: 1px solid rgba(125,211,252,0.55); background: rgba(125,211,252,0.95); color: #071018; font-weight: 700; cursor: pointer; }
  </style>
</head>

<body>
  <div id="chatRoot">
    <div id="header">
      <div>Context Co.</div> <div id="status">idle</div>
    </div>
    <div id="messages"></div>
    <div id="composer">
      <input id="input" placeholder="Search Jira, Slack, or Confluence..." />
      <button id="send">Send</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi(); 
    const API_URL = "http://127.0.0.1:8000/chat";

    const statusEl = document.getElementById("status");
    const messagesEl = document.getElementById("messages");
    const inputEl = document.getElementById("input");
    const sendBtn = document.getElementById("send");

    window.codeBlockCache = {};
    let isGenerating = false;

    // --- BUTTON CLICK HANDLER ---
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('review-btn')) {
            const blockId = e.target.getAttribute('data-id');
            const data = window.codeBlockCache[blockId];
            if (data) {
                vscode.postMessage({
                    command: 'apply_file',
                    path: data.path,
                    content: data.content 
                });
            }
        }
    });

    // --- LISTEN FOR FILE CONTEXT ---
    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'file_context') {
            renderDiffView(message.id, message.content);
        }
    });

    // --- RENDER DIFF ---
    function renderDiffView(blockId, originalContent) {
        const container = document.getElementById(blockId);
        const wrapper = container.parentElement;
        const filePath = wrapper.querySelector('.file-name').textContent;
        
        if (!container) return;

        const newContent = window.codeBlockCache[blockId].content;
        const oldLines = originalContent ? originalContent.split(/\\r?\\n/) : [];
        const newLines = newContent.split(/\\r?\\n/);
        
        // 1. New File Handling
        if (oldLines.length === 0) {
            let html = '<div class="diff-ellipsis">... new file ...</div>';
            newLines.forEach(l => {
                html += \`<div class="diff-line diff-highlight">\${escapeHtml(l)}</div>\`;
            });
            container.innerHTML = html;
            return;
        }

        // 2. Find Start of Change
        let startDiff = 0;
        const limit = Math.min(oldLines.length, newLines.length);
        while (startDiff < limit && oldLines[startDiff] === newLines[startDiff]) {
            startDiff++;
        }

        // 3. Find End of Change
        let endDiffNew = newLines.length - 1;
        let endDiffOld = oldLines.length - 1;
        while (endDiffNew >= startDiff && endDiffOld >= startDiff && 
               newLines[endDiffNew] === oldLines[endDiffOld]) {
            endDiffNew--;
            endDiffOld--;
        }

        // 4. Send "Highlight" command to VS Code Editor (Real-time feedback)
        // We highlight the lines in the OLD file that are being replaced/modified.
        vscode.postMessage({
            command: 'highlight_editor',
            path: filePath,
            startLine: startDiff,
            endLine: endDiffOld
        });

        // 5. Render HTML for Chat
        if (startDiff > endDiffNew) {
             container.innerHTML = '<div class="loading-diff">No visible changes detected.</div>';
             return;
        }

        const showStart = Math.max(0, startDiff - 2);
        const showEnd = Math.min(newLines.length - 1, endDiffNew + 2);

        let html = "";
        if (showStart > 0) html += '<div class="diff-ellipsis">...</div>';

        for (let i = showStart; i <= showEnd; i++) {
            // Strictly highlight ONLY changed lines (not context)
            const isChanged = (i >= startDiff && i <= endDiffNew);
            const className = isChanged ? "diff-line diff-highlight" : "diff-line";
            const content = newLines[i] === "" ? "&nbsp;" : escapeHtml(newLines[i]);
            html += \`<div class="\${className}">\${content}</div>\`;
        }

        if (showEnd < newLines.length - 1) html += '<div class="diff-ellipsis">...</div>';
        container.innerHTML = html;
    }

    function escapeHtml(text) {
        if (!text) return "";
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    const BANNER_ART = \`
  ██████╗ ██████╗ ███╗   ██╗████████╗███████╗██╗  ██╗████████╗     ██████╗ ██████╗       
 ██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝╚██╗██╔╝╚══██╔══╝    ██╔════╝██╔═══██╗      
 ██║     ██║   ██║██╔██╗ ██║   ██║   █████╗   ╚███╔╝    ██║       ██║     ██║   ██║      
 ██║     ██║   ██║██║╚██╗██║   ██║   ██╔══╝   ██╔██╗    ██║       ██║     ██║   ██║      
 ╚██████╗╚██████╔╝██║ ╚████║   ██║   ███████╗██╔╝ ██╗   ██║       ╚██████╗╚██████╔╝   ██╗
  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝        ╚═════╝ ╚═════╝    ╚═╝\`;

    function setStatus(s) { statusEl.textContent = s; }

    function createMsgDiv(who) {
      const d = document.createElement("div");
      d.className = "msg " + who;
      messagesEl.appendChild(d);
      return d;
    }

    function addBanner() {
      const d = document.createElement("div");
      d.className = "banner";
      const pre = document.createElement("pre");
      pre.textContent = BANNER_ART;
      d.appendChild(pre);
      messagesEl.appendChild(d);
    }

    function extractValue(line, key) {
        const parts = line.split("|");
        for (const part of parts) {
            const trimmed = part.replace(/[\*_]/g, "").trim();;
            if (trimmed.toLowerCase().startsWith(key.toLowerCase())) {
                return trimmed.substring(key.length).replace(/^:/, "").trim();
            }
        }
        return null;
    }

    function formatDataContent(rawText) {
        const cleanText = rawText.replace(/\\*\\*/g, ""); 
        const lines = cleanText.split('\\n');
        let htmlOutput = "";
        let foundData = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;
            line = line.replace(/^[-*•]\\s+/, "");

            if (line.includes("Page ID:") && line.includes("Title:")) {
                 foundData = true;
                 const title = extractValue(line, "Title") || "Untitled Page";
                 const link = extractValue(line, "Link") || "#";
                 htmlOutput += \`<div class="confluence-row"><span class="confluence-link">\${title}</span></div>\`;
                 continue;
            }
            if (line.includes("Summary:") && (line.includes("Ticket:") || line.includes("Status:"))) {
                foundData = true;
                const summary = extractValue(line, "Summary") || "No Summary";
                const status = extractValue(line, "Status") || "Unknown";
                htmlOutput += \`<div class="jira-row"><span class="jira-bullet">-</span><span>\${summary} - \${status}</span></div>\`;
                continue;
            }
            if (line.includes("Msg:") && line.includes("User:")) {
                foundData = true;
                let time = "";
                const timeMatch = line.match(/\\[(.*?)\\]/);
                if (timeMatch) time = timeMatch[1];
                const user = extractValue(line, "User") || "Unknown User";
                const msg = extractValue(line, "Msg") || "";
                let channel = extractValue(line, "Channel") || "";
                channel = channel.replace('#', '');
                htmlOutput += \`<div class="slack-container"><div class="slack-header">\${user} \${channel ? '#' + channel : ''} \${time}</div><div class="slack-msg">\${msg}</div></div>\`;
                continue;
            }
        }

        if (foundData) return \`<div class="data-card">\${htmlOutput}</div>\`;
        else return rawText.replace(/</g, "&lt;").replace(/\\n/g, "<br>");
    }

    function parseMarkdown(text) {
      const parts = text.split(/(\`\`\`[\\s\\S]*?\`\`\`)/g);
      let html = "";
      let nextFileContext = null;

      for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (part.startsWith("\`\`\`")) {
              const content = part.slice(3, -3).replace(/^\\w+\\n/, ""); 
              if (nextFileContext) {
                  const blockId = "block_" + Math.random().toString(36).substr(2, 9);
                  window.codeBlockCache[blockId] = { path: nextFileContext, content: content };
                  html += \`<div class="code-wrapper"><div class="code-header"><span class="file-name">\${nextFileContext}</span><button class="review-btn" data-id="\${blockId}">Apply to File</button></div><div id="\${blockId}" class="code-content"><div class="loading-diff">Analyzing changes...</div></div></div>\`;
                  vscode.postMessage({ command: 'get_file_context', path: nextFileContext, id: blockId });
                  nextFileContext = null; 
              } else {
                  html += formatDataContent(content); 
              }
          } else {
              const fileMatch = part.match(/### FILE: (.*?)\\s*$/);
              if (fileMatch) {
                  nextFileContext = fileMatch[1].trim();
                  html += part.substring(0, fileMatch.index).replace(/</g, "&lt;").replace(/\\n/g, "<br>");
              } else {
                  html += part.replace(/</g, "&lt;").replace(/\\n/g, "<br>");
              }
          }
      }
      return html;
    }

    async function sendMessage() {
      if (isGenerating) return; 
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = "";
      const userDiv = createMsgDiv("me");
      userDiv.textContent = text;
      messagesEl.scrollTop = messagesEl.scrollHeight;
      setStatus("thinking...");
      isGenerating = true;

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text })
        });
        if (!res.ok) throw new Error("Backend Error " + res.status);

        const botDiv = createMsgDiv("bot");
        setStatus("generating...");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          botDiv.innerHTML = parseMarkdown(fullText);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
        setStatus("idle");
      } catch (err) {
        const errDiv = createMsgDiv("bot");
        errDiv.textContent = "Error: " + err.message;
        errDiv.style.color = "#ff6b6b";
        setStatus("offline");
      } finally {
        isGenerating = false;
      }
    }

    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("keydown", (e) => { 
      if (e.key === "Enter") sendMessage(); 
    });

    addBanner();
    setTimeout(() => {
        const welcomeDiv = createMsgDiv("bot");
        welcomeDiv.textContent = "System Ready. Ask me to 'Search Jira', 'Find Slack messages', or 'Fix a file'.";
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 500);
  </script>
</body>
</html>`;
}