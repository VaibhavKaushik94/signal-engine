![Signal Engine banner](assets/banner.png)

# Signal Engine (Chrome Extension)

A lightweight Chrome extension that filters social media feeds (X/Twitter, LinkedIn, YouTube) using a local AI service (Ollama). It hides posts that don’t match the selected content focus (software, hardware, finance, or a custom filter).

---

## 🚀 Features

- Filters feed items in real time using AI classification
- Supports modes:
  - **Software** (coding, AI/ML, cybersecurity)
  - **Hardware** (embedded, Raspberry Pi, physical systems)
  - **Finance** (markets, macro, equities)
  - **Custom** (user-defined prompt)
- Shows a badge state (ON/OFF) and mode label
- Highlights kept posts and hides irrelevant ones
- Automatically updates as new posts load (MutationObserver)

---

## 🧩 Architecture

### Key files

- `manifest.json` — Chrome extension manifest (MV3)
- `background.js` — service worker that sends text to Ollama and decides ALLOWED/BLOCKED
- `content.js` — DOM observer & post filtering logic
- `popup.html` / `popup.js` — extension UI for mode selection + status
- `config.js` — shared constants/configuration values
- `constants.js` — shared prompts for each focus mode

---

## 🛠️ Setup

### Prerequisites

- Chrome (or Chromium-based browser) with extension loading enabled
- Ollama installed and running locally (recommended) or a compatible cloud endpoint

### Quick start (Unix/Linux)

```bash
chmod +x setup.sh
./setup.sh
```

### Quick start (Windows PowerShell)

```powershell
pwsh .\setup.ps1
```

### Manual setup (optional)

1. Install Ollama (macOS):
   - `brew install ollama`
   - Verify with `ollama --version`
2. Pull the required model:
   - `ollama pull phi3`
3. Run Ollama with CORS and open origin allowed:
   - `export OLLAMA_ORIGIN='*'`
   - `ollama serve --host 127.0.0.1 --port 11434 --cors`

### Load into Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this project folder (`feed-filter-mvp`)

### Cloud vs Local mode

- In popup UI, choose **Local Ollama** or **Cloud API**.
- For cloud, set a separate `apiEndpoint`, e.g., `https://your-service-host.com`.

### Metrics

The popup displays:
- scanned posts
- allowed posts
- blocked posts

### Tagging for release

Use this sequence to tag version 1.0:

```bash
git add .
git commit -m "chore: release v1.0"
git tag -a v1.0 -m "Signal Engine v1.0"
git push origin main --tags
```


---

## ✅ Usage

1. Click the extension icon to open the popup.
2. Choose a mode (Software / Hardware / Finance / Custom).
3. If using **Custom**, enter your own filter prompt and click **Save & Apply**.
4. Visit X/Twitter, LinkedIn, or YouTube and watch the feed be filtered.

---

## ⚠️ Important Notes

- **API Keys:** This repo no longer hardcodes any external API credentials. The extension communicates with a local Ollama instance only.
- **Performance:** The extension uses a `MutationObserver` to avoid polling, but filtering still runs per post; keep an eye on CPU usage for very large feeds.
- **Fail-open:** If AI analysis fails or Ollama is offline, posts are shown (fail-open) to avoid hiding content unexpectedly.

---

## 🧪 Testing & Development

- Reload the extension in `chrome://extensions` after editing source files.
- Use Chrome DevTools (Console) to view logging from `background.js` and `content.js`.
- Run the prompt accuracy harness:

```bash
node prompt_tests.js
```

This script exercises sample posts in each mode (software/hardware/finance/custom) and validates Ollama output against expected labels. It should help prove quality and identify prompt drift quickly.

---

## 🧵 File Structure

```
feed-filter-mvp/
├── background.js
├── content.js
├── constants.js
├── config.js
├── manifest.json
├── popup.html
├── popup.js
└── README.md
```

---

## 💡 Future Improvements

- Add persistent storage for filter stats / history
- Add a “filter strength” slider (soft/hard filtering)
- Add optional cloud backend (instead of local Ollama)

---

If you run into issues, check the Chrome extension console for errors and ensure Ollama is running locally at `http://localhost:11434/`.
