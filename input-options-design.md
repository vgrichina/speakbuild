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

## State Transitions

### Push-to-Talk Mode State Diagram
```
                           +----------------+
                           |                |
                           |      IDLE      |<-----+
                           |                |      |
                           +--------+-------+      |
                                    |              |
        +-------------------------+ | +------------+
        |                         | | |
+-------v-------+          +------v-v------+
|               |  Release |                |
| PTT LISTENING +--------->+   PROCESSING   |
|               |          |                |
+-------+-------+          +------+-+------+
        |                         | |
        | Cancel                  | | Complete
        |                         | |
        |              +----------+ |
        |              |            |
        +------------->+            |
                       |    DISPLAY |
                       | COMPONENT  |
                       |            |
                       +------------+
```

### Call Mode State Diagram
```
                           +----------------+
                           |                |
               +---------->+      IDLE      +----------+
               |           |                |          |
               |           +--------+-------+          |
               |                    |                  |
               | End Call           | Tap              |
               |                    |                  |
               |           +--------v-------+          |
               |           |                |          |
               +-----------+   CALL ACTIVE   <---------+
                           |                |          
                           +--------+-------+          
                                    |                  
                                    | Speech Detected  
                                    |               
                           +--------v-------+          
                           |                |          
                           |   PROCESSING   |          
                           |                |          
                           +--------+-------+          
                                    |                  
                                    | Complete
                                    |               
                           +--------v-------+          
                           |    DISPLAY     |          
                           |   COMPONENT    |          
                           |                |          
                           +----------------+          
```

### Keyboard Mode State Diagram
```
                           +----------------+
                           |                |
                  +------->+      IDLE      <---------+
                  |        |                |         |
                  |        +--------+-------+         |
                  |                 |                 |
                  | Close Keyboard  | Open Keyboard   |
                  |                 |                 |
                  |        +--------v-------+         |
        +---------+        |                |         |
        |                  |    KEYBOARD    |         |
        |                  |     ACTIVE     |         |
        |                  |                |         |
        |                  +--------+-------+         |
        |                           |                 |
        |                           | Send Text       |
        |                           |                 |
        |                  +--------v-------+         |
        |                  |                |         |
        |                  |   PROCESSING   +-------->+
        |                  |                |         |
        |                  +--------+-------+         |
        |                           |                 |
        |                           | Complete        |
        |                           |                 |
        |                  +--------v-------+         |
        |                  |    DISPLAY     |         |
        +----------------->+   COMPONENT    |         |
                           |                |         |
                           +----------------+         |
```

### Key State Transitions

#### Push-to-Talk Mode
* **IDLE → PTT LISTENING**
  - Trigger: User presses and holds voice button
  - UI Change: Button expands with pulsating animation
  - System: Voice recognition begins immediately

* **PTT LISTENING → PROCESSING**
  - Trigger: User releases button
  - UI Change: Button changes color, shows processing indicator
  - System: Transcription finalized, sent to AI for processing

* **PTT LISTENING → IDLE**
  - Trigger: User cancels by tapping cancel button
  - UI Change: Button returns to idle state
  - System: Discards partial recording, resets

* **PROCESSING → DISPLAY COMPONENT**
  - Trigger: AI completes generation
  - UI Change: Component appears, button returns to idle state
  - System: Renders interactive component from generated code

#### Call Mode
* **IDLE → CALL ACTIVE**
  - Trigger: User taps voice button once
  - UI Change: Button shows call active state with timer
  - System: Continuous listening mode activated

* **CALL ACTIVE → PROCESSING**
  - Trigger: User's speech pauses (silence threshold)
  - UI Change: Processing indicator appears alongside call timer
  - System: Processes speech segment while still listening

* **CALL ACTIVE → IDLE**
  - Trigger: User taps button again to end call
  - UI Change: Button returns to idle state
  - System: Ends listening session, finalizes any pending processing

* **PROCESSING → DISPLAY COMPONENT (during call)**
  - Trigger: AI generates response for speech segment
  - UI Change: Component appears while call remains active
  - System: Maintains call state while displaying result

#### Keyboard Mode
* **IDLE → KEYBOARD ACTIVE**
  - Trigger: User taps keyboard toggle
  - UI Change: Keyboard slides up, voice button covered
  - System: Switches to text input mode

* **KEYBOARD ACTIVE → PROCESSING**
  - Trigger: User sends text message
  - UI Change: Send button shows processing state
  - System: Sends text to AI for processing

* **KEYBOARD ACTIVE → IDLE**
  - Trigger: User taps microphone toggle
  - UI Change: Keyboard dismisses, voice button revealed
  - System: Returns to voice input mode

* **PROCESSING → DISPLAY COMPONENT**
  - Trigger: AI completes generation from text input
  - UI Change: Component appears, keyboard remains visible
  - System: Renders interactive component while maintaining keyboard state

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

### Critical Transition Considerations
- Context preservation across mode switches
- Interruption handling for all processing states
- Error state transitions with recovery paths
- Multi-turn conversation flow in call mode
- Rules for switching input modes during active states

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