const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isNode = typeof process !== 'undefined' && process.versions?.node;

// Platform-specific fetch for SSE support
const createSSEFetch = (url, options) => {
    if (isNode || !isReactNative) {
        return fetch(url, options);
    }

    return new Promise((resolve, reject) => {
        console.log('XHR: Creating SSE request');
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'text';
        xhr.open(options.method || 'GET', url);
        
        Object.entries(options.headers || {}).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
        });
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        let buffer = '';
        let resolveRead = null;
        let reading = true;

        const reader = {
            async read() {
                if (!reading) {
                    return { done: true };
                }
                
                if (buffer.length > 0) {
                    const value = new TextEncoder().encode(buffer);
                    buffer = '';
                    return { value, done: false };
                }

                return new Promise(resolve => {
                    resolveRead = resolve;
                });
            },
            releaseLock() {
                reading = false;
                xhr.abort();
                if (resolveRead) {
                    resolveRead({ done: true });
                }
            }
        };

        xhr.onprogress = () => {
            const chunk = xhr.responseText.substr(buffer.length);
            if (chunk.length > 0) {
                console.log('XHR: Received chunk:', chunk.length, 'bytes');
                buffer += chunk;
                if (resolveRead) {
                    const value = new TextEncoder().encode(buffer);
                    buffer = '';
                    resolveRead({ value, done: false });
                    resolveRead = null;
                }
            }
        };

        xhr.onload = () => {
            console.log('XHR: Load complete, status:', xhr.status);
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({
                    ok: true,
                    status: xhr.status,
                    headers: new Headers({
                        'Content-Type': 'text/event-stream',
                        'Transfer-Encoding': 'chunked'
                    }),
                    body: { getReader: () => reader }
                });
            } else {
                reject(new Error(`HTTP ${xhr.status}`));
            }
        };

        xhr.onerror = (error) => {
            console.error('XHR: Error:', error);
            reject(new Error('Network error'));
        };

        if (options.signal) {
            options.signal.addEventListener('abort', () => {
                console.log('XHR: Abort signal received');
                xhr.abort();
            });
        }

        console.log('XHR: Sending request');
        xhr.send(options.body);
    });
};

import { truncateWithEllipsis } from '../utils/stringUtils';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const PROMPT_PREVIEW_LENGTH = 5000;  // Characters to show in logs
const RESPONSE_PREVIEW_LENGTH = 5000;  // Characters to show in logs

async function* streamCompletion(apiKey, messages, { 
    model = 'anthropic/claude-3.5-sonnet', 
    temperature = 0.7, 
    abortController 
} = {}) {
    if (!apiKey) throw new Error('API key required');
    
    let fullResponse = '';
    console.log(`Stream [${model.split('/')[1]}] t=${temperature}`);
    console.log(`>> ${messages.map(m => `${m.role}: ${truncateWithEllipsis(m.content, PROMPT_PREVIEW_LENGTH)}`).join('\n')}`);

    const response = await createSSEFetch(API_URL, {
        method: 'POST',
        signal: abortController?.signal,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'X-Title': 'Voice Assistant Web App',
        },
        body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature
        })
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            
            // Keep the last partial line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim() || line.startsWith(':')) continue;
                
                const event = line.replace(/^data: /, '');
                if (event === '[DONE]') {
                    yield { content: '', fullResponse, done: true };
                    return;
                }

                try {
                    const data = JSON.parse(event);
                    const content = data.choices?.[0]?.delta?.content;
                    if (!content) continue;
                    
                    fullResponse += content;
                    yield { content, fullResponse, done: false };
                } catch (e) {
                    console.warn('Failed to parse SSE event:', e);
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    console.log(`<< ${truncateWithEllipsis(fullResponse, RESPONSE_PREVIEW_LENGTH)}`);
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
