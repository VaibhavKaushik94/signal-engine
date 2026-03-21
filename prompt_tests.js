/**
 * Signal Engine - Comprehensive Prompt Accuracy Harness
 * 
 * This script validates the AI classification logic across all focus modes.
 * Requirements: Ollama running locally at http://localhost:11434 with 'phi3' model.
 */

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const MODEL = 'phi3:latest';

const MODE_PROMPTS = {
    software: "Focus ONLY on: Software Engineering, AI/ML, Cybersecurity, and coding. BLOCK: finance, hardware, hardware components, motivational quotes, and general business news.",
    hardware: "Focus ONLY on: Hardware engineering, Raspberry Pi, microcontrollers, and physical system design. BLOCK: software-only startups, finance, and general tech news.",
    finance:  "Focus strictly on: Financial markets, stock analysis, macroeconomics, monetary policy, and venture capital. BLOCK: general business advice, recruiting/hiring, individual career updates, and tech tutorials.",
    classify: "You are a content classification assistant. Tag each post as ALLOWED or BLOCKED based on relevance to the user's current preference."
};

/** 
 * Data set for testing.
 * Includes diverse samples for each mode including positive, negative, and "noise" cases.
 */
const testSuite = [
    // --- SOFTWARE MODE ---
    { mode: 'software', expected: 'ALLOWED', text: "Implementing a distributed KV store in Go using Raft consensus." },
    { mode: 'software', expected: 'ALLOWED', text: "New React 19 features: Server Components and Actions explained." },
    { mode: 'software', expected: 'ALLOWED', text: "Zero-day vulnerability found in popular NPM package with 1M downloads." },
    { mode: 'software', expected: 'BLOCKED', text: "10 tips to stay motivated and crush your morning routine! #hustle" },
    { mode: 'software', expected: 'BLOCKED', text: "Bitcoin price hits all-time high as ETF inflows surge." },
    
    // --- FINANCE MODE ---
    { mode: 'finance',  expected: 'ALLOWED', text: "Federal Reserve hints at rate cuts following latest CPI data." },
    { mode: 'finance',  expected: 'ALLOWED', text: "Nvidia (NVDA) stock analysis: Why the AI boom is just starting." },
    { mode: 'finance',  expected: 'ALLOWED', text: "Series B funding rounds are slowing down in the SaaS sector." },
    { mode: 'finance',  expected: 'BLOCKED', text: "Check out my new mechanical keyboard build with Gateron Brown switches." },
    { mode: 'finance',  expected: 'BLOCKED', text: "How to fix a dangling pointer in C++." },

    // --- HARDWARE MODE ---
    { mode: 'hardware', expected: 'ALLOWED', text: "Building a low-power weather station using ESP32 and LoRa." },
    { mode: 'hardware', expected: 'ALLOWED', text: "The evolution of RISC-V: Why open instruction sets matter for chips." },
    { mode: 'hardware', expected: 'ALLOWED', text: "FPGA vs ASIC: Which one should you choose for high-speed signal processing?" },
    { mode: 'hardware', expected: 'BLOCKED', text: "The 10 best VS Code extensions for web developers." },
    { mode: 'hardware', expected: 'BLOCKED', text: "Is the 60/40 portfolio dead? A look at modern asset allocation." },

    // --- CUSTOM MODE ---
    { mode: 'custom', custom: "Posts about Apple or iPhones", expected: 'ALLOWED', text: "The iPhone 16 Pro camera sensor is a game changer." },
    { mode: 'custom', custom: "Posts about Apple or iPhones", expected: 'ALLOWED', text: "Apple M4 chips are coming to the iPad Pro line next month." },
    { mode: 'custom', custom: "Posts about Apple or iPhones", expected: 'BLOCKED', text: "Microsoft Surface Pro 11 vs Google Pixel Tablet." },

    // --- EDGE CASES & NOISE ---
    { mode: 'software', expected: 'BLOCKED', text: "Just had the best coffee in Seattle! Highly recommend 'The Daily Grind'." },
    { mode: 'software', expected: 'BLOCKED', text: "Promoted: Save 20% on all insurance policies today!" },
    { mode: 'finance',  expected: 'BLOCKED', text: "Looking for a co-founder for a new social media app for pets." },
    { mode: 'software', expected: 'ALLOWED', text: "Rust is the most loved language for the 8th year in a row." },
    { mode: 'hardware', expected: 'ALLOWED', text: "Soldering techniques for surface mount components (SMD)." },
    { mode: 'finance',  expected: 'ALLOWED', text: "Gold prices hit resistance at $2400 as dollar strengthens." },
    { mode: 'custom', custom: "Cooking and Recipes", expected: 'ALLOWED', text: "How to make the perfect sourdough bread at home." },
    { mode: 'custom', custom: "Cooking and Recipes", expected: 'BLOCKED', text: "The impact of generative AI on the creative arts industry." }
];

function getSystemPrompt(mode, customPrompt = '') {
    const base = mode === 'custom' 
        ? `USER'S CUSTOM RULE: "${customPrompt}". Evaluate if the post STRICTLY and DIRECTLY matches this rule.`
        : MODE_PROMPTS[mode] || MODE_PROMPTS['software'];

    return `You are a ruthless binary content filter. 
1. ${base}
2. Be extremely narrow in your interpretation. If a post is even slightly off-topic, output BLOCKED.
3. Ignore hiring, recruiting, and "thought leadership" posts unless they are 100% technical.
Output EXACTLY ONE WORD: ALLOWED or BLOCKED. No explanations.`;
}

function parseResponse(raw) {
    const clean = (raw || '').toUpperCase().replace(/[^A-Z]/g, ' ').trim();
    if (clean.includes('ALLOWED')) return 'ALLOWED';
    if (clean.includes('BLOCKED')) return 'BLOCKED';
    return 'UNKNOWN';
}

async function runTests() {
    console.log("==================================================");
    console.log("   SIGNAL ENGINE - AI ACCURACY TEST HARNESS      ");
    console.log("==================================================\n");
    console.log(`Model: ${MODEL} | Endpoint: ${OLLAMA_ENDPOINT}\n`);

    // 1. Health check
    try {
        const check = await fetch(OLLAMA_ENDPOINT.replace('/api/generate', '/'));
        if (!check.ok) throw new Error();
    } catch (e) {
        console.error("❌ ERROR: Ollama is unreachable. Make sure 'ollama serve' is running.\n");
        process.exit(1);
    }

    let stats = {
        total: 0,
        passed: 0,
        byMode: {}
    };

    for (const test of testSuite) {
        const sysPrompt = getSystemPrompt(test.mode, test.custom);
        
        try {
            const start = Date.now();
            const resp = await fetch(OLLAMA_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: MODEL,
                    prompt: `${sysPrompt}\n\nPost: "${test.text}"`,
                    stream: false,
                    options: { temperature: 0.0, num_predict: 5 }
                })
            });

            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            const latency = Date.now() - start;
            
            const rawResponse = data.response || "";
            const actual = parseResponse(rawResponse);
            const isCorrect = actual === test.expected;

            // Tracking
            stats.total++;
            if (isCorrect) stats.passed++;
            
            if (!stats.byMode[test.mode]) stats.byMode[test.mode] = { total: 0, passed: 0 };
            stats.byMode[test.mode].total++;
            if (isCorrect) stats.byMode[test.mode].passed++;

            // Log individual result
            const statusIcon = isCorrect ? "✅ PASS" : "❌ FAIL";
            const modeLabel = test.mode === 'custom' ? `custom (${test.custom})` : test.mode;
            console.log(`[${statusIcon}] [${modeLabel.padEnd(15)}] [${latency}ms]`);
            console.log(`   Text: "${test.text.substring(0, 60)}${test.text.length > 60 ? '...' : ''}"`);
            if (!isCorrect) {
                console.log(`   Expected: ${test.expected} | Got: ${actual} (Raw: "${rawResponse.trim()}")`);
            }
            console.log("");

        } catch (err) {
            console.error(`❌ Error during test: ${err.message}`);
        }
    }

    // FINAL SUMMARY
    console.log("==================================================");
    console.log("                 ACCURACY SUMMARY                 ");
    console.log("==================================================");
    const overallAccuracy = ((stats.passed / stats.total) * 100).toFixed(1);
    console.log(`OVERALL ACCURACY: ${overallAccuracy}% (${stats.passed}/${stats.total})\n`);

    console.log("BY CATEGORY:");
    for (const mode in stats.byMode) {
        const m = stats.byMode[mode];
        const acc = ((m.passed / m.total) * 100).toFixed(1);
        console.log(` - ${mode.padEnd(10)}: ${acc}% (${m.passed}/${m.total})`);
    }
    console.log("==================================================\n");

    if (overallAccuracy < 80) {
        console.warn("⚠️ WARNING: Overall accuracy is below 80%. Consider refining system prompts.");
    } else {
        console.log("🚀 Prompt quality looks solid for release!");
    }
}

runTests();
