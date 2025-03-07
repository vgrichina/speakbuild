import { createComponent } from '../utils/componentUtils';
import { widgetStorage } from './widgetStorage';
import { streamComponent } from './componentGenerator';

export async function processWithClaudeStream({
    analysis,
    selectedModel,
    apiKey,
    currentComponentCode,
    abortController,
    onResponseStream
}) {
    console.log('processWithClaudeStream - selectedModel:', selectedModel);
    if (!selectedModel) {
        throw new Error('No model selected');
    }
    if (!apiKey) {
        throw new Error('No API key provided to processWithClaudeStream');
    }

    try {
        for await (const { content, code, done } of streamComponent(
            analysis,
            currentComponentCode,
            selectedModel,
            abortController,
            apiKey
        )) {
            if (abortController?.signal.aborted) {
                throw new Error('Stream aborted');
            }

            if (content) {
                // Pass the content directly, not a function
                onResponseStream(content);
            }
            
            if (done && code) {
                console.log(`processStream: final code received`, { codeLength: code.length });
                const GeneratedComponent = createComponent(code);
                console.log(`processStream: component created successfully`);
                await widgetStorage.store(analysis.widgetUrl, code);
                console.log(`processStream: component stored in widgetStorage`);
                
                const result = {
                    component: GeneratedComponent,
                    code,
                    request: analysis.transcription,
                    params: analysis.params || {},
                    intent: analysis.intent
                };
                console.log(`processStream: returning result with properties:`, Object.keys(result));
                return result;
            }
        }
    } catch (error) {
        if (error.name === 'AbortError' || error.message === 'Stream aborted') {
            throw new Error('Stream aborted');
        }
        throw error;
    }
}
