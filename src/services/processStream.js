import { createComponent } from '../utils/componentUtils';
import { widgetStorage } from './widgetStorage';
import { createComponentGeneration } from './componentGeneration';

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
        // Create a promise to handle the generation completion
        return new Promise((resolve, reject) => {
            let responseText = '';
            
            // Create component generation with callbacks
            const generation = createComponentGeneration(analysis, {
                onProgress: (content) => {
                    responseText += content;
                    onResponseStream(content);
                },
                onComplete: (result) => {
                    if (result?.code) {
                        console.log(`processStream: final code received`, { codeLength: result.code.length });
                        const GeneratedComponent = createComponent(result.code);
                        console.log(`processStream: component created successfully`);
                        
                        // Store in widgetStorage
                        widgetStorage.store(analysis.widgetUrl, result.code)
                            .then(() => {
                                console.log(`processStream: component stored in widgetStorage`);
                                
                                // Return same format as before for backward compatibility
                                resolve({
                                    component: GeneratedComponent,
                                    code: result.code,
                                    request: analysis.transcription,
                                    params: analysis.params || {},
                                    intent: analysis.intent
                                });
                            })
                            .catch(err => {
                                console.error('Error storing component:', err);
                                // Still resolve with the component even if storage fails
                                resolve({
                                    component: GeneratedComponent,
                                    code: result.code,
                                    request: analysis.transcription,
                                    params: analysis.params || {},
                                    intent: analysis.intent
                                });
                            });
                    } else {
                        reject(new Error('No code was generated'));
                    }
                },
                onError: (error) => {
                    reject(error);
                },
                currentComponentCode,
                selectedModel,
                apiKey
            });
            
            // Attach the abort controller
            if (abortController) {
                abortController.signal.addEventListener('abort', () => {
                    generation.abort();
                    reject(new Error('Stream aborted'));
                });
            }
            
            // Start the generation
            generation.start();
        });
    } catch (error) {
        if (error.name === 'AbortError' || error.message === 'Stream aborted') {
            throw new Error('Stream aborted');
        }
        throw error;
    }
}
