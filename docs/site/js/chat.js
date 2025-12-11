document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('ai-chat-container');
    const chatOutput = document.getElementById('ai-chat-output');
    const chatInput = document.getElementById('ai-chat-input');
    const sendButton = document.getElementById('ai-chat-send');
    const loadingIndicator = document.getElementById('ai-chat-loading');

    let chatHistory = [];

    // Helper to add message to UI
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;

        // Basic styling for messages
        messageDiv.style.padding = '8px 12px';
        messageDiv.style.margin = '5px 0';
        messageDiv.style.borderRadius = '8px';
        messageDiv.style.maxWidth = '80%';
        messageDiv.style.wordWrap = 'break-word';
        messageDiv.style.fontSize = '15px';
        messageDiv.style.lineHeight = '1.5';

        if (sender === 'user') {
            messageDiv.style.background = '#007bff';
            messageDiv.style.color = 'white';
            messageDiv.style.alignSelf = 'flex-end';
            messageDiv.style.marginLeft = 'auto'; // Align right
            messageDiv.textContent = text;
        } else {
            messageDiv.style.background = '#444';
            messageDiv.style.color = '#eee';
            messageDiv.style.alignSelf = 'flex-start';
            messageDiv.style.marginRight = 'auto'; // Align left
            // Parse Markdown for AI messages
            messageDiv.innerHTML = marked.parse(text);
        }

        chatOutput.appendChild(messageDiv);

        // Scroll behavior
        if (sender === 'user') {
            // content will grow, so we stay at bottom
            chatOutput.scrollTop = chatOutput.scrollHeight;
        } else {
            // For AI, scroll to the start of this new message
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function getTerminalContent() {
        if (!window.term) return '';
        const buffer = window.term.buffer.active;
        let output = [];
        for (let i = 0; i < buffer.length; i++) {
            const line = buffer.getLine(i);
            if (line) {
                const lineText = line.translateToString(true);
                if (lineText) output.push(lineText);
            }
        }
        return output.join('\n');
    }

    async function sendToGemini(prompt) {
        const apiKey = typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_KEY : '';
        if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
            addMessage("Error: Gemini API Key is missing. Please set it in docs/site/js/config.js", 'ai');
            return;
        }

        // Prepare the new user content with fresh terminal context
        const terminalHistory = getTerminalContent();
        const contextAndPrompt = `CONTEXT:
The user is interacting with a web-based terminal.
Recent terminal history:
\`\`\`
${terminalHistory}
\`\`\`

INSTRUCTIONS:
1. Answer the user's question based on the terminal context above if relevant.
2. If the question correlates to the following lessons, list them in resources:
   - Unit 1: Basics of cybersecurity and Linux setup
3. Be helpful, concise, and educational.
4. Format your response with Markdown (bold, lists, code blocks).

USER QUESTION:
${prompt}`;

        // Add to local history object for the API call (but not UI again)
        const currentTurn = {
            role: "user",
            parts: [{ text: contextAndPrompt }]
        };

        // Construct full payload: Past history + Current turn
        // Note: We might want to limit history length to avoid token limits, but for now we send all.
        const contents = [...chatHistory, currentTurn];

        try {
            loadingIndicator.style.display = 'block';

            // Use gemini-1.5-flash as it is standard. User had typos previously.
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: contents })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API Request failed: ${response.status} - ${response.statusText} \nDetails: ${errorBody}`);
            }

            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;

            addMessage(aiText, 'ai');

            // Update history with the successful turn
            chatHistory.push(currentTurn); // User's turn
            chatHistory.push({ // Model's turn
                role: "model",
                parts: [{ text: aiText }]
            });

        } catch (error) {
            console.error(error);
            addMessage(`Error: ${error.message}`, 'ai');
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    function handleSend() {
        const text = chatInput.value.trim();
        if (text) {
            // Only add the raw text to UI, not the huge context wrapper
            addMessage(text, 'user');
            chatInput.value = '';
            sendToGemini(text);
        }
    }

    sendButton.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });

    // Initial greeting
    addMessage("### Hello! \nI'm your **Cybersecurity AI Assistant**.\n\nAsk me anything about cybersecurity or this terminal!", 'ai');
});
