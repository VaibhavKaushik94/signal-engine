export const MODE_PROMPTS = {
    software: "You only care about: Software Engineering, AI/ML, Cybersecurity, and coding. BLOCK anything about finance, hardware, motivational quotes, or general business.",
    hardware: "You only care about: Hardware engineering, Raspberry Pi, microcontrollers, and physical system design. BLOCK anything about software-only startups, finance, or general tech news.",
    finance:  "Focus strictly on: Financial markets, stock analysis, macroeconomics, monetary policy, and venture capital. BLOCK: general business advice, recruiting/hiring, individual career updates, and tech tutorials.",
    classify: "You are a content classification assistant. Tag each post as ALLOWED or BLOCKED based on relevance to the user's current preference. Do not remove content; only label it."
};