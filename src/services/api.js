import EventSource from 'react-native-sse';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function* streamCompletion(apiKey, messages, { model = 'anthropic/claude-3.5-sonnet', temperature = 0.7 } = {}) {
    const eventSource = new EventSource(API_URL, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'X-Title': 'Voice Assistant Web App',
        },
        method: 'POST',
        body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature
        })
    });

    let fullResponse = '';

    try {
        while (true) {
            const event = await new Promise((resolve, reject) => {
                eventSource.onmessage = resolve;
                eventSource.onerror = reject;
            });

            if (event.data === '[DONE]') {
                yield { content: '', fullResponse, done: true };
                break;
            }

            try {
                const data = JSON.parse(event.data);
                const content = data.choices?.[0]?.delta?.content;
                
                if (content) {
                    fullResponse += content;
                    yield { content, fullResponse, done: false };
                }
            } catch (e) {
                console.error('Error parsing SSE message:', e);
                throw new Error(`Failed to parse response: ${e.message}`);
            }
        }
    } finally {
        eventSource.close();
    }

    return { content: '', fullResponse, done: true };
}

async function completion(apiKey, messages, { model = 'anthropic/claude-3.5-haiku', temperature = 0.1, max_tokens } = {}) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Voice Assistant Web App'
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            ...(max_tokens && { max_tokens })
        })
    });

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid API response');
    }
    
    return data.choices[0].message.content;
}

export const api = {
    streamCompletion,
    completion
};
