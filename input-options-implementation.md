# Input Options Implementation Design Document

## 1. Overview

This document outlines the implementation of three input interaction patterns described in input-options-design.md:
- Push-to-Talk (press and hold)
- Call Mode (tap to start/end)
- Keyboard Mode (tap keyboard toggle)

The key design principle is that modes are triggered by natural gestures rather than explicit mode selection.

## 2. Interaction-Based Architecture

```
┌───────────────────────────────────────────────────┐
│                  AssistantContext                  │
│ ┌───────────────────────────────────────────────┐ │
│ │• State: inputState, callActive, keyboardActive│ │
│ │• Methods: detectGesture(), submitText()       │ │
│ └───────────────────────────────────────────────┘ │
└───────┬─────────────────────────┬─────────────────┘
        │                         │
┌───────▼─────────┐     ┌─────────▼───────┐
│  VoiceButton    │     │  VoiceRoomContext│
│ ┌─────────────┐ │     │ ┌─────────────┐  │
│ │• onPressIn  │ │     │ │• Recording  │  │
│ │• onPressOut │◄├─────┼─┤• WebSocket  │  │
│ │• onTap      │ │     │ │• Processing │  │
│ └─────────────┘ │     │ └─────────────┘  │
└─────┬───────────┘     └─────────────────┬┘
      │                                   │
      │                                   │
      │                           ┌───────▼───────┐
      └───────────────────────────► KeyboardToggle │
                                  │ ┌───────────┐ │
                                  │ │• TextInput│ │
                                  │ │• Submit   │ │
                                  │ └───────────┘ │
                                  └───────────────┘
```

## 3. Core Interaction Patterns

### 3.1 Gesture-Based Mode Detection

Instead of explicit mode selection, the system detects and responds to gesture patterns:

```javascript
// In VoiceButton component
const VoiceButton = React.memo(({
  onPress,
  onPressIn,
  onPressOut,
  onLongPress,
  status,
  callActive,
  volume
}) => {
  const [gesture, setGesture] = useState(null);
  
  // Track press start time for distinguishing gestures
  const pressStartTime = useRef(null);
  
  // Handle press in - potential start of any gesture
  const handlePressIn = useCallback(() => {
    pressStartTime.current = Date.now();
    setGesture('pressing');
    onPressIn?.(); // Immediately start PTT recording
  }, [onPressIn]);
  
  // Handle press out - could be PTT end or tap
  const handlePressOut = useCallback(() => {
    const pressDuration = Date.now() - (pressStartTime.current || 0);
    pressStartTime.current = null;
    
    if (pressDuration < 300) { // Short press - interpret as tap
      setGesture('tap');
      onPress?.(); // Toggle call mode
    } else { // Long press - interpret as PTT release
      setGesture(null);
      onPressOut?.(); // Stop PTT recording
    }
  }, [onPress, onPressOut]);
  
  // Render keyboard toggle separately
  const renderKeyboardToggle = () => (
    <Pressable 
      style={styles.keyboardToggle}
      onPress={onToggleKeyboard}
    >
      <Keyboard size={20} color="#6B7280" />
    </Pressable>
  );
  
  return (
    <View style={styles.container}>
      {renderKeyboardToggle()}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          gesture === 'pressing' && styles.buttonPressed,
          callActive && styles.buttonCallActive
        ]}
      >
        {/* Button content based on status */}
      </Pressable>
    </View>
  );
});
```

### 3.2 AssistantContext Enhancements

Instead of tracking "mode", track interaction state:

```javascript
// In AssistantContext
const [callActive, setCallActive] = useState(false);
const [keyboardActive, setKeyboardActive] = useState(false);
const [callStartTime, setCallStartTime] = useState(null);

// Handle press-and-hold (PTT)
const handlePressIn = useCallback(() => {
  if (callActive || keyboardActive) return; // Don't start PTT during call/keyboard
  
  console.log('Starting PTT recording');
  setStatus('LISTENING');
  
  // Start recording in PTT mode
  voiceRoom.startRecording({
    // PTT-specific options
    continuousListening: false,
    onTranscription: handleTranscription
  });
}, [callActive, keyboardActive, voiceRoom]);

// Handle release (PTT end)
const handlePressOut = useCallback(() => {
  if (callActive) return; // Don't end recording if in call mode
  
  console.log('Stopping PTT recording');
  voiceRoom.stopRecording();
}, [callActive, voiceRoom]);

// Handle tap (toggle call)
const handlePress = useCallback(() => {
  if (keyboardActive) return; // Don't toggle call if keyboard is active
  
  if (!callActive) {
    // Start call
    console.log('Starting call');
    setCallActive(true);
    setCallStartTime(Date.now());
    setStatus('LISTENING');
    
    // Start recording in call mode
    voiceRoom.startRecording({
      // Call-specific options
      continuousListening: true,
      silenceThreshold: 1.5,
      onTranscription: handleTranscription
    });
  } else {
    // End call
    console.log('Ending call');
    setCallActive(false);
    setCallStartTime(null);
    voiceRoom.stopRecording();
    setStatus('IDLE');
  }
}, [keyboardActive, callActive, voiceRoom]);

// Toggle keyboard
const toggleKeyboard = useCallback(() => {
  setKeyboardActive(prev => !prev);
  
  // If enabling keyboard and call is active, keep call going
  // If no call is active, ensure we're in IDLE state
  if (!keyboardActive && !callActive) {
    setStatus('IDLE');
  }
}, [keyboardActive, callActive]);
```

## 4. Interaction State Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                        IDLE                                  │
│                                                              │
└───┬──────────────┬─────────────────────┬────────────────┬────┘
    │              │                     │                │
Press & Hold   Tap │                     │ Tap Keyboard   │ Tap Keyboard 
    │              │                     │ Toggle         │ Toggle (again)
    │              │                     │                │
┌───▼──────┐   ┌───▼──────┐         ┌────▼────┐      ┌───▼──────┐
│  PTT     │   │          │         │         │      │          │
│LISTENING │   │  CALL    │         │KEYBOARD │      │  IDLE    │
│          │   │LISTENING │         │ ACTIVE  │      │          │
└───┬──────┘   └────┬─────┘         └────┬────┘      └──────────┘
    │               │                    │
Release         Tap │                    │ Submit Text
    │               │                    │
┌───▼──────┐   ┌────▼────┐          ┌───▼─────┐
│          │   │         │          │         │
│PROCESSING│   │  IDLE   │          │PROCESSING
│          │   │         │          │         │
└───┬──────┘   └─────────┘          └───┬─────┘
    │                                   │
Complete                            Complete
    │                                   │
┌───▼──────┐                        ┌───▼─────┐
│          │                        │         │
│  IDLE    │                        │  IDLE   │
│          │                        │         │
└──────────┘                        └─────────┘
```

## 5. Component Implementation Details

### 5.1 VoiceButton.js

The VoiceButton needs to visually adapt to the current interaction state:

```javascript
const getButtonContent = () => {
  if (callActive) {
    // Show call status and duration
    return (
      <>
        <Phone size={28} color="white" />
        {renderCallDuration()}
      </>
    );
  } else if (status === 'LISTENING') {
    // Show stop/square icon
    return <Square size={32} color="white" />;
  } else {
    // Show default mic icon
    return <Mic size={32} color="white" />;
  }
};

const renderCallDuration = () => {
  if (!callStartTime) return null;
  
  const duration = Math.floor((Date.now() - callStartTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  return (
    <Text style={styles.callDuration}>
      {`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
    </Text>
  );
};
```

### 5.2 KeyboardInput.js

```javascript
export const KeyboardInput = ({ 
  active, 
  onSubmit,
  onToggle,
  callActive
}) => {
  const [text, setText] = useState('');
  
  if (!active) return (
    <Pressable onPress={onToggle} style={styles.keyboardToggle}>
      <Keyboard size={20} color="#6B7280" />
    </Pressable>
  );
  
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={
          callActive 
            ? "Send message during call..." 
            : "Type your message..."
        }
        multiline
      />
      <View style={styles.controls}>
        <Pressable onPress={onToggle} style={styles.toggleButton}>
          <Mic size={20} color="#6B7280" />
        </Pressable>
        <Pressable 
          onPress={() => {
            onSubmit(text);
            setText('');
          }}
          style={styles.sendButton}
          disabled={!text.trim()}
        >
          <Send size={20} color={text.trim() ? "#3B82F6" : "#D1D5DB"} />
        </Pressable>
      </View>
    </View>
  );
};
```

### 5.3 VoiceRoomContext.js Enhancements

```javascript
// Call mode support
const startRecording = useCallback(async (options) => {
  const {
    continuousListening = false,
    silenceThreshold = 1.5,
    // Other options...
  } = options;
  
  // Configure WebSocket appropriately
  const wsOptions = {
    // Base options
    inputSampleRate: 16000,
    outputSampleRate: 16000,
    
    // Call-specific options if continuousListening is enabled
    ...(continuousListening ? {
      maxDuration: '3600s', // 1 hour for calls
      silenceThresholdSec: silenceThreshold,
      enablePartialResults: true,
      endCallOnSilence: false
    } : {
      maxDuration: '30s', // Short for PTT
      endCallOnSilence: true
    })
  };
  
  // Connect to WebSocket with appropriate options
  // Rest of implementation...
}, []);

// Text message support
const sendTextMessage = useCallback((text, inCall = false) => {
  if (inCall) {
    // Send through active WebSocket
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      throw new Error('No active call to send text message');
    }
    
    ws.current.send(JSON.stringify({
      type: 'text_input',
      content: text
    }));
  } else {
    // Direct text processing (no WebSocket)
    // Handle via regular API call
  }
}, []);
```

## 6. Implementation Strategy

### Phase 1: Gesture Detection
- Enhance VoiceButton to detect press, hold, and tap
- Map gestures to appropriate actions
- Visual feedback for gesture recognition

### Phase 2: Call Mode 
- Implement tap to start/end call
- Add call duration display
- Configure continuous listening

### Phase 3: Keyboard Mode
- Create KeyboardInput component
- Implement keyboard toggle
- Animation for keyboard appearance/disappearance

### Phase 4: Unified Processing
- Ensure all input methods use same processing pipeline
- Share conversation context between modes
- Handle transitions between interaction modes

## 7. User Experience Enhancements

### Natural Discovery
- Subtle hints about available gestures
- Haptic feedback for gesture recognition
- Smooth transitions between interaction states

### Visual Consistency
- Button maintains consistent position
- Visual state clearly indicates current interaction mode
- Animations guide user through mode transitions

### Error Prevention
- Prevent accidental mode switching during processing
- Confirmation for ending long calls
- Clear feedback on current state

## 8. Testing Focus Areas
- Gesture recognition accuracy
- Mode transition reliability
- Performance during continuous listening
- Handling interruptions (calls, notifications)