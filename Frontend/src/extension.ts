import * as vscode from "vscode";

const CHAT_VIEW_ID = "nexhacks26.chatView";
const CONTAINER_ID = "nexhacks26Container";

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
  }
}

function getWebviewHtml(): string {
  const nonce = String(Math.random()).slice(2);
  
  // CSP: Allows external images (for user avatars if needed) and local server connection
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
  <title>NexHacks Chat</title>

  <style>
    :root {
      --bg: #0b0f17;
      --panel: rgba(18, 22, 34, 0.78);
      --border: rgba(255,255,255,0.10);
      --border2: rgba(255,255,255,0.14);
      --text: rgba(255,255,255,0.92);
      --muted: rgba(255,255,255,0.70);
      --accent: #7dd3fc;
      --accentBg: rgba(125,211,252,0.18);
      --accentBorder: rgba(125,211,252,0.35);
      
      /* Grey Data Box */
      --cardBg: rgba(30, 35, 45, 0.6);
      --cardBorder: rgba(255, 255, 255, 0.15);
    }

    body {
      margin: 0;
      height: 100vh;
      overflow: hidden;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      background:
        radial-gradient(1200px 600px at 70% -10%, rgba(56,189,248,0.12), transparent 55%),
        radial-gradient(900px 500px at 15% 0%, rgba(125,211,252,0.08), transparent 60%),
        var(--bg);
      color: var(--text);
    }

    #chatRoot {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      backdrop-filter: blur(14px);
    }

    #header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 650;
      letter-spacing: 0.2px;
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

    /* Message Bubbles */
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
      color: rgba(255,255,255,0.95);
      padding-left: 4px;
    }

    /* THE GREY DATA BOX */
    .data-card {
      background: var(--cardBg);
      border: 1px solid var(--cardBorder);
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    /* --- JIRA STYLING --- */
    .jira-row {
        display: flex;
        align-items: flex-start;
        margin-bottom: 8px;
        color: rgba(255,255,255,0.9);
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding-bottom: 6px;
    }
    .jira-row:last-child { border: none; margin-bottom: 0; }
    .jira-bullet { margin-right: 8px; color: var(--accent); font-weight: bold; }

    /* --- CONFLUENCE STYLING --- */
    .confluence-row {
        display: flex;
        align-items: flex-start;
        margin-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
        padding-bottom: 6px;
    }
    .confluence-row:last-child { border: none; margin-bottom: 0; }
    .confluence-bullet { margin-right: 8px; font-size: 1.1em; }
    .confluence-link { color: var(--accent); text-decoration: none; font-weight: 600; }
    .confluence-link:hover { text-decoration: underline; }

    /* --- SLACK STYLING --- */
    .slack-container {
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .slack-container:last-child { border-bottom: none; margin-bottom: 0; }
    .slack-header { 
        font-size: 0.9em; 
        color: var(--accent); 
        margin-bottom: 4px; 
        font-weight: 700; 
        opacity: 0.95; 
    }
    .slack-msg { 
        color: rgba(255,255,255,0.85); 
        white-space: pre-wrap; 
        margin-left: 2px; 
    }
    
    .banner {
        align-self: center;
        width: 100%;
        color: var(--accent);
        margin-bottom: 10px;
        opacity: 0.9;
    }
    .banner pre {
        font-family: 'Courier New', Courier, monospace;
        font-size: 5px; 
        font-weight: bold;
        line-height: 1.1;
        white-space: pre;
        overflow-x: hidden; 
        margin: 0;
        text-align: center;
    }

    #composer {
      padding: 12px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 10px;
      background: rgba(0,0,0,0.12);
    }

    #input {
      flex: 1;
      height: 42px;
      border-radius: 12px;
      border: 1px solid var(--border2);
      background: rgba(10, 12, 20, 0.65);
      color: var(--text);
      padding: 0 12px;
      outline: none;
    }

    #input:focus {
      border-color: rgba(125,211,252,0.45);
      box-shadow: 0 0 0 3px rgba(125,211,252,0.15);
    }

    #send {
      height: 42px;
      padding: 0 14px;
      border-radius: 12px;
      border: 1px solid rgba(125,211,252,0.55);
      background: rgba(125,211,252,0.95);
      color: #071018;
      font-weight: 700;
      cursor: pointer;
    }

    #send:active { transform: translateY(1px); }
  </style>
</head>

<body>
  <div id="chatRoot">
    <div id="header">
      <div>NexHacks Agent</div>
      <div id="status">idle</div>
    </div>

    <div id="messages"></div>

    <div id="composer">
      <input id="input" placeholder="Search Jira, Slack, or Confluence..." />
      <button id="send">Send</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const API_URL = "http://127.0.0.1:8000/chat";

    const statusEl = document.getElementById("status");
    const messagesEl = document.getElementById("messages");
    const inputEl = document.getElementById("input");
    const sendBtn = document.getElementById("send");

    let isGenerating = false;

// --- ASCII ART BANNER (CLEAN & BORDERLESS) ---
    const BANNER_ART = \`
  ██████╗ ██████╗ ███╗   ██╗████████╗███████╗██╗  ██╗████████╗
 ██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝╚██╗██╔╝╚══██╔══╝
 ██║     ██║   ██║██╔██╗ ██║   ██║   █████╗   ╚███╔╝    ██║   
 ██║     ██║   ██║██║╚██╗██║   ██║   ██╔══╝   ██╔██╗    ██║   
 ╚██████╗╚██████╔╝██║ ╚████║   ██║   ███████╗██╔╝ ██╗   ██║   
  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝   

          ██████╗  ██████╗                                   
         ██╔════╝ ██╔═══██╗                                  
         ██║      ██║   ██║                                  
         ██║      ██║   ██║                                   
         ╚██████╗ ╚██████╔╝    ██╗                            
          ╚═════╝  ╚═════╝     ╚═╝                            \`;

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

    // --- HELPER TO SAFELY EXTRACT VALUES FROM "KEY: VALUE | KEY2: VALUE" ---
    function extractValue(line, key) {
        // Looks for "Key:" followed by anything until "|" or end of line
        const parts = line.split("|");
        for (const part of parts) {
            const trimmed = part.trim();
            // Allow sloppy matching (case insensitive, optional colon)
            if (trimmed.toLowerCase().startsWith(key.toLowerCase())) {
                // Return everything after the key (and colon if present)
                return trimmed.substring(key.length).replace(/^:/, "").trim();
            }
        }
        return null;
    }

    // --- FAIL-SAFE DATA FORMATTER ---
    function formatDataContent(rawText) {
        // Remove markdown formatting like **bold**
        const cleanText = rawText.replace(/\\*\\*/g, ""); 
        const lines = cleanText.split('\\n');
        
        let htmlOutput = "";
        let foundData = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            // Remove bullets provided by the backend so we don't double up
            line = line.replace(/^[-*•]\\s+/, "");

            // 1. CONFLUENCE DETECTION
            // Pattern: "Page ID: ... | Title: ... | Link: ..."
            if (line.includes("Page ID:") && line.includes("Title:")) {
                 foundData = true;
                 const title = extractValue(line, "Title") || "Untitled Page";
                 const link = extractValue(line, "Link") || "#";

                 htmlOutput += \`
                 <div class="confluence-row">
                    <span class="confluence-bullet">📄</span>
                    <span><a href="\${link}" class="confluence-link">\${title}</a></span>
                 </div>\`;
                 continue;
            }

            // 2. JIRA DETECTION
            // Pattern: "Ticket: ... | Status: ... | Summary: ..."
            if (line.includes("Summary:") && (line.includes("Ticket:") || line.includes("Status:"))) {
                foundData = true;
                const summary = extractValue(line, "Summary") || "No Summary";
                const status = extractValue(line, "Status") || "Unknown";
                
                htmlOutput += \`
                <div class="jira-row">
                    <span class="jira-bullet">-</span>
                    <span>\${summary} - \${status}</span>
                </div>\`;
                continue;
            }

            // 3. SLACK DETECTION
            // Pattern: "User: ... | Msg: ... | Channel: ..."
            // OR Pattern: "[Time] Channel: ... | User: ... | Msg: ..."
            if (line.includes("Msg:") && line.includes("User:")) {
                foundData = true;
                
                // Extract Time: Look for [TIMESTAMP] at start
                let time = "";
                const timeMatch = line.match(/\\[(.*?)\\]/);
                if (timeMatch) time = timeMatch[1];

                const user = extractValue(line, "User") || "Unknown User";
                const msg = extractValue(line, "Msg") || "";
                
                // Extract Channel safely
                let channel = extractValue(line, "Channel") || "";
                channel = channel.replace('#', ''); // Clean hash if exists

                htmlOutput += \`
                <div class="slack-container">
                    <div class="slack-header">\${user} \${channel ? '#' + channel : ''} \${time}</div>
                    <div class="slack-msg">\${msg}</div>
                </div>\`;
                continue;
            }
        }

        // Only return the formatted HTML if we actually found structured data.
        if (foundData) {
            return htmlOutput;
        } else {
            // Fallback: This wasn't one of our known data types.
            // Escape HTML and return plain text (preserving structure)
            return rawText.replace(/</g, "&lt;").replace(/\\n/g, "<br>");
        }
    }

    function parseMarkdown(text) {
      // Split content by code blocks: \`\`\` ... \`\`\`
      const parts = text.split(/(\`\`\`[\\s\\S]*?\`\`\`)/g);

      return parts.map(part => {
        if (part.startsWith("\`\`\`")) {
             // Remove the backticks (start and end)
             const content = part.slice(3, -3);
             
             // Run the formatter
             const formatted = formatDataContent(content);
             
             // Ensure we don't render empty grey boxes
             if (formatted.trim().length > 0) {
                 return \`<div class="data-card">\${formatted}</div>\`;
             } else {
                 return ""; 
             }
        } else {
             // Normal conversational text -> Plain text
             return part
                .replace(/</g, "&lt;")
                .replace(/\\n/g, "<br>");
        }
      }).join("");
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
          
          // Re-render full message on every chunk
          botDiv.innerHTML = parseMarkdown(fullText);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        setStatus("idle");

      } catch (err) {
        const errDiv = createMsgDiv("bot");
        errDiv.textContent = "Error connecting to Agent: " + err.message;
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

    // Start
    addBanner();
    setTimeout(() => {
        const welcomeDiv = createMsgDiv("bot");
        welcomeDiv.textContent = "System Ready. Ask me to 'Search Jira', 'Find Slack messages', or 'Search Confluence'.";
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 500);

  </script>
</body>
</html>`;
}