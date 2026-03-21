# Signal Engine (Chrome Extension)

A lightweight Chrome extension that filters social media feeds (X/Twitter, LinkedIn, YouTube) using a local AI service (Ollama). Signal Engine doesn't just block keywords; it uses LLMs to understand the **intent** of every post.

---

## 🚀 Features

- **Real-time AI Filtering:** Powered by local LLMs (Ollama + Phi-3) for 100% privacy.
- **Multiple Platforms:** Native support for **X (Twitter)**, **LinkedIn**, and **YouTube** (including home feeds and search).
- **Dual Action Modes:**
  - **HIDE (Green Badge):** Irrelevant posts are completely removed for a focused experience.
  - **LABEL (Purple Badge):** Posts stay visible but are tagged with Red/Green left-side borders based on relevance.
- **Optimized Prompts:** High-accuracy classification using the RTCE (Role-Task-Constraint-Example) pattern.
- **Focus Categories:**
  - **Software & Cyber:** Architecture, code releases, AI/ML, and security.
  - **Hardware & Systems:** Microcontrollers, PCB design, and physical prototyping.
  - **Finance:** Markets, macroeconomics, and venture capital.
  - **Custom:** Define your own rules (e.g., "Only show me posts about Rust and WASM").
- **Metrics Dashboard:** Track scanned, allowed, and blocked posts in real-time.

---

## 🧩 Architecture

### Key Files
- `manifest.json` — Chrome extension manifest (MV3).
- `background.js` — Service worker managing AI communication and icon status.
- `content.js` — DOM observer and platform-specific UI manipulation.
- `popup.html` / `popup.js` — Settings UI and metrics dashboard.
- `constants.js` — Refined AI prompts for each focus mode.
- `setup.sh` — Automated setup for macOS and Linux.

---

## 🛠️ Setup

### Prerequisites
- Chrome or any Chromium-based browser.
- [Ollama](https://ollama.com/) installed and running.

### Quick Start (macOS & Linux)
```bash
chmod +x setup.sh
./setup.sh
```

### Manual setup
1.  **Pull the model:**
    ```bash
    ollama pull phi3
    ```
2.  **Enable CORS for Chrome Extensions:**
    ```bash
    export OLLAMA_ORIGIN="*"
    ollama serve
    ```

### Load into Chrome
1.  Open `chrome://extensions`.
2.  Enable **Developer mode** (top right).
3.  Click **Load unpacked**.
4.  Select the `feed-filter-mvp` folder.

---

## ✅ Usage
1.  Click the extension icon to open the settings.
2.  Choose your **Focus Mode** (Software, Hardware, Finance, or Custom).
3.  Select your **Action Mode**:
    - **HIDE:** Create a distraction-free feed.
    - **LABEL:** Tag posts visually without removing them.
4.  Refresh your social media tab and enjoy the signal.

---

## 🧪 Testing & Development
Run the CLI accuracy harness to validate AI responses against a diverse dataset:
```bash
node prompt_tests.js
```

---

## 🧵 File Structure
```text
feed-filter-mvp/
├── icons/           # Extension icons
├── background.js    # AI Bridge & Badge Logic
├── content.js       # DOM Climber & Filtering
├── constants.js     # Structured AI Prompts (RTCE)
├── manifest.json    # Extension Metadata
├── popup.html       # UI Layout
├── popup.js         # UI Logic & Persistence
└── prompt_tests.js  # Accuracy Harness
```

---

## ⚠️ Important Notes
- **Privacy:** All AI classification happens locally on your machine. No data is sent to external servers.
- **Fail-open:** If Ollama is unreachable, the extension defaults to showing all posts to ensure no critical content is missed.
- **Performance:** Filtering runs per post via `MutationObserver`. Keep an eye on system resources for extremely large feeds.

---

## 💡 Future Improvements
- Persistent storage for historical filter stats.
- Support for more local models (Llama 3, Mistral).
- Cloud backend option for users without local GPUs.
