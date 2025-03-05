# Input Options Design

## 1. Push to Talk
- **Interaction Flow**:
  - User presses and holds button while speaking
  - AI only listens during button press
  - Processing starts when button is released
  - No generation begins until after release

- **UI Components**:
  ```
  +-------------------+
  |                   |
  |                   |
  |                   |
  |      [HOLD]       | <- Large prominent button
  |   TO SPEAK TO AI  |
  |                   |
  |                   |
  +-------------------+
  ```

- **States**:
  - Idle: Button shows "Hold to Speak"
  - Pressed: Button shows "Listening..." with animation
  - Released: Button shows "Processing..." then returns to idle
  - Response: AI response appears in conversation area

- **Benefits**:
  - Clear control over when AI is listening
  - Privacy-friendly (explicit activation)
  - Reduces accidental activations
  - User knows exactly when input ends

## 2. Call Mode
- **Interaction Flow**:
  - User initiates call with a tap on main button
  - Both user and AI can speak freely
  - Explicit "End Call" action required to terminate

- **UI Components**:
  ```
  +-------------------+
  |                   |
  |                   |
  |                   |
  |      [CALL        |
  |     ACTIVE]       | <- Same button, different state
  |    00:02:45       |
  |                   |
  +-------------------+
  ```

- **States**:
  - Pre-call: Tap button once to start call
  - Connecting: Animation showing connection
  - Active call: Call timer, visual indicators for who is speaking
  - Ending: Tap button again to end call

- **Benefits**:
  - Natural conversational flow
  - Hands-free operation
  - Immediate back-and-forth 
  - Good for longer interactions

## 3. Silent Mode (Keyboard)
- **Interaction Flow**:
  - User taps keyboard toggle in corner
  - Keyboard slides up, covering voice button
  - User types query and sends with send button/enter key
  - Tap microphone toggle to dismiss keyboard

- **UI Components**:
  ```
  Before keyboard:                After keyboard activation:
  +-------------------+           +-------------------+
  |                   |           |                   |
  |                   |           |                   |
  |                   |           |                   |
  |     [🎤]          |           |                   |
  |                   |           |                   |
  |                   |           |              [🎤↓]|
  |              [⌨️↑]|           +-------------------+
  +-------------------+           |[Type here...][→]  |
                                  +-------------------+
  ```

- **States**:
  - Input: Text field active, keyboard visible
  - Sending: Animation or indicator
  - Response: Text appears in conversation
  - Toggle: Keyboard toggle changes to microphone when active

- **Benefits**:
  - Works in quiet environments
  - Privacy in public spaces
  - Precise input formatting
  - Good for technical queries

## Unified Input Approach

### Gesture-Based Controls
- **Tap**: Start/end call mode
- **Press and hold**: Push-to-talk mode
- **Keyboard toggle**: Tap corner button to switch to keyboard

### Visual Consistency
- Same primary button location for voice interactions
- Clear state indicators for current mode
- Consistent positioning of controls

### Mode Transitions
- Seamless switching between input methods
- Keyboard covers voice button when active
- Voice button reveals when keyboard dismisses
- No jarring layout changes during transitions

## Contextual Suggestions
- System detects environment (noise level, public place)
- Suggests appropriate mode with subtle notification
- "Noisy here? Try Call Mode" or "In a meeting? Try Silent Mode"
- User can accept or dismiss suggestion

## Accessibility Considerations
- Voice control alternatives for push-to-talk
- Visual indicators for audio feedback
- Keyboard shortcuts for all actions
- High contrast mode for buttons
- Large touch targets for all interactive elements