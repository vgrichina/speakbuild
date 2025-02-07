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
    "widgetUrl": "display/clock/digital/light?params=format:caption,size:integer",
    "params": {
        "format": "HH:mm",
        "size": 48
    }
}

// Converting "a few minutes" to 180 seconds (3 minutes)
"Start a timer for a few minutes" ->
{
    "intent": "new",
    "widgetUrl": "interactive/timer/countdown/light?with_controls=yes&params=duration:integer,size:integer,showControls:boolean",
    "params": {
        "duration": 180,
        "size": 48,
        "showControls": true
    }
}

// Using ISO date format for tomorrow, 5pm
"Remind me to call Mom tomorrow at 5pm" ->
{
    "intent": "new",
    "widgetUrl": "input/reminder/card/light?with_alarm=yes&params=title:caption,date:string,time:string,content:sentence",
    "params": {
        "title": "Call Mom",
        "date": "2024-02-06",
        "time": "17:00",
        "content": "Remember to call Mom"
    }
}

// Using ISO date for 7-day forecast starting tomorrow
"Show me the weather for next week" ->
{
    "intent": "new",
    "widgetUrl": "display/weather/forecast/light?with_daily=yes&params=location:caption,unit:caption,date:string,days:integer",
    "params": {
        "location": "current",
        "unit": "celsius",
        "date": "2024-02-06",
        "days": 7
    }
}

"Make the text a bit bigger" ->
{
    "intent": "modify",
    "widgetUrl": "display/text/card/light?params=content:sentence,size:integer",
    "params": {
        "content": "Hello World",
        "size": 52  // Previous size 48 + 10%
    }
}

"Add milk and eggs to my shopping list" ->
{
    "intent": "modify",
    "widgetUrl": "input/list/editable/light?with_checkboxes=yes&params=title:title,items:caption[],enableChecks:boolean",
    "params": {
        "title": "Shopping List",
        "items": ["Milk", "Eggs"],  // Capitalized
        "enableChecks": true
    }
}

"Show me the weather for next week" ->
{
    "intent": "new",
    "widgetUrl": "display/weather/forecast/light?with_daily=yes&params=location:caption,unit:caption,date:string,days:integer",
    "params": {
        "location": "current",
        "unit": "celsius",
        "date": "2024-02-06",
        "days": 7
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
- Generation features: with_feature=yes
  These flags indicate widget capabilities at generation time:
  - with_controls: add play/pause/reset controls
  - with_dates: add date/time handling
  - with_progress: add progress tracking
  - with_checkboxes: add checkbox toggles
  - with_hourly: add hourly breakdown
- Runtime parameters: params=name:type
  These are values passed to the component at runtime
Parameter Types and Naming:
- Text Types:
  - caption:string: short labels (1-3 words)
    Examples: "Shopping List", "Quick Note", "Timer"
  - title:string: headings with context (3-7 words)
    Examples: "Daily Step Counter", "Today's Shopping List"
  - sentence:string: single complete thought
    Examples: "Remember to call mom tomorrow", "Buy groceries at 5pm"
  - paragraph:string: multiple sentences
    Examples: "Meeting notes from today's standup. Discussed project timeline."
  - story:string: long-form content
    Examples: detailed notes, blog posts, articles
  - url:string: web URLs
    Examples: imageUrl:"https://example.com/image.jpg"

- Number Types:
  Base Types:
  - integer: whole numbers
    Examples: count:42, index:1
  - decimal: numbers with fractional parts
    Examples: price:9.99, progress:75.5

  Semantic Types (all extend integer or decimal):
  - size:integer: UI element dimensions (16-64)
    Examples: fontSize:16, buttonSize:48
  - duration:integer: time in seconds
    Examples: duration:300 (5 minutes)
  - count:integer: quantity of items (0+)
    Examples: limit:10, maxItems:100
  - percentage:decimal: ratio from 0 to 100
    Examples: progress:75.5, opacity:50
  - interval:integer: time between events in ms
    Examples: interval:1000, refreshRate:500
  - goal:integer: target value for tracking
    Examples: stepGoal:10000, calorieGoal:2000
  - currency:decimal: monetary values
    Examples: price:9.99, balance:100.00

- Boolean Types:
  - boolean: for feature flags and toggles
    Examples: showControls:true, recordTimestamp:true, enableHistory:true, allowEditing:true

- Array Types:
  - caption[]: for lists of short items
    Examples: items:["Milk", "Eggs"]
  - sentence[]: for lists of tasks/notes
    Examples: items:["Call mom at 5pm", "Buy groceries"]
  - object[]: for structured data
    Examples: items:[{text:"Buy milk", done:false}]

Note: All parameters are passed directly as props to the React Native component.
Parameters should use the most specific type available.

DO NOT include any explanation or additional text.
ONLY return the JSON object.`
};

const analysisPrompt = ({ text, requestHistory, currentParams }) => {
    return [
        SYSTEM_PROMPT,
        {
            role: 'user',
            content: `Previous requests:
${requestHistory.map(req => `- "${req}"`).join('\n')}

Previous component parameters:
${currentParams ? JSON.stringify(currentParams, null, 2) : 'No current component'}

Current request: ${text}`
        }
    ];
};

const analyzeRequest = async (text, controller, history, historyIndex, currentParams) => {
    const currentApiKey = process.env.OPENROUTER_API_KEY || await AsyncStorage.getItem('openrouter_api_key');
    if (!currentApiKey) throw new Error('API key required');

    const requestHistory = getRequestHistory(history, historyIndex);
    const response = await api.completion(
        currentApiKey,
        analysisPrompt({ text, requestHistory, currentParams }),
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
