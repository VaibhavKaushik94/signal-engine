document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.mode-btn');
    const powerBtn = document.getElementById('power-btn');
    const customContainer = document.getElementById('custom-container');
    const customPromptInput = document.getElementById('custom-prompt');
    const saveCustomBtn = document.getElementById('save-custom-btn');
    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');

    // 🔥 NEW: Ollama Heartbeat Ping
    async function checkOllama() {
        try {
            // Ping the default Ollama API root
            const response = await fetch("http://localhost:11434/", { method: "GET" });
            if (response.ok) {
                statusContainer.className = "online";
                statusText.textContent = "AI Engine: Online";
            } else {
                throw new Error("Bad response");
            }
        } catch (error) {
            statusContainer.className = "offline";
            statusText.textContent = "AI Engine: Offline (Start Ollama)";
        }
    }

    // Run the check as soon as the menu opens
    checkOllama();

    // Check for AI errors
    chrome.storage.local.get(['aiError'], (result) => {
        if (result.aiError && statusContainer.className === "online") {
            statusText.textContent = "AI Engine: Online (Error occurred - showing all posts)";
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
                // Just update UI to show the box, don't reload tab yet
                updateModeUI(mode);
            } else {
                // Save and apply immediately for presets
                chrome.storage.local.set({ focusMode: mode }, () => {
                    updateModeUI(mode);
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
            saveCustomBtn.textContent = "Saved ✓";
            setTimeout(() => saveCustomBtn.textContent = "Save & Apply", 3000);
            updatePowerUI(true);
            reloadActiveTab();
        });
    });

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
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0) {
                const tab = tabs[0];
                // If Chrome hides the URL, or if it matches our sites, force reload
                if (!tab.url || tab.url.match(/x\.com|twitter\.com|linkedin\.com|youtube\.com/)) {
                    chrome.tabs.reload(tab.id);
                }
            }
        });
    }
});