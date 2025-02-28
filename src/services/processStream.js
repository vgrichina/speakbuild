import { createComponent } from '../utils/componentUtils';
import { widgetStorage } from './widgetStorage';
import { streamComponent } from './componentGenerator';

export async function processWithClaudeStream({
    analysis,
    selectedModel,
    currentComponentCode,
    abortController,
    onResponseStream
}) {
    console.log('processWithClaudeStream - selectedModel:', selectedModel);
    if (!selectedModel) {
        throw new Error('No model selected');
    }

    try {
        for await (const { content, code, done } of streamComponent(
            analysis,
            currentComponentCode,
            selectedModel,
            abortController
        )) {
            if (abortController?.signal.aborted) {
                throw new Error('Stream aborted');
            }

            if (content) {
                // Pass the content directly, not a function
                onResponseStream(content);
            }
            
            if (done && code) {
                const GeneratedComponent = createComponent(code);
                await widgetStorage.store(analysis.widgetUrl, code);
                
                return {
                    component: GeneratedComponent,
                    code,
                    request: analysis.transcription,
                    params: analysis.params || {},
                    intent: analysis.intent
                };
            }
        }
    } catch (error) {
        if (error.name === 'AbortError' || error.message === 'Stream aborted') {
            throw new Error('Stream aborted');
        }
        throw error;
    }
}
