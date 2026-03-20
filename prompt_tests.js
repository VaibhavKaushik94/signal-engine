// prompt_tests.js
// Run with: node prompt_tests.js
// Requires Ollama local server running at http://localhost:11434

const endpoint = 'http://localhost:11434/api/generate';

const MODE_PROMPTS = {
    software: "You only care about: Software Engineering, AI/ML, Cybersecurity, and coding. BLOCK anything about finance, hardware, motivational quotes, or general business.",
    hardware: "You only care about: Hardware engineering, Raspberry Pi, microcontrollers, and physical system design. BLOCK anything about software-only startups, finance, or general tech news.",
    finance:  "You only care about: Stock markets, equities, precious metals, macroeconomics, and startup funding. BLOCK anything about coding, hardware, or generic business motivation.",
    classify: "You are a content classification assistant. Tag each post as ALLOWED or BLOCKED based on relevance to the user's current preference. Do not remove content; only label it."
};

function promptForMode(mode, customPrompt = '') {
    if (mode === 'custom') {
        return `You are a ruthless but precise binary content filter.\nUSER'S CUSTOM RULE: "${customPrompt}"\n\nEvaluate only the provided main post text. Ignore replies and nested comments.\n- If the text strictly aligns with the user's custom rule, output exactly: ALLOWED\n- If it is off-topic, irrelevant, generic, or loosely related, output exactly: BLOCKED\n- If you cannot decide, choose BLOCKED.\n\nOutput EXACTLY ONE WORD: ALLOWED or BLOCKED. Do not include any additional text.`;
    }

    const modeInstructions = MODE_PROMPTS[mode] || MODE_PROMPTS.software;
    return `You are a ruthless content filter. ${modeInstructions}\nEvaluate the following text.\n- If it strictly matches your allowed topics, output exactly: ALLOWED\n- If it does not match, or is generic, output exactly: BLOCKED\nOutput EXACTLY ONE WORD. No explanations.`;
}

function parseAIResponse(rawResponse) {
    const normalized = (rawResponse || '').toUpperCase().replace(/[^A-Z]/g, ' ').trim();
    const tokens = normalized.split(/\s+/);

    if (tokens.includes('ALLOWED')) return { isProductive: true, label: 'ALLOWED' };
    if (tokens.includes('BLOCKED')) return { isProductive: false, label: 'BLOCKED' };
    if (tokens.includes('KEEP')) return { isProductive: true, label: 'ALLOWED' };
    return { isProductive: false, label: 'BLOCKED' };
}

const samples = [
    {mode: 'software', text: 'How to optimize Python list comprehensions for 10M elements', expected: 'ALLOWED'},
    {mode: 'software', text: 'Latest Tesla quarterly earnings just dropped', expected: 'BLOCKED'},
    {mode: 'finance', text: 'S&P 500 rally amid inflation bets', expected: 'ALLOWED'},
    {mode: 'finance', text: 'Build your own IoT weather station with Arduino', expected: 'BLOCKED'},
    {mode: 'hardware', text: 'Raspberry Pi Pico vs Arduino Nano for robot arms', expected: 'ALLOWED'},
    {mode: 'hardware', text: 'Interview prep for software engineering at Google', expected: 'BLOCKED'},
    {mode: 'custom', custom: 'Only show posts about Google', text: 'Google just announced Pixel 8 features', expected: 'ALLOWED'},
    {mode: 'custom', custom: 'Only show posts about Google', text: 'Amazon Web Services updates pricing', expected: 'BLOCKED'},
];

(async () => {
    console.log('Running prompt quality tests (Ollama required)...\n');

    let passed = 0;

    for (const sample of samples) {
        const systemPrompt = promptForMode(sample.mode, sample.custom || '');
        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'phi3:latest', prompt: `${systemPrompt}\n\nPost text: "${sample.text}"`, stream: false, options: { temperature: 0.0, num_predict: 1 } })
        });

        const json = await resp.json();
        const raw = (json.response || '').trim();
        const parsed = parseAIResponse(raw);

        const isOk = parsed.label === sample.expected;
        if (isOk) passed += 1;

        console.log(`Mode ${sample.mode} | text: ${sample.text}`);
        console.log(` -> raw: ${raw}`);
        console.log(` -> parsed: ${parsed.label} | expected: ${sample.expected} | ${isOk ? 'PASS' : 'FAIL'}\n`);
    }

    console.log(`Result: ${passed}/${samples.length} passed.`);
    process.exit(passed === samples.length ? 0 : 1);
})();