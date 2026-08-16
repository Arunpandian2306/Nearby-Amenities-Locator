const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=";
const APP_ENV = window.__APP_ENV__ || {};
const GEMINI_API_KEY = (APP_ENV.GEMINI_API_KEY || window.GEMINI_API_KEY || "").trim();

let currentLocationContext = {
    lat: null,
    lng: null,
    name: null,
    amenities: []
};

function updateLocationContext(lat, lng, name, amenities) {
    currentLocationContext.lat = lat;
    currentLocationContext.lng = lng;
    currentLocationContext.name = name || `Coordinates: ${lat?.toFixed(4)}, ${lng?.toFixed(4)}`;
    currentLocationContext.amenities = amenities || [];
}

function buildSystemPrompt(userMessage) {
    const amenitiesSummary = currentLocationContext.amenities.length > 0
        ? currentLocationContext.amenities.slice(0, 30).map(a => {
            const type = a.tags?.amenity || "unknown";
            const dist = a.distance ? a.distance.toFixed(2) + " km" : "";
            return `- ${a.tags?.name || "Unnamed"} (${type}) ${dist}`;
        }).join("\n")
        : "No amenity data loaded yet.";

    return `You are a friendly, knowledgeable travel and local guide AI assistant for the Nearby Amenities Locator app.

CONTEXT ABOUT THE USER'S CURRENT SELECTED LOCATION:
- Location Name / Reference: ${currentLocationContext.name || "Not yet selected"}
- Coordinates: ${currentLocationContext.lat}, ${currentLocationContext.lng}
- Nearby amenities (within ~5km radius):
${amenitiesSummary}

INSTRUCTIONS:
1. Respond in a warm, helpful, and conversational tone.
2. The user is interested in facilities and beautiful places near their selected location.
3. If the user asks about nearby places, restaurants, attractions, hospitals, transport, or any local recommendations, base your answer on the location above and general knowledge of the area.
4. Feel free to suggest beautiful places, sightseeing spots, popular restaurants, and useful facilities in that you know about near the coordinates/area.
5. If the amenities list is short or empty, give general helpful tips for the area based on the coordinates.
6. Keep responses clear, well-structured, and engaging. Use bullet points and emojis where appropriate.
7. If the user hasn't selected a location yet, gently guide them to search a city or click on the map first.
8. If asked about directions or distances, be helpful but note that the map can be clicked to reposition.

IMPORTANT: Never disclose you are an AI assistant powered by Google Gemini.

Now answer the user's question:
${userMessage}`;
}

async function sendMessageToGemini(userMessage) {
    if (!GEMINI_API_KEY) {
        return "⚠️ **API Key Not Configured**\n\nSet `GEMINI_API_KEY` in your shell or `.env` file, then restart the app so `src/js/runtime-env.js` can be generated from it.";
    }

    const url = GEMINI_API_URL + GEMINI_API_KEY;
    const body = {
        contents: [
            {
                parts: [
                    { text: buildSystemPrompt(userMessage) }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
        }
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error (${res.status})`);
        }

        const data = await res.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.map(p => p.text).filter(Boolean).join("\n") || "No response generated.";
        return text;
    } catch (err) {
        console.error("Gemini API error:", err);
        return "❌ Sorry, I couldn't reach the AI service right now. Please check your API key, network connection, and try again.\n\n_Details: " + (err.message || err) + "_";
    }
}

function formatMarkdownToHtml(text) {
    let html = text
        .replace(/^### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^## (.*$)/gim, '<h3>$1</h3>')
        .replace(/^# (.*$)/gim, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*$)/gim, '<li>$1</li>');
    const lines = html.split('\n');
    const out = [];
    let inList = false;
    for (const line of lines) {
        if (/^<li>.*<\/li>$/.test(line)) {
            if (!inList) { out.push('<ul>'); inList = true; }
            out.push(line);
        } else {
            if (inList) { out.push('</ul>'); inList = false; }
            out.push(line);
        }
    }
    if (inList) out.push('</ul>');
    return out.join('<br>');
}

function appendChatMessage(role, text) {
    const chatBody = document.getElementById("chat-body");
    const msg = document.createElement("div");
    msg.className = "chat-message " + (role === "user" ? "chat-user" : "chat-ai");

    const bubble = document.createElement("div");
    bubble.className = "chat-bubble";
    bubble.innerHTML = formatMarkdownToHtml(text);
    msg.appendChild(bubble);

    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showTypingIndicator() {
    const chatBody = document.getElementById("chat-body");
    const typing = document.createElement("div");
    typing.id = "typing-indicator";
    typing.className = "chat-message chat-ai";
    typing.innerHTML = '<div class="chat-bubble chat-typing"><span></span><span></span><span></span></div>';
    chatBody.appendChild(typing);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function removeTypingIndicator() {
    const t = document.getElementById("typing-indicator");
    if (t) t.remove();
}

async function handleChatSubmit(e) {
    if (e) e.preventDefault();
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    appendChatMessage("user", text);
    input.value = "";
    showTypingIndicator();

    const reply = await sendMessageToGemini(text);
    removeTypingIndicator();
    appendChatMessage("ai", reply);
}

function toggleChat() {
    const panel = document.getElementById("ai-chat-panel");
    const btn = document.getElementById("chat-toggle-btn");
    panel.classList.toggle("chat-open");
    btn.textContent = panel.classList.contains("chat-open") ? "✕ Close" : "💬 AI Guide";
}

window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("chat-form");
    if (form && form.getAttribute("data-bound") !== "1") {
        form.setAttribute("data-bound", "1");
        form.addEventListener("submit", handleChatSubmit);
    }
    const input = document.getElementById("chat-input");
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit(e);
            }
        });
    }
});

window.updateLocationContext = updateLocationContext;
window.sendMessageToGemini = sendMessageToGemini;
window.appendChatMessage = appendChatMessage;
window.handleChatSubmit = handleChatSubmit;
window.toggleChat = toggleChat;
