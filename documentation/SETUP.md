# DecisionNode Setup & Configuration

## 🚀 Quick Start (Automated)

The easiest way to get started is using the interactive setup wizard. This figures out your configuration and sets everything up for you.

```bash
npx decide setup
```

**What this does:**
1.  **Detects Environment**: Checks if you are running in Antigravity or VS Code.
2.  **Configures MCP**: Automatically updates your `mcp_config.json` to include DecisionNode.
3.  **Sets API Key**: Prompts for your Gemini API key (for semantic search).
4.  **Verifies**: checks that everything is working.

---

## 🏗️ Architecture: Per-Project Globals

DecisionNode uses a **Universal Global Store** architecture. You do **NOT** need to configure separate MCP servers for each project.

-   **Single MCP Entry**: One entry (`decisionnode`) serves ALL your projects.
-   **Auto-Isolation**: Decisions are stored in `~/.decisionnode/.decisions/{ProjectName}/`.
-   **Context Awareness**: The system automatically detects which project you are working on.

### Where is my data?
Your decisions are stored securely in your user home directory:

```
~/.decisionnode/.decisions/
├── Codex10/          ← Project A
├── MyApp/            ← Project B
└── ...
```

There are **no local files** created in your project folder (keeps your repo clean!).

---

## 🛠️ Manual Configuration (Advanced)

If you prefer to configure manually or the wizard fails:

1.  **Install**: `npm install -g decisionnode` (or local path)
2.  **Edit `mcp_config.json`**:

```json
{
  "mcpServers": {
    "decisionnode": {
      "command": "node",
      "args": ["path/to/decisionnode/dist/mcp/server.js"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

3.  **Restart** your AI editor/agent.

---

## 🧩 Troubleshooting

**"No decisions found"**
-   The `.decisions` folder is created automatically when you first add a decision.
-   Ensure your AI agent is passing the `project` parameter (Antigravity handles this automatically).

**"GEMINI_API_KEY missing"**
-   Add it to your MCP config `env` section.
-   OR create `~/.decisionnode/.env` with `GEMINI_API_KEY=...`.

