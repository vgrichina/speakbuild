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
  - User initiates call with "Call AI" button
  - Both user and AI can speak freely
  - Explicit "End Call" action required to terminate

- **UI Components**:
  ```
  +-------------------+
  | [CALL AI]         |
  |                   |
  | +---------------+ |
  | | Active Call   | |
  | | 00:02:45      | |
  | +---------------+ |
  |                   |
  | [HANG UP]         |
  +-------------------+
  ```

- **States**:
  - Pre-call: "Call AI" button visible
  - Connecting: Animation showing connection
  - Active call: Call timer, visual indicators for who is speaking
  - Ending: "Call ended" confirmation

- **Benefits**:
  - Natural conversational flow
  - Hands-free operation
  - Immediate back-and-forth 
  - Good for longer interactions

## 3. Silent Mode (Keyboard)
- **Interaction Flow**:
  - User types query in text input
  - Sends with submit button/enter key
  - AI responds with text only

- **UI Components**:
  ```
  +-------------------+
  |                   |
  | Chat History      |
  |                   |
  +-------------------+
  | [Type here...   ] |
  | [Send]            |
  +-------------------+
  ```

- **States**:
  - Input: Text field active
  - Sending: Animation or indicator
  - Response: Text appears in conversation

- **Benefits**:
  - Works in quiet environments
  - Privacy in public spaces
  - Precise input formatting
  - Good for technical queries

## Switching Between Modes
- Toggle control in settings
- Quick access button to change modes
- Context-aware suggestions (e.g., "Switch to silent mode?" in library)

## Accessibility Considerations
- Voice control alternatives for push-to-talk
- Visual indicators for audio feedback
- Keyboard shortcuts for all actions
- High contrast mode for buttons