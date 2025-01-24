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

async function* streamCompletion(apiKey, messages, { model = 'anthropic/claude-3.5-sonnet', temperature = 0.7, abortController } = {}) {
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
            // Handle abort controller
            if (abortController) {
                abortController.signal.addEventListener('abort', () => {
                    eventSource.close();
                    stop(new Error('Stream aborted'));
                });
            }

            eventSource.addEventListener('open', () => {});

            eventSource.addEventListener('message', (event) => {
                push(event);
            });

            eventSource.addEventListener('error', (error) => {
                console.error('EventSource error:', error);
                stop(error);
            });

            // Return cleanup function
            return () => {
                eventSource.close();
            };
        });

        // Process events as they arrive
        for await (const event of events) {
            if (event.data === '[DONE]') {
                yield { content: '', fullResponse, done: true };
                break;
            }

            try {
                // Early exit if aborted
                if (abortController?.signal.aborted) break;
                
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
}

async function completion(apiKey, messages, { model = 'anthropic/claude-3.5-haiku', temperature = 0.1, max_tokens, abortController } = {}) {
    const response = await fetch(API_URL, {
        signal: abortController?.signal,
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

    if (!response.ok) {
        const data = await response.json();
        console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            data: JSON.stringify(data, null, 2)
        });
        throw new Error(`API error ${response.status}: ${JSON.stringify(data)}`);
    }

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
    
    if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid API Response Structure:', {
            hasChoices: Boolean(data.choices),
            firstChoice: data.choices?.[0],
            message: data.choices?.[0]?.message,
            content: data.choices?.[0]?.message?.content
        });
        throw new Error(`Invalid API response: ${JSON.stringify(data)}`);
    }
    
    return data.choices[0].message.content;
}

export const api = {
    streamCompletion,
    completion
};
