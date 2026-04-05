# DecisionNode - Usage Guide

## Quick Start

### 1. Setup (First time only)
```bash
npx decide setup
```

### 2. Daily Usage

```bash
# List all decisions for current project
npx decide list

# Filter by scope
npx decide list --scope UI

# Get specific decision
npx decide get ui-001

# Semantic search (AI-powered)
npx decide search "how should I style buttons?"

# Create a snapshot
npx decide commit -m "Added button color rule"

# View commit history
npx decide log

# Check current commit
npx decide status

# Navigate to previous commit
npx decide checkout HEAD~1

# Go to specific commit
npx decide checkout abc123
```

---

## Command Reference

### `npx decide list [--scope <SCOPE>]`
List all decisions, optionally filtered by scope.

**Examples:**
```bash
npx decide list              # All decisions
npx decide list --scope UI   # Only UI decisions
```

---

### `npx decide get <ID>`
Get full details of a specific decision.

**Example:**
```bash
npx decide get ui-001
```

---

### `npx decide search "<QUERY>"`
AI-powered semantic search across all decisions.

**Example:**
```bash
npx decide search "button styling"
npx decide search "how to handle errors?"
```

**Tip:** First run is slower (embeds all decisions). Subsequent runs are instant (cached in `vectors.json`).

---

### `npx decide commit -m "<MESSAGE>"`
Create a snapshot of all current decisions.

**What it does:**
- Saves full snapshot to the global history
- Re-embeds only changed decisions
- Updates HEAD pointer
- Stores vectors with the commit

**Example:**
```bash
npx decide commit -m "Finalized button design system"
```

**Output:**
```
📦 Creating snapshot...
🧠 Indexed 2 decision(s) for AI search.

✅ Committed: 7b0e2f11
   Message: Finalized button design system
   Time: 2025-12-23T13:41:02.724Z
   Scopes: frontend, ui
   Parent: 1cb32e66
```

---

### `npx decide log`
View commit history as a tree, showing the chain from oldest to newest.

**Output:**
```
📜 Commit History (5 commits):

📌 01b7ba8a - Initial UI decisions
   2025-12-23T11:45:24.713Z | 2 scopes
   │
   └─▶ 3e4c2e59

📌 3e4c2e59 - Test auto-embed (no changes)
   2025-12-23T13:21:12.646Z | 2 scopes
   │
   └─▶ 8fb1e19e

📌 7b0e2f11 - Stable commit 👉 HEAD
   2025-12-23T13:41:02.724Z | 2 scopes
```

The `👉 HEAD` marker shows your current position.

---

### `npx decide status`
Show current HEAD commit.

**Output:**
```
📍 HEAD: 7b0e2f11
   Message: Stable commit with vectors
   Time: 2025-12-23T13:41:02.724Z
   Scopes: 2 | Vectors: 8
   Parent: 1cb32e66
```

---

### `npx decide checkout <COMMIT-ID | HEAD~N>`
Time-travel: restore decisions and vectors to a specific commit.

**Examples:**
```bash
npx decide checkout HEAD~1        # Go back 1 commit
npx decide checkout HEAD~3        # Go back 3 commits
npx decide checkout 7b0e2f11      # Go to specific commit
```

**What it does:**
- Restores all decision files to that commit's state
- Restores vectors for AI search
- Updates HEAD pointer

**Output:**
```
🔙 Going back 1 commit(s) to 1cb32e66...
⏳ Checking out commit 1cb32e66...

✅ Checked out: 1cb32e66
   Message: Added soft pastels to color policy
   Time: 2025-12-23T13:23:05.836Z
   Scopes: frontend, ui
   Vectors: 8 decision(s) indexed
```

---

## Core Workflows

### 1. Capture a Decision
When you make a design or architecture choice, add it via CLI or AI (stored in global json files):

```json
{
  "id": "ui-007",
  "scope": "UI",
  "decision": "Use 4px border-radius on all buttons",
  "rationale": "Matches brand guidelines",
  "status": "active",
  "createdAt": "2025-12-23T12:00:00Z"
}
```

Then commit:
```bash
npx decide commit -m "Added button border-radius rule"
```

---

### 2. Query Before Coding
Before asking AI to generate code, check relevant decisions:

```bash
npx decide search "button styling"
```

Include the results in your AI prompt for consistent output.

---

### 3. Navigate History
Go back in time to see how decisions evolved:

```bash
npx decide log                    # See full history
npx decide checkout HEAD~2        # Go back 2 commits
npx decide get ui-001             # See old version
npx decide checkout 7b0e2f11      # Come back to latest
```

---

## Best Practices

| ✅ Do | ❌ Don't |
|-------|---------|
| Capture decisions immediately | Rely on chat memory |
| Query before generating code | Assume AI remembers |
| Use semantic search | Keyword-only searches |
| Commit after milestones | Never save history |
| Use `ask` for discovery | Manually grep JSON files |

---

## File Structure

**Location:** `~/.decisionnode/.decisions/{ProjectName}/`

```
├── ui.json              ← UI decisions for this project
├── frontend.json        ← Frontend architecture
├── vectors.json         ← AI embedding cache
└── history/
    ├── head.json        ← Current commit pointer
    └── commits/
        ├── 01b7ba8a.json  ← Snapshot + vectors
        └── ...
```

There are no files created in your local project directory.

---

## AI Integration Details

### How Embeddings Work
1. First `ask` command embeds all decisions (slow)
2. Embeddings cached in `vectors.json`
3. Future searches are instant
4. On commit, only changed decisions are re-embedded

### Embedding Updates
- **Manual edit** → Run `npx decide search` to update cache
- **Commit** → Auto-embeds changed decisions
- **Checkout** → Restores vectors from that commit

---

## Tips & Tricks

### Quick Navigation
```bash
npx decide checkout HEAD~1   # Back
npx decide checkout HEAD~1   # Back again
npx decide log               # Check where you are
```

### Comparing Commits
```bash
npx decide checkout abc123
npx decide get ui-001        # See version in abc123

npx decide checkout xyz456
npx decide get ui-001        # Compare with xyz456
```

### Finding Decisions
```bash
# Semantic search (recommended)
npx decide search "error handling"

# List and filter
npx decide list --scope Backend
```
