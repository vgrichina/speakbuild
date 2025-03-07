import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Square, Mic, Phone, Keyboard } from 'lucide-react-native';

/**
 * Component for visualizing audio volume
 */
const VolumeVisualization = ({ volume = 0, isActive = false }) => {
  // Animation value
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // Animate when volume changes
  useEffect(() => {
    if (isActive) {
      Animated.spring(pulseAnimation, {
        toValue: 1 + (volume * 2.5),
        friction: 3,
        tension: 40,
        useNativeDriver: true
      }).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isActive, volume, pulseAnimation]);
  
  // Don't render if not active
  if (!isActive) return null;
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#EF4444',
        opacity: 0.3,
        transform: [{ scale: pulseAnimation }],
      }}
    />
  );
};

/**
 * Voice button component supporting PTT and Call modes
 * @param {Object} props - Component props
 * @param {string} props.status - Current status ('idle', 'listening', 'processing', 'error')
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {number} props.volume - Current audio volume (0-1)
 * @param {boolean} props.callActive - Whether call mode is active
 * @param {number} props.callStartTime - When the call started (for duration display)
 * @param {Function} props.onPressIn - Callback when button is pressed (PTT start)
 * @param {Function} props.onPressOut - Callback when button is released (PTT end)
 * @param {Function} props.onToggleCall - Callback to toggle call mode
 * @param {Function} props.onToggleKeyboard - Callback to toggle keyboard mode
 * @param {boolean} props.keyboardActive - Whether keyboard mode is active
 */
export const VoiceButton = React.memo(({
  status = 'idle',
  disabled = false,
  volume = 0,
  callActive = false,
  callStartTime = null,
  onPressIn,
  onPressOut,
  onToggleCall,
  onToggleKeyboard,
  keyboardActive = false
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const pressStartTime = useRef(null);
  
  // Handle press in for gesture detection
  const handlePressIn = useCallback(() => {
    if (disabled || keyboardActive) return;
    
    pressStartTime.current = Date.now();
    setIsPressed(true);
    
    // If call mode is not active, trigger PTT
    if (!callActive && onPressIn) {
      console.log('VoiceButton: Press and hold detected (PTT)');
      onPressIn();
    }
  }, [callActive, disabled, keyboardActive, onPressIn]);
  
  // Handle press out for gesture detection
  const handlePressOut = useCallback(() => {
    if (disabled || keyboardActive) return;
    
    const pressDuration = Date.now() - (pressStartTime.current || 0);
    pressStartTime.current = null;
    setIsPressed(false);
    
    if (pressDuration < 300) {
      // Short press - interpret as tap (toggle call mode)
      console.log('VoiceButton: Tap detected (toggle call)');
      if (onToggleCall) {
        onToggleCall();
      }
    } else if (!callActive && onPressOut) {
      // Long press - PTT release only if not in call mode
      console.log('VoiceButton: Press and hold release (PTT end)');
      onPressOut();
    }
  }, [callActive, disabled, keyboardActive, onPressOut, onToggleCall]);
  
  // Render call duration if in call mode
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
  
  // Initialize a timer for call duration updates
  useEffect(() => {
    let timer;
    if (callActive && callStartTime) {
      // Update every second for the timer display
      timer = setInterval(() => {
        // Force re-render to update duration
        setIsPressed(prev => prev);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callActive, callStartTime]);
  
  // Determine if button should show active state
  const isActive = status === 'listening' || isPressed;
  
  // Determine button content based on state
  const renderButtonContent = () => {
    if (callActive) {
      // Show call status and duration
      return (
        <>
          <Phone size={28} color="white" />
          {renderCallDuration()}
        </>
      );
    } else if (status === 'listening' || isPressed) {
      // Show volume visualization for PTT or active listening
      return <Square size={32} color="white" />;
    } else if (status === 'processing') {
      // Show processing indicator
      return <Mic size={32} color="white" />;
    } else {
      // Show default mic icon
      return <Mic size={32} color="white" />;
    }
  };
  
  // Determine button style based on status and modes
  let buttonStyle;
  if (callActive) {
    buttonStyle = {
      backgroundColor: '#10B981', // Green for call mode
    };
  } else if (isPressed) {
    buttonStyle = {
      backgroundColor: '#EF4444', // Red for pressed (PTT)
    };
  } else {
    switch (status) {
      case 'listening':
        buttonStyle = {
          backgroundColor: '#EF4444', // Red for listening
        };
        break;
      case 'processing':
        buttonStyle = {
          backgroundColor: '#F59E0B', // Amber for processing
        };
        break;
      case 'error':
        buttonStyle = {
          backgroundColor: '#6B7280', // Gray for error
        };
        break;
      case 'idle':
      default:
        buttonStyle = {
          backgroundColor: '#3B82F6', // Blue for idle
        };
        break;
    }
  }
  
  // Determine button text based on status and modes
  let buttonText;
  if (callActive) {
    buttonText = 'End Call';
  } else if (isPressed) {
    buttonText = 'Listening...';
  } else {
    switch (status) {
      case 'listening':
        buttonText = 'Listening...';
        break;
      case 'processing':
        buttonText = 'Processing...';
        break;
      case 'error':
        buttonText = 'Try again';
        break;
      case 'idle':
      default:
        buttonText = 'Hold to speak';
        break;
    }
  }
  
  return (
    <View style={styles.container}>
      {/* Keyboard toggle button */}
      <Pressable 
        style={styles.keyboardToggle}
        onPress={onToggleKeyboard}
        disabled={disabled}
      >
        <Keyboard size={20} color="#6B7280" />
      </Pressable>
      
      {/* Main voice button */}
      <View style={styles.buttonContainer}>
        <VolumeVisualization isActive={isActive} volume={volume} />
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || keyboardActive}
          style={[
            styles.button,
            buttonStyle,
            disabled && styles.disabled,
            keyboardActive && styles.disabled
          ]}
        >
          {renderButtonContent()}
        </Pressable>
        <Text style={[
          styles.buttonText,
          isActive && styles.activeButtonText
        ]}>
          {buttonText}
        </Text>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Optimize re-renders by only updating when specific props change
  // 1. Status has changed
  // 2. Disabled state has changed
  // 3. Call active state has changed
  // 4. Keyboard active state has changed
  // 5. Volume has changed AND we're in LISTENING mode
  const shouldSkip = 
    prevProps.status === nextProps.status &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.callActive === nextProps.callActive &&
    prevProps.keyboardActive === nextProps.keyboardActive &&
    (prevProps.status !== 'listening' || prevProps.volume === nextProps.volume);
  
  return shouldSkip;
});

// Styles for the voice button components
const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
  activeButtonText: {
    color: '#EF4444',
  },
  keyboardToggle: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  callDuration: {
    marginTop: 4,
    color: 'white',
    fontSize: 12,
  }
});