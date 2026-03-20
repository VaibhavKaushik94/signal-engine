// Background service worker for Signal Engine

import { MODE_PROMPTS } from './constants.js';
import { CONFIG } from './config.js';

function parseAIResponse(rawResponse) {
    const normalized = (rawResponse || '').toUpperCase().replace(/[^A-Z]/g, ' ').trim();
    const tokens = normalized.split(/\s+/);

    if (tokens.includes('ALLOWED')) return { isProductive: true, label: 'ALLOWED' };
    if (tokens.includes('BLOCKED')) return { isProductive: false, label: 'BLOCKED' };
    if (tokens.includes('KEEP')) return { isProductive: true, label: 'ALLOWED' };
    if (tokens.includes('DROP') || tokens.includes('LOW') || tokens.includes('NO')) return { isProductive: false, label: 'BLOCKED' };

    // FAIL-OPEN pattern in case of parser confusion: keep safe default which avoids removing legitimate posts
    return { isProductive: true, label: 'ALLOWED' };
}

// --- 2. MAIN AI INTERCEPTOR ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzeContent") {
        
        chrome.storage.local.get(['focusMode', 'customPromptText'], (result) => {
            const currentMode = result.focusMode || 'software';
            let systemPrompt = "";

            // 🔥 NEW: Dedicated, ultra-strict prompt template for Custom Mode
            if (currentMode === 'custom') {
                const userRules = result.customPromptText || "Technology and Science";
                systemPrompt = `You are a ruthless but precise binary content filter.
                USER'S CUSTOM RULE: "${userRules}"

                Evaluate only the provided main post text. Ignore the idea of related replies or nested comments.
                - If the text strictly aligns with the user's custom rule, output exactly: ALLOWED
                - If it is off-topic, irrelevant, generic, or loosely related, output exactly: BLOCKED
                - If you cannot decide, choose BLOCKED (prioritize user-focus quality).

                Output EXACTLY ONE WORD: ALLOWED or BLOCKED. Do not include any additional text.`;
            } else {
                // Standard preset prompt
                const modeInstructions = MODE_PROMPTS[currentMode] || MODE_PROMPTS['software'];
                systemPrompt = `You are a ruthless content filter. ${modeInstructions}
                Evaluate the following text. 
                - If it strictly matches your allowed topics, output exactly: ALLOWED
                - If it does not match, or is generic, output exactly: BLOCKED
                Output EXACTLY ONE WORD. No explanations.`;
            }

            chrome.storage.local.get(['apiSource', 'apiEndpoint'], (sourceResult) => {
                const source = sourceResult.apiSource || 'local';
                const baseUrl = (source === 'cloud' && sourceResult.apiEndpoint) ? sourceResult.apiEndpoint.replace(/\/$/, '') : 'http://localhost:11434';
                const url = `${baseUrl}/api/generate`;

                fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "phi3:latest", 
                        prompt: `${systemPrompt}\n\nPost text: "${request.text}"`,
                        stream: false,
                        options: { temperature: 0.0, num_predict: CONFIG.numPredict }
                    })
                })
                .then(async (response) => {
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return response.json();
                })
                .then(data => {
                    const rawResponse = (data.response || "").trim();
                    console.log(`[Mode: ${currentMode.toUpperCase()}] AI Output: "${rawResponse}"`);

                    const parseResult = parseAIResponse(rawResponse);
                    sendResponse({ isProductive: parseResult.isProductive, label: parseResult.label });
                    chrome.storage.local.set({ 'aiError': false });
                })
                .catch(error => {
                    console.error("[Background] Connect failed:", error);
                    chrome.storage.local.set({ 'aiError': true });
                    sendResponse({ isProductive: true }); 
                });
            });
        });

        return true;
    }
});

// --- 3. ICON BADGE HUD LOGIC ---
function updateBadge() {
    chrome.storage.local.get(['focusMode', 'isActive'], (result) => {
        const isActive = result.isActive !== false;
        const mode = result.focusMode || 'software';

        if (!isActive) {
            chrome.action.setBadgeText({ text: "OFF" });
            chrome.action.setBadgeBackgroundColor({ color: "#ef4444" }); // Red
        } else {
            let text = "SW";
            let color = "#10b981"; // Default Green
            
            if (mode === 'hardware') text = "HW";
            if (mode === 'finance') text = "FIN";
            
            // 🔥 NEW: Catch the custom mode and change the icon
            if (mode === 'custom') {
                text = "CU";
                color = "#3b82f6"; // Blue to indicate Custom
            }
            
            chrome.action.setBadgeText({ text: text });
            chrome.action.setBadgeBackgroundColor({ color: color });
        }
    });
}

chrome.runtime.onStartup.addListener(updateBadge);
chrome.runtime.onInstalled.addListener(updateBadge);

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.focusMode || changes.isActive) {
        updateBadge();
    }
});