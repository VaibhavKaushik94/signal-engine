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
        // Added every known data attribute LinkedIn uses for outer wrappers
        containerSelector: '.feed-shared-update-v2, .occludable-update, [data-urn], [data-id], .update-components-update-v2, .profile-creator-shared-feed-update__container',
        textSelector: '[data-testid="expandable-text-box"], .update-components-text'
    },
    // ✨ NEW: YouTube Integration ✨
    youtube: {
        // Targets the main grid cards, search results, and sidebar recommendations
        containerSelector: 'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer',
        // Highly targeted to ONLY grab the actual video title, ignoring views and channel names
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
                resolve(true); 
            } else {
                resolve(response.isProductive);
            }
        });
    });
}

function eradicateNode(node) {
    node.style.setProperty('display', 'none', 'important');
    node.style.setProperty('height', '0px', 'important');
    // ✨ NEW: Crush the width and flexbox properties so the grid collapses ✨
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

// ✨ NEW: The Smart DOM Climber ✨
function getTrueContainer(textEl) {
    // 1. Try the standard targeted approach
    let container = textEl.closest(activePlatform.containerSelector);
    if (container) return container;

    // 2. LinkedIn Fallback
    if (currentHost.includes('linkedin')) {
        let current = textEl;
        for (let i = 0; i < 7; i++) {
            if (current.parentElement && current.parentElement.tagName !== 'BODY') {
                current = current.parentElement;
            }
        }
        return current;
    }
    
    // 3. ✨ NEW: YouTube Fallback ✨
    // Keep climbing until we hit a custom YouTube "renderer" tag
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
    
    // X / Default Fallback
    return textEl.parentElement?.parentElement || textEl;
}

async function processPost(containerNode, textElement) {
    if (!isExtensionActive) return;
    
    const postText = textElement.innerText.trim();
    
    if (postText.length < CONFIG.minPostLength) {
        eradicateNode(containerNode);
        return;
    }

    containerNode.style.setProperty('opacity', '0.3', 'important'); 
    containerNode.style.setProperty('transition', 'all 0.3s ease', 'important');

    const isProductive = await analyzeContent(postText);

    if (isProductive) {
        // Mark as KEEP (Outer Card)
        containerNode.style.setProperty('opacity', '1', 'important');
        containerNode.style.setProperty('border-left', `${CONFIG.borderWidth} solid ${CONFIG.borderColor}`, 'important');
        containerNode.style.setProperty('padding-left', '12px', 'important');
        containerNode.style.setProperty('background-color', 'rgba(16, 185, 129, 0.03)', 'important');
        containerNode.style.setProperty('pointer-events', 'auto', 'important'); 
    } else {
        // TRASH (Outer Card completely vanishes)
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

// Initial scan
const initialTextElements = document.querySelectorAll(activePlatform.textSelector);
initialTextElements.forEach(textEl => {
    if (!textEl.hasAttribute('data-ai-analyzed')) {
        textEl.setAttribute('data-ai-analyzed', 'true');
        const outerContainer = getTrueContainer(textEl);
        processPost(outerContainer, textEl);
    }
});

console.log(`🚀 Signal Engine Radar Sweeping: ${currentHost}`);