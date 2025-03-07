const isNode = typeof process !== 'undefined' && process.versions?.node;
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

export const fetchSSE = (url, options) => {
    if (isNode || !isReactNative) {
        return fetch(url, options);
    }

    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        console.log('XHR: Creating SSE request');
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'text';
        xhr.open(options.method || 'GET', url);
        
        Object.entries(options.headers || {}).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
        });
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        let lastProcessedIndex = 0;
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
            const newData = xhr.responseText.slice(lastProcessedIndex);
            if (newData.length > 0) {
                lastProcessedIndex = xhr.responseText.length;
                
                if (resolveRead) {
                    resolveRead({ 
                        value: new TextEncoder().encode(newData), 
                        done: false 
                    });
                    resolveRead = null;
                }
            }
        };

        xhr.onreadystatechange = () => {
            if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
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
                    console.error('SSE request failed:', {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: xhr.responseText,
                        responseHeaders: xhr.getAllResponseHeaders()
                    });
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}\n${xhr.responseText}`));
                }
            }
        };

        xhr.onerror = (error) => {
            console.error('XHR: Error details:', {
                error,
                type: error?.type,
                status: xhr.status,
                statusText: xhr.statusText,
                readyState: xhr.readyState,
                responseType: xhr.responseType,
                responseText: xhr.responseText?.substring(0, 500),
                responseURL: xhr.responseURL,
                timestamp: new Date().toISOString(),
                timeElapsed: Date.now() - startTime
            });
            reject(new Error(`Network error: ${error?.type || 'unknown'}`));
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
