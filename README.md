# Voice-Driven React Native Component Generator

An AI-powered voice assistant that generates and modifies React Native components through natural language commands. Built with Expo and OpenRouter API (Claude).

## Features

- 🎙️ Voice commands to generate UI components
- ⚡ Real-time component generation and preview
- 🔄 Component modification through natural language
- 📱 Cross-platform (iOS/Android) support
- 💾 Persistent component storage
- 🧪 Debug generation interface for testing

## Installation

### Prerequisites

- Node.js
- Yarn or npm
- Expo CLI
- Bun (for evaluation scripts)
- iOS/Android development environment

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/voice-assistant.git
cd voice-assistant
```

2. Install dependencies:
```bash
yarn install
```

3. Configure environment:
- Set up OpenRouter API key in app settings
- Configure required permissions:
  - Microphone access
  - Speech recognition
  - Internet access

### Running the App

This app requires a native build due to dependencies on native modules (speech recognition, etc). It cannot run in Expo Go.

```bash
# Build and run on iOS simulator/device
yarn ios

# Build and run on Android emulator/device
yarn android

# Clean build cache if needed
yarn clean
```

Note: Web platform support is limited due to native module dependencies.

## How It Works

### 1. User Interaction Flow

The system follows this interaction flow:

1. **Voice/Text Input**: User provides input via voice button or keyboard
2. **Transcription**: Audio is converted to text (for voice input)
3. **Analysis**: Input is analyzed to determine intent and widget specification
4. **Component Generation**: A React Native component is generated based on the specification
5. **Rendering**: The component is rendered and displayed to the user
6. **History Management**: The interaction is saved in conversation history

### 2. Widget Specification System

The system uses a structured URL-based widget specification system:

```
category/type/style/theme?with_feature=yes&params=name:type
```

Categories:
- `display`: Information display (clock, weather, calendar)
- `input`: User data entry (lists, notes, forms)
- `interactive`: User actions (timer, player, calculator)
- `feedback`: System responses (progress, loading, alerts)
- `media`: Rich content (images, video, audio)
- `content`: for educational/informational content (articles, explanations, facts)

Features flags (with_*):
- `with_controls`: Play/pause/reset controls
- `with_dates`: Date/time handling
- `with_progress`: Progress tracking
- `with_checkboxes`: Checkbox toggles
- `with_hourly`: Hourly breakdown
- `with_daily`: Daily breakdown
- `with_alarm`: Alarm functionality
- `with_sections`: Content sections

Example:
```
display/weather/forecast/light?with_daily=yes&params=location:caption,unit:caption,date:string,days:integer
```

### 2. Parameter Types

The system supports strongly-typed parameters:

Text Types:
- `caption`: Short labels (1-3 words)
- `title`: Headings with context (3-7 words)
- `sentence`: Single complete thought
- `paragraph`: Multiple sentences
- `story`: Long-form content
- `url`: Web URLs

Number Types:
- Basic: `integer`, `decimal`
- Semantic: `size`, `duration`, `count`, `percentage`, `interval`, `goal`, `currency`

Arrays:
- `caption[]`: Lists of short items
- `sentence[]`: Lists of tasks/notes
- `{text:string,done:boolean}[]`: Basic todo items
- `{text:string,done:boolean,time:string}[]`: Scheduled todo items
- `{text:string,selected:boolean,value:string}[]`: Selection list items

## Technical Architecture

### Core Services

`assistantService.js`:
- Central service that manages the voice assistant state
- Handles audio recording, transcription, and component generation
- Maintains status (IDLE, LISTENING, THINKING, PROCESSING, ERROR)
- Supports different interaction modes (PTT, CALL)
- Emits events for UI updates

`audioSession.js`:
- Manages WebSocket connections for audio streaming
- Handles microphone access and audio processing
- Provides volume level monitoring
- Supports push-to-talk and call modes

`analysis.js`:
- Analyzes user requests using Claude
- Determines intent (new/modify)
- Generates widget URLs and parameters
- Maintains request history context

`api.js`:
- Handles OpenRouter API communication
- Supports both streaming and non-streaming completions
- Includes detailed request/response logging
- Handles SSE for real-time responses

`componentGeneration.js`:
- Creates React Native components from widget specifications
- Supports streaming generation with progress callbacks
- Handles component validation and error handling
- Provides abort capability for in-progress generations

`componentUtils.js`:
- Provides utilities for creating and rendering components
- Handles component sandboxing and error boundaries
- Manages React and React Native dependencies injection
- Supports dynamic component rendering with props

`widgetStorage.js`:
- Manages persistent storage of generated components
- Stores components by widget URL
- Maintains version history with timestamps
- Provides retrieval and update capabilities

`componentHistoryService.js`:
- Manages conversation and component history
- Supports navigation through previous components
- Maintains current component state
- Provides event-based state updates

## Platform-Specific Configuration

### iOS
- Bundle Identifier: `com.voiceassistant.app`
- Required Permissions:
  - Microphone Usage
  - Speech Recognition
  - Background Audio Mode

### Android
- Package: `com.voiceassistant.app`
- Required Permissions:
  - RECORD_AUDIO
  - INTERNET
- Build Configuration:
  - Kotlin Version: 1.8.10
  - Compile SDK: 35
  - Target SDK: 34
  - Build Tools: 34.0.0

## Evaluation System

The app includes two evaluation scripts for testing the AI components:

### Analysis Evaluation

Tests the system's ability to understand user requests and convert them to structured widget specifications:

```bash
bun scripts/evaluate-analysis.js [model]
# Default: anthropic/claude-3.5-sonnet
```

Example test case:
```json
{
    "request": "What time is it?",
    "expected": {
        "intent": "new",
        "widgetUrl": "display/clock/digital/light?params=format:caption,size:integer",
        "params": {
            "format": "HH:mm",
            "size": 48
        }
    }
}
```

### Component Generation Evaluation

Tests the system's ability to generate functional React Native components from widget specifications:

```bash
bun scripts/evaluate-generation.js [model]
# Default: anthropic/claude-3.5-sonnet
```

Each evaluation generates a detailed report with:
- Success rate percentage
- Average response time
- Detailed per-test results
- Error analysis

Reports are saved in the `evaluations/` directory with filenames:
- `analysis-[date]-[model].md`
- `generation-[date]-[model].md`

## Dependencies

Key packages:
- `expo` ~52.0.0
- `@expo/vector-icons` ^14.0.0
- `expo-av` ~15.0.2
- `expo-clipboard` ~7.0.1
- `expo-file-system` ~18.0.7
- `expo-haptics` ~14.0.1
- `expo-image-picker` ~16.0.4
- `expo-linking` ~7.0.0
- `expo-location` ~18.0.5
- `expo-media-library` ~17.0.5
- `expo-notifications` ~0.29.12
- `expo-sensors` ~14.0.2
- `expo-sharing` ~13.0.1
- `react` 18.3.1
- `react-native` 0.76.6
- `@react-native-async-storage/async-storage` 1.23.1
- `react-native-gesture-handler` ~2.20.2
- `react-native-reanimated` ~3.16.1
- `react-native-audio-record` ^0.2.2
- `@expo/vector-icons` ^14.0.4
- `partial-json` ^0.1.7

For full list of dependencies, see `package.json`.

## Development Notes

- Uses Expo Router for navigation
- Supports TypeScript
- Includes custom Expo plugins for speech recognition
- Configured for both light and dark mode support
- Uses EventEmitter pattern for state management
- Implements custom hooks for component state (useAssistantState)
- Uses MMKV for high-performance storage
- Supports both voice and keyboard input methods
- Implements WebSocket-based audio streaming

## License

MIT License

## Test API Keys for Builds

### Local Development with Test Keys

For local development, you can include test API keys so you don't need to enter them in the app:

1. Create a `.env` file with your test API keys:

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your test keys
# EXPO_PUBLIC_TEST_ULTRAVOX_KEY=your-ultravox-test-key
# EXPO_PUBLIC_TEST_OPENROUTER_KEY=your-openrouter-test-key
```

2. Run the app with the environment variables loaded:

```bash
# For iOS
yarn ios

# For Android
yarn android
```

### CI/CD Builds with Test Keys

For automated builds via GitHub Actions, test API keys are injected at build time:

1. Store your API keys as GitHub repository secrets:
   - `EXPO_PUBLIC_TEST_ULTRAVOX_KEY`
   - `EXPO_PUBLIC_TEST_OPENROUTER_KEY`

2. The CI workflow automatically passes these secrets to EAS Build:

```yaml
# From .github/workflows/release.yml
- name: Build and submit iOS app
  run: eas build --platform ios --profile production --non-interactive --auto-submit
  env:
    EXPO_PUBLIC_TEST_ULTRAVOX_KEY: ${{ secrets.EXPO_PUBLIC_TEST_ULTRAVOX_KEY }}
    EXPO_PUBLIC_TEST_OPENROUTER_KEY: ${{ secrets.EXPO_PUBLIC_TEST_OPENROUTER_KEY }}
```

This allows TestFlight and Play Store testers to use the app without needing to enter API keys.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

### Development Workflow

1. **Setup Environment**:
   - Install dependencies: `yarn install`
   - Configure API keys in `.env` file

2. **Run Tests**:
   - Evaluate analysis: `yarn evaluate-analysis`
   - Evaluate generation: `yarn evaluate-generation`

3. **Build and Test**:
   - Development build: `yarn ios` or `yarn android`
   - Production build: `yarn build:ios` or `yarn build:android`

4. **Submit Changes**:
   - Ensure all tests pass
   - Follow the existing code style
   - Include documentation updates
