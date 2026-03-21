document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.mode-btn');
    const powerBtn = document.getElementById('power-btn');
    const customContainer = document.getElementById('custom-container');
    const customPromptInput = document.getElementById('custom-prompt');
    const saveCustomBtn = document.getElementById('save-custom-btn');
    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');
    const metricScanned = document.getElementById('metric-scanned');
    const metricAllowed = document.getElementById('metric-allowed');
    const metricBlocked = document.getElementById('metric-blocked');

    // 🔥 NEW: Ollama/Cloud Heartbeat & Model ping
    async function checkOllama() {
        const endpoint = 'http://localhost:11434';
        const statusUrl = endpoint.replace(/\/$/, '') + '/';
        const modelsUrl = endpoint.replace(/\/$/, '') + '/models';

        try {
            const resp = await fetch(statusUrl, { method: 'GET' });
            if (!resp.ok) throw new Error('Bad response');

            statusContainer.className = 'online';
            statusText.textContent = 'AI Engine: Local Ollama online';

            const modelsResp = await fetch(modelsUrl, { method: 'GET' });
            if (modelsResp.ok) {
                const modelsData = await modelsResp.json();
                const hasPhi3 = Array.isArray(modelsData) ? modelsData.some(m => m.name === 'phi3') : !!modelsData?.find?.(m => m.name === 'phi3');
                if (hasPhi3) {
                    statusText.textContent = `${statusText.textContent} (phi3 OK)`;
                } else {
                    statusText.textContent = `${statusText.textContent} (phi3 missing)`;
                }
            }
        } catch (error) {
            statusContainer.className = 'offline';
            statusText.textContent = 'AI Engine: Local Ollama unreachable';
        }
    }

    // Load metrics and refresh status
    chrome.storage.local.get(['totalScanned', 'totalAllowed', 'totalBlocked'], (result) => {
        metricScanned.textContent = result.totalScanned || 0;
        metricAllowed.textContent = result.totalAllowed || 0;
        metricBlocked.textContent = result.totalBlocked || 0;
    });

    // Run the check as soon as the menu opens
    checkOllama();

    // Check for AI errors
    chrome.storage.local.get(['aiError'], (result) => {
        if (result.aiError && statusContainer.className === 'online') {
            statusText.textContent = 'AI Engine: Service Warning (Falling back to unfiltered)';
        }
    });

    // 1. Load initial states
    chrome.storage.local.get(['focusMode', 'isActive', 'customPromptText'], (result) => {
        const currentMode = result.focusMode || 'software';
        const isActive = result.isActive !== false; 
        
        if (result.customPromptText) {
            customPromptInput.value = result.customPromptText;
        }

        updateModeUI(currentMode);
        updatePowerUI(isActive);

        if (currentMode === 'custom') {
            statusText.textContent = 'AI Engine: Local Ollama (custom filter active)';
        }
    });

    // 2. Power Button Logic
    powerBtn.addEventListener('click', () => {
        chrome.storage.local.get(['isActive'], (result) => {
            const newState = result.isActive === false ? true : false;
            chrome.storage.local.set({ isActive: newState }, () => {
                updatePowerUI(newState);
                reloadActiveTab();
            });
        });
    });

    // 3. Preset Mode Buttons Logic
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');

            // If user changes mode, ensure the extension is active
            chrome.storage.local.set({ isActive: true }, () => {
                updatePowerUI(true);
            });

            if (mode === 'custom') {
                // Set custom mode so we evaluate with custom prompt immediately
                chrome.storage.local.set({ focusMode: 'custom' }, () => {
                    updateModeUI('custom');
                    customContainer.classList.add('visible');
                    statusText.textContent = 'AI Engine: Local Ollama (custom filter active)';
                    reloadActiveTab();
                });
            } else {
                // Save and apply immediately for presets
                chrome.storage.local.set({ focusMode: mode }, () => {
                    updateModeUI(mode);
                    statusText.textContent = `AI Engine: Local Ollama online (${mode})`;
                    reloadActiveTab();
                });
            }
        });
    });

    // 4. Save Custom Prompt Logic
    saveCustomBtn.addEventListener('click', () => {
        const customText = customPromptInput.value.trim();
        if (!customText) {
            alert("Please enter a filter description.");
            return;
        }
        
        // Ensure extension is active when custom filter is saved
        chrome.storage.local.set({ 
            isActive: true,
            focusMode: 'custom',
            customPromptText: customText 
        }, () => {
            saveCustomBtn.textContent = "Saved";
            setTimeout(() => saveCustomBtn.textContent = "Save & Apply", 3000);
            updateModeUI('custom');
            updatePowerUI(true);
            reloadActiveTab();
        });
    });

    function updateMetrics() {
        chrome.storage.local.get(['totalScanned', 'totalAllowed', 'totalBlocked'], (result) => {
            const scanned = result.totalScanned || 0;
            const allowed = result.totalAllowed || 0;
            const blockedDerived = Math.max(0, scanned - allowed);

            metricScanned.textContent = scanned;
            metricAllowed.textContent = allowed;
            metricBlocked.textContent = blockedDerived;
        });
    }

    // Refresh metrics in real time when storage changes
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.totalScanned || changes.totalAllowed || changes.totalBlocked) {
            updateMetrics();
        }
    });

    updateMetrics();

    // --- Helper Functions ---
    function updateModeUI(activeMode) {
        buttons.forEach(btn => {
            if (btn.getAttribute('data-mode') === activeMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Toggle the custom text area visibility
        if (activeMode === 'custom') {
            customContainer.classList.add('visible');
        } else {
            customContainer.classList.remove('visible');
        }
    }

    function updatePowerUI(isActive) {
        if (isActive) {
            powerBtn.textContent = "Turn OFF";
            powerBtn.className = "on";
            setModeButtonsEnabled(true);
        } else {
            powerBtn.textContent = "Turn ON";
            powerBtn.className = "off";
            setModeButtonsEnabled(false);
        }
    }

    function setModeButtonsEnabled(enabled) {
        buttons.forEach(btn => {
            if (enabled) {
                btn.classList.remove('disabled');
                btn.disabled = false;
            } else {
                btn.classList.add('disabled');
                btn.disabled = true;
            }
        });
    }

    function reloadActiveTab() {
        try {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs.length > 0) {
                    const tab = tabs[0];
                    // If Chrome hides the URL, or if it matches our sites, force reload
                    if (!tab.url || tab.url.match(/x\.com|twitter\.com|linkedin\.com|youtube\.com/)) {
                        chrome.tabs.reload(tab.id, () => {
                            if (chrome.runtime.lastError) {
                                console.warn('Signal Engine reload warning:', chrome.runtime.lastError.message);
                            }
                        });
                    }
                }
            });
        } catch (err) {
            console.warn('Signal Engine reloadActiveTab exception:', err);
        }
    }
});