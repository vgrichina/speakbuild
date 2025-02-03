import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const analysisPrompt = ({ text, requestHistory }) => {
    return [
        {
            role: 'system',
            content: `You are a widget URL generator. Output JSON only:
{
    "intent": "modify" | "new",
    "widgetUrl": "string",
    "params": {
        // Default values for typed parameters
    }
}

Example flow:

"Create a progress bar" ->
{
    "intent": "new",
    "widgetUrl": "feedback/progress-indicator/basic/dark?with_percentage=yes&params=progress:number,bar_color:color",
    "params": {
        "progress": 0,
        "bar_color": "#3B82F6"
    }
}

"Add milestone markers" ->
{
    "intent": "modify",
    "widgetUrl": "feedback/progress-indicator/basic/dark?with_percentage=yes&with_milestone_markers=yes&params=progress:number,bar_color:color,milestone_positions:number[],milestone_icons:string[]",
    "params": {
        "progress": 0,
        "bar_color": "#3B82F6",
        "milestone_positions": [25, 50, 75],
        "milestone_icons": ["🔵", "🟡", "🟢"]
    }
}

URLs use:
- Base path: category/component/style/theme
- Feature flags: with_feature=value
- Typed parameters: params=name:type
Parameter types: string, number, boolean, color, string[], number[]

Context - Previous requests:
                ${requestHistory.map(req => `- "${req}"`).join('\n')}

                DO NOT include any explanation or additional text.
                ONLY return the JSON object.`
        },
        {
            role: 'user',
            content: text
        }
    ];
};

const analyzeRequest = async (text, controller, history, historyIndex) => {
    const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
    if (!currentApiKey) return null;

    try {
        const requestHistory = getRequestHistory(history, historyIndex);
        const response = await api.completion(
            currentApiKey,
            analysisPrompt({ text, requestHistory }),
            { 
                max_tokens: 200,
                model: 'anthropic/claude-3.5-haiku',
                abortController: controller
            }
        );

        // Handle aborted request
        if (controller?.signal.aborted) {
            console.log('Analysis request aborted');
            const abortError = new Error('Stream aborted');
            abortError.name = 'AbortError';
            throw abortError;
        }

        // Extract just the JSON part from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON object found in response');
        }
        const parsedJson = JSON.parse(jsonMatch[0]);
        console.log(`Analysis << ${JSON.stringify(parsedJson)}`);
        return parsedJson;
    } catch (error) {
        if (error.name === 'AbortError' || error.message === 'Stream aborted') {
            console.log('Analysis aborted');
            throw error; // Re-throw abort errors to be handled by caller
        }
        console.error('Request analysis error:', error);
        throw error;
    }
};

// Helper function moved from main
const getRequestHistory = (history, currentIndex) => {
    if (!Array.isArray(history) || typeof currentIndex !== 'number' || currentIndex < 0) {
        return [];
    }
    return history
        .slice(0, currentIndex + 1)
        .filter(entry => entry && entry.request)
        .map(entry => entry.request);
};

export { analyzeRequest, analysisPrompt, getRequestHistory };
