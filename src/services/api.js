// Helper class to convert event listeners to async iterator
class RNEventSource {
    constructor(url, options = {}) {
        this.url = url;
        this.options = options;
        this.xhr = null;
        this.eventListeners = {
            message: [],
            error: []
        };
        this.isClosing = false;
        
        this.connect();
    }

    connect() {
        this.xhr = new XMLHttpRequest();
        this.xhr.open('POST', this.url);
        
        Object.entries(this.options.headers || {}).forEach(([key, value]) => {
            this.xhr.setRequestHeader(key, value);
        });
        
        let buffer = '';
        
        this.xhr.onprogress = () => {
            if (this.isClosing) return;
            
            const chunk = this.xhr.responseText.substr(buffer.length);
            buffer = this.xhr.responseText;

            const lines = chunk.split('\n');
            lines.forEach(line => {
                if (!line.trim() || line.startsWith(':')) return;
                
                const event = line.replace(/^data: /, '');
                
                if (event === '[DONE]') {
                    this.isClosing = true;
                    this.eventListeners.message.forEach(listener => {
                        listener({ data: '[DONE]' });
                    });
                    this.cleanupXHR();
                    return;
                }

                try {
                    if (!this.isClosing) {
                        this.eventListeners.message.forEach(listener => {
                            listener({ data: event });
                        });
                    }
                } catch (e) {
                    console.warn('Failed to parse SSE event:', e);
                }
            });
        };

        this.xhr.onload = () => {
            if (!this.isClosing) {
                if (this.xhr.status >= 200 && this.xhr.status < 300) {
                    this.eventListeners.message.forEach(listener => {
                        listener({ data: '[DONE]' });
                    });
                } else {
                    this.eventListeners.error.forEach(listener => {
                        listener(new Error(`HTTP error! status: ${this.xhr.status}`));
                    });
                }
                this.cleanupXHR();
            }
        };

        this.xhr.onerror = (error) => {
            if (!this.isClosing) {
                this.eventListeners.error.forEach(listener => listener(error));
                this.cleanupXHR();
            }
        };

        this.xhr.onabort = () => {
            if (!this.isClosing) {
                this.eventListeners.error.forEach(listener => {
                    listener(new Error('Stream aborted'));
                });
                this.cleanupXHR();
            }
        };

        this.xhr.send(this.options.body);
    }

    addEventListener(type, callback) {
        if (this.eventListeners[type]) {
            this.eventListeners[type].push(callback);
        }
    }

    removeEventListener(type, callback) {
        if (this.eventListeners[type]) {
            this.eventListeners[type] = this.eventListeners[type].filter(cb => cb !== callback);
        }
    }

    cleanupXHR() {
        if (this.xhr) {
            this.xhr = null;
        }
    }

    close() {
        this.isClosing = true;
        if (this.xhr) {
            this.xhr.abort();
            this.cleanupXHR();
        }
    }
}

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

import { truncateWithEllipsis } from '../utils/stringUtils';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PROMPT_PREVIEW_LENGTH = 5000;  // Characters to show in logs
const RESPONSE_PREVIEW_LENGTH = 5000;  // Characters to show in logs

async function* streamCompletion(apiKey, messages, { model = 'anthropic/claude-3.5-sonnet', temperature = 0.7, abortController } = {}) {
    let fullResponse = '';
    
    console.log(`Stream [${model.split('/')[1]}] t=${temperature}`);
    console.log(`>> ${messages.map(m => `${m.role}: ${truncateWithEllipsis(m.content, PROMPT_PREVIEW_LENGTH)}`).join('\n')}`);

    const eventSource = new RNEventSource(API_URL, {
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

            // Early exit if aborted
            if (abortController?.signal.aborted) break;
            
            const data = JSON.parse(event.data);
            const content = data.choices?.[0]?.delta?.content;
            
            if (content) {
                fullResponse += content;
                yield { content, fullResponse, done: false };
            }
        }
        console.log(`<< ${truncateWithEllipsis(fullResponse, RESPONSE_PREVIEW_LENGTH)}`);
    } finally {
        eventSource.close();
    }
}

async function completion(apiKey, messages, { model = 'anthropic/claude-3.5-haiku', temperature = 0.1, max_tokens, abortController } = {}) {
    console.log(`API [${model.split('/')[1]}] t=${temperature}${max_tokens ? ` max=${max_tokens}` : ''}`);
    console.log(`>> ${messages.map(m => `${m.role}: ${m.content.slice(0, PROMPT_PREVIEW_LENGTH)}...`).join('\n')}`);

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
        console.error(`API Error [${model.split('/')[1]}]:`, `${response.status} - ${response.statusText}`);
        throw new Error(`API error ${response.status}: ${JSON.stringify(data)}`);
    }

    const data = await response.json();
    console.log(`<< ${truncateWithEllipsis(data.choices[0].message.content, RESPONSE_PREVIEW_LENGTH)}`);
    
    if (!data.choices?.[0]?.message?.content) {
        throw new Error(`Invalid API response: ${JSON.stringify(data)}`);
    }
    
    return data.choices[0].message.content;
}

export const api = {
    streamCompletion,
    completion
};
