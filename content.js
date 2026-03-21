const CONFIG = {
    minPostLength: 10,
    borderColor: '#10b981',
    borderWidth: '5px',
    numPredict: 5
};

let isExtensionActive = true;

chrome.storage.local.get(['isActive'], (result) => {
    isExtensionActive = result.isActive !== false;
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.isActive) isExtensionActive = changes.isActive.newValue;
});

// --- PLATFORM CONFIGURATOR ---
const PLATFORMS = {
    x: {
        containerSelector: '[data-testid="cellInnerDiv"]',
        textSelector: '[data-testid="tweetText"]'
    },
    linkedin: {
        containerSelector: '.feed-shared-update-v2, .occludable-update, [data-urn], [data-id], .update-components-update-v2, .profile-creator-shared-feed-update__container',
        textSelector: '[data-testid="expandable-text-box"], .update-components-text'
    },
    youtube: {
        containerSelector: 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer',
        textSelector: 'h3 #video-title, a#video-title-link, h3 .yt-core-attributed-string'
    }
};

const currentHost = window.location.hostname;
let activePlatform;
if (currentHost.includes('linkedin')) {
    activePlatform = PLATFORMS.linkedin;
} else if (currentHost.includes('youtube')) {
    activePlatform = PLATFORMS.youtube;
} else {
    activePlatform = PLATFORMS.x;
}

async function analyzeContent(text) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "analyzeContent", text: text }, (response) => {
            if (chrome.runtime.lastError || !response) {
                resolve({ isProductive: true, label: 'ALLOWED' });
            } else {
                resolve({ isProductive: response.isProductive, label: response.label || (response.isProductive ? 'ALLOWED' : 'BLOCKED') });
            }
        });
    });
}

function incrementMetric(metric) {
    chrome.storage.local.get(['totalScanned', 'totalAllowed', 'totalBlocked'], (result) => {
        const totals = {
            totalScanned: result.totalScanned || 0,
            totalAllowed: result.totalAllowed || 0,
            totalBlocked: result.totalBlocked || 0
        };

        if (metric === 'scanned') totals.totalScanned += 1;
        if (metric === 'allowed') totals.totalAllowed += 1;
        if (metric === 'blocked') totals.totalBlocked += 1;

        chrome.storage.local.set(totals);
    });
}

function eradicateNode(node) {
    node.style.setProperty('display', 'none', 'important');
    node.style.setProperty('height', '0px', 'important');
    node.style.setProperty('width', '0px', 'important');
    node.style.setProperty('min-width', '0px', 'important');
    node.style.setProperty('max-width', '0px', 'important');
    node.style.setProperty('flex', '0 0 0', 'important'); 
    node.style.setProperty('flex-basis', '0px', 'important');
    node.style.setProperty('padding', '0px', 'important');
    node.style.setProperty('margin', '0px', 'important');
    node.style.setProperty('overflow', 'hidden', 'important');
    node.style.setProperty('opacity', '0', 'important');
    node.style.setProperty('border', 'none', 'important');
}

function getTrueContainer(textEl) {
    let container = textEl.closest(activePlatform.containerSelector);
    if (container) return container;

    if (currentHost.includes('linkedin')) {
        let current = textEl;
        for (let i = 0; i < 7; i++) {
            if (current.parentElement && current.parentElement.tagName !== 'BODY') {
                current = current.parentElement;
            }
        }
        return current;
    }
    
    if (currentHost.includes('youtube')) {
        let current = textEl;
        while (current && current.tagName !== 'BODY') {
            const tag = current.tagName.toLowerCase();
            if (tag.startsWith('ytd-') && tag.includes('renderer')) {
                return current;
            }
            current = current.parentElement;
        }
    }
    
    return textEl.parentElement?.parentElement || textEl;
}

function isProbablyComment(containerNode) {
    if (!containerNode) return false;
    
    // Explicitly target YouTube comments
    if (currentHost.includes('youtube')) {
        if (containerNode.closest('ytd-comment-thread-renderer, ytd-comment-renderer, #comments')) {
            return true;
        }
    }

    const classNames = (containerNode.className || '').toString().toLowerCase();
    if (classNames.includes('reply') || classNames.includes('comment') || classNames.includes('thread') || classNames.includes('replies')) {
        return true;
    }

    const badSelectors = ['.comments', '.comment-item', '.replies', '[data-testid="reply"]', '[data-testid="comment"]', '.feed-shared-update-v2__comments-container'];
    for (const selector of badSelectors) {
        if (containerNode.closest(selector)) return true;
    }

    return false;
}

async function processPost(containerNode, textElement) {
    if (!isExtensionActive) return;

    if (isProbablyComment(containerNode)) {
        return; 
    }

    const postText = textElement.innerText.trim();
    
    if (postText.length < CONFIG.minPostLength) {
        eradicateNode(containerNode);
        incrementMetric('blocked');
        incrementMetric('scanned');
        return;
    }

    incrementMetric('scanned');
    containerNode.style.setProperty('opacity', '0.3', 'important'); 
    containerNode.style.setProperty('transition', 'all 0.3s ease', 'important');

    const result = await analyzeContent(postText);
    const isProductive = result.isProductive;
    const label = result.label;

    const settings = await new Promise((resolve) => {
        chrome.storage.local.get(['focusMode', 'actionType'], (res) => {
            resolve({
                mode: res.focusMode || 'software',
                action: res.actionType || 'hide'
            });
        });
    });

    if (settings.action === 'label') {
        containerNode.style.setProperty('opacity', '1', 'important');
        containerNode.style.setProperty('padding-left', '12px', 'important');
        if (isProductive) {
            incrementMetric('allowed');
            containerNode.style.setProperty('border-left', `${CONFIG.borderWidth} solid ${CONFIG.borderColor}`, 'important');
            containerNode.style.setProperty('background-color', 'rgba(16, 185, 129, 0.07)', 'important');
        } else {
            incrementMetric('blocked');
            containerNode.style.setProperty('border-left', `${CONFIG.borderWidth} solid #ef4444`, 'important');
            containerNode.style.setProperty('background-color', 'rgba(220, 38, 38, 0.08)', 'important');
        }
        containerNode.dataset.signalEngineLabel = label;
        return;
    }

    // Default: HIDE action
    if (isProductive) {
        incrementMetric('allowed');
        containerNode.style.setProperty('opacity', '1', 'important');
        containerNode.style.setProperty('border-left', `${CONFIG.borderWidth} solid ${CONFIG.borderColor}`, 'important');
        containerNode.style.setProperty('padding-left', '12px', 'important');
        containerNode.style.setProperty('background-color', 'rgba(16, 185, 129, 0.03)', 'important');
        containerNode.style.setProperty('pointer-events', 'auto', 'important'); 
    } else {
        incrementMetric('blocked');
        eradicateNode(containerNode); 
    }
}

// RADAR SWEEP with MutationObserver
const observer = new MutationObserver((mutations) => {
    if (!isExtensionActive) return;

    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const textElements = node.querySelectorAll(activePlatform.textSelector);
                textElements.forEach(textEl => {
                    if (!textEl.hasAttribute('data-ai-analyzed')) {
                        textEl.setAttribute('data-ai-analyzed', 'true');
                        const outerContainer = getTrueContainer(textEl);
                        processPost(outerContainer, textEl);
                    }
                });
            }
        });
    });
});

observer.observe(document.body, { childList: true, subtree: true });

const initialTextElements = document.querySelectorAll(activePlatform.textSelector);
initialTextElements.forEach(textEl => {
    if (!textEl.hasAttribute('data-ai-analyzed')) {
        textEl.setAttribute('data-ai-analyzed', 'true');
        const outerContainer = getTrueContainer(textEl);
        processPost(outerContainer, textEl);
    }
});