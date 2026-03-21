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

    const toggleHide = document.getElementById('toggle-hide');
    const toggleLabel = document.getElementById('toggle-label');
    const actionLabel = document.getElementById('action-label');
    const actionDesc = document.getElementById('action-desc');

    let currentFocusMode = 'software';
    let currentActionType = 'hide';

    async function checkOllama() {
        const endpoint = 'http://localhost:11434';
        try {
            const resp = await fetch(endpoint + '/', { method: 'GET' });
            if (!resp.ok) throw new Error();
            statusContainer.className = 'online';
            statusText.textContent = 'AI Engine: Local Ollama online';
        } catch (error) {
            statusContainer.className = 'offline';
            statusText.textContent = 'AI Engine: Local Ollama unreachable';
        }
    }

    chrome.storage.local.get(['focusMode', 'isActive', 'customPromptText', 'actionType'], (result) => {
        currentFocusMode = result.focusMode || 'software';
        currentActionType = result.actionType || 'hide';
        const isActive = result.isActive !== false; 
        
        if (result.customPromptText) customPromptInput.value = result.customPromptText;

        updateModeUI(currentFocusMode);
        updatePowerUI(isActive);
        updateActionUI(currentActionType);
    });

    checkOllama();

    powerBtn.addEventListener('click', () => {
        chrome.storage.local.get(['isActive'], (result) => {
            const newState = result.isActive === false;
            chrome.storage.local.set({ isActive: newState }, () => {
                updatePowerUI(newState);
                reloadActiveTab();
            });
        });
    });

    toggleHide.addEventListener('click', () => setAction('hide'));
    toggleLabel.addEventListener('click', () => setAction('label'));

    function setAction(type) {
        currentActionType = type;
        chrome.storage.local.set({ actionType: type }, () => {
            updateActionUI(type);
            reloadActiveTab();
        });
    }

    function updateActionUI(type) {
        const modeTitle = document.querySelector(`.mode-btn[data-mode="${currentFocusMode}"] .mode-title`).textContent.trim();
        
        if (type === 'hide') {
            toggleHide.classList.add('active');
            toggleLabel.classList.remove('active');
            actionLabel.textContent = 'HIDING';
            actionDesc.innerHTML = `Irrelevant posts (not <b>${modeTitle}</b>) are removed.`;
        } else {
            toggleHide.classList.remove('active');
            toggleLabel.classList.add('active');
            actionLabel.textContent = 'LABELING';
            actionDesc.innerHTML = `Tagging posts relevant to <b>${modeTitle}</b> with borders.`;
        }
    }

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            currentFocusMode = mode;
            chrome.storage.local.set({ isActive: true, focusMode: mode }, () => {
                updatePowerUI(true);
                updateModeUI(mode);
                updateActionUI(currentActionType); // Refresh description
                reloadActiveTab();
            });
        });
    });

    saveCustomBtn.addEventListener('click', () => {
        const customText = customPromptInput.value.trim();
        if (!customText) return;
        chrome.storage.local.set({ isActive: true, focusMode: 'custom', customPromptText: customText }, () => {
            saveCustomBtn.textContent = "Saved";
            setTimeout(() => saveCustomBtn.textContent = "Save & Apply", 2000);
            currentFocusMode = 'custom';
            updateModeUI('custom');
            updateActionUI(currentActionType);
            updatePowerUI(true);
            reloadActiveTab();
        });
    });

    function updateMetrics() {
        chrome.storage.local.get(['totalScanned', 'totalAllowed', 'totalBlocked'], (result) => {
            metricScanned.textContent = result.totalScanned || 0;
            metricAllowed.textContent = result.totalAllowed || 0;
            metricBlocked.textContent = result.totalBlocked || 0;
        });
    }

    chrome.storage.onChanged.addListener(updateMetrics);
    updateMetrics();

    function updateModeUI(activeMode) {
        buttons.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-mode') === activeMode));
        customContainer.classList.toggle('visible', activeMode === 'custom');
    }

    function updatePowerUI(isActive) {
        powerBtn.textContent = isActive ? "Turn OFF" : "Turn ON";
        powerBtn.className = isActive ? "on" : "off";
    }

    function reloadActiveTab() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) chrome.tabs.reload(tabs[0].id);
        });
    }
});