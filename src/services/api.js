import EventSource from 'react-native-sse';

// Helper class to convert event listeners to async iterator
class AsyncIterator {
    constructor(setup) {
        this.setup = setup;
    }

    async *[Symbol.asyncIterator]() {
        const queue = [];
        let error = null;
        let done = false;
        let resolve = null;

        const push = (value) => {
            queue.push(value);
            if (resolve) resolve();
        };

        const stop = (err) => {
            error = err;
            done = true;
            if (resolve) resolve();
        };

        const cleanup = this.setup(push, stop);

        try {
            while (!done || queue.length > 0) {
                if (queue.length === 0) {
                    await new Promise(r => resolve = r);
                    resolve = null;
                }
                if (error) throw error;
                if (queue.length > 0) {
                    yield queue.shift();
                }
            }
        } finally {
            cleanup?.();
        }
    }
}

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function* streamCompletion(apiKey, messages, { model = 'anthropic/claude-3.5-sonnet', temperature = 0.7 } = {}) {
    console.log('Starting streamCompletion');
    let fullResponse = '';
    
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

    try {
        // Use an async iterator to handle EventSource events
        const events = new AsyncIterator((push, stop) => {
            console.log('Setting up event listeners');
            
            eventSource.addEventListener('open', () => {
                console.log('EventSource connection opened');
            });

            eventSource.addEventListener('message', (event) => {
                console.log('Received event:', event.data.slice(0, 100) + '...');
                push(event);
            });

            eventSource.addEventListener('error', (error) => {
                console.error('EventSource error:', error);
                stop(error);
            });

            // Return cleanup function
            return () => {
                console.log('Cleaning up event listeners');
                eventSource.close();
            };
        });

        // Process events as they arrive
        for await (const event of events) {
            if (event.data === '[DONE]') {
                console.log('Received [DONE] event');
                yield { content: '', fullResponse, done: true };
                break;
            }

            try {
                const data = JSON.parse(event.data);
                const content = data.choices?.[0]?.delta?.content;
                
                if (content) {
                    console.log('Processing content:', content.slice(0, 50) + '...');
                    fullResponse += content;
                    yield { content, fullResponse, done: false };
                }
            } catch (e) {
                console.error('Error parsing SSE message:', e);
                throw new Error(`Failed to parse response: ${e.message}`);
            }
        }
    } finally {
        console.log('Closing EventSource connection');
        eventSource.close();
    }
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
