import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYSTEM_PROMPT = {
    role: 'system',
    content: `You are an AI assistant for a React Native voice assistant app.
Your role is to help users by creating relevant UI components that match their requests.
First, you analyze the request and generate a widget URL specification.

Output JSON only:
{
    "intent": "modify" | "new",
    "widgetUrl": "string",
    "params": {
        // Default values for typed parameters
    }
}

Example flows:

"What time is it?" ->
{
    "intent": "new",
    "widgetUrl": "display/clock/digital/light?params=format:string,size:number",
    "params": {
        "format": "HH:mm",
        "size": 48
    }
}

"Show me the weather" ->
{
    "intent": "new",
    "widgetUrl": "display/weather/card/light?params=location:string,unit:string",
    "params": {
        "location": "current",
        "unit": "celsius"
    }
}

"Make it show hourly forecast" ->
{
    "intent": "modify",
    "widgetUrl": "display/weather/card/light?with_hourly=yes&params=location:string,unit:string,hours:number",
    "params": {
        "location": "current",
        "unit": "celsius",
        "hours": 24
    }
}

"Start a 5 minute timer" ->
{
    "intent": "new",
    "widgetUrl": "interactive/timer/countdown/dark?with_controls=yes&params=duration:number,size:number",
    "params": {
        "duration": 300,
        "size": 32
    }
}

"Add a shopping list" ->
{
    "intent": "new",
    "widgetUrl": "input/list/editable/light?with_checkboxes=yes&params=title:string,items:string[]",
    "params": {
        "title": "Shopping List",
        "items": []
    }
}

Generated component will receive these params as props:
function Component({ format, size }) {
  // or
function Component(props) { // props.format, props.size

URLs use:
- Base paths: category/type/style/theme
  Categories:
  - display: for showing information (clock, weather, calendar)
  - input: for user data entry (lists, notes, forms)
  - interactive: for user actions (timer, player, calculator)
  - feedback: for system responses (progress, loading, alerts)
  - media: for rich content (images, video, audio)
- Feature flags: with_feature=value
- Typed parameters: params=name:type
Parameter Types:
- Basic Types:
  - string: for text content, labels
  - number: for sizes, counts, percentages
  - boolean: for flags, toggles
  - color: for CSS color values
  - currency: for monetary values
  - date: for ISO date strings
  - time: for 24h format times
  - email: for email addresses
  - url: for web URLs
  - phone: for phone numbers

- Array Types:
  - string[]: for lists of text
  - number[]: for lists of numbers
  - color[]: for lists of colors

Note: All parameters are passed directly as props to the React Native component.
Example values should match the parameter type (e.g., "#FF0000" for color, 42 for number).

DO NOT include any explanation or additional text.
ONLY return the JSON object.`
};

const analysisPrompt = ({ text, requestHistory }) => {
    return [
        SYSTEM_PROMPT,
        {
            role: 'user',
            content: `Previous requests:
${requestHistory.map(req => `- "${req}"`).join('\n')}

Current request: ${text}`
        }
    ];
};

const analyzeRequest = async (text, controller, history, historyIndex) => {
    const currentApiKey = await AsyncStorage.getItem('openrouter_api_key');
    if (!currentApiKey) return null;

    const requestHistory = getRequestHistory(history, historyIndex);
    const response = await api.completion(
        currentApiKey,
        analysisPrompt({ text, requestHistory }),
        { 
            max_tokens: 1000,  // Increased to handle larger JSON responses
            model: 'anthropic/claude-3.5-haiku',
            abortController: controller
        }
    );

    // Extract just the JSON part from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON object found in response');
    }
    const parsedJson = JSON.parse(jsonMatch[0]);
    console.log(`Analysis << ${JSON.stringify(parsedJson)}`);
    return parsedJson;
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
