import React, { useState, useCallback, useRef } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator, StyleSheet } from 'react-native';
import { Square, Mic, Phone, Keyboard } from 'lucide-react-native';

// Animation value outside component to prevent recreation
const pulseAnimation = new Animated.Value(1);

const PulsatingCircle = ({ isActive, volume }) => {
    React.useEffect(() => {
        if (isActive) {
            Animated.spring(pulseAnimation, {
                toValue: 1 + (volume * 20),
                friction: 3,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else {
            pulseAnimation.setValue(1);
        }
    }, [isActive, volume]);

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
 * Voice button component that supports Push to Talk and Call Mode
 * @param {Object} props - Component props
 * @param {string} props.status - Current generation status ('IDLE', 'LISTENING', 'THINKING', 'ERROR')
 * @param {Function} props.onStart - Function to call when starting recording
 * @param {Function} props.onStop - Function to call when stopping recording or canceling generation
 * @param {number} props.volume - Current audio volume (0-1)
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {boolean} props.callActive - Whether call mode is active
 * @param {Function} props.onPressIn - Function to call when button is pressed (PTT mode)
 * @param {Function} props.onPressOut - Function to call when button is released (PTT mode)
 * @param {Function} props.onToggleKeyboard - Function to call when keyboard is toggled
 * @param {boolean} props.keyboardActive - Whether keyboard mode is active
 */
export const VoiceButton = React.memo(({ 
    disabled,
    status,
    onStart,
    onStop,
    volume = 0,
    callActive = false,
    onPressIn,
    onPressOut,
    onToggleKeyboard,
    keyboardActive = false,
    callStartTime = null
}) => {
    console.log('VoiceButton rendered with status:', status);
    
    const [isPressed, setIsPressed] = useState(false);
    const pressStartTime = useRef(null);
    
    // Determine if button should show active state
    const isActive = status === 'LISTENING' || status === 'THINKING';
    
    // Handle press in for gesture detection
    const handlePressIn = useCallback(() => {
        pressStartTime.current = Date.now();
        setIsPressed(true);
        
        // If call mode is active, we don't start PTT
        if (!callActive) {
            console.log('[VoiceButton] Press and hold detected (PTT)');
            onPressIn?.();
        }
    }, [callActive, onPressIn]);
    
    // Handle press out for gesture detection
    const handlePressOut = useCallback(() => {
        const pressDuration = Date.now() - (pressStartTime.current || 0);
        pressStartTime.current = null;
        setIsPressed(false);
        
        if (pressDuration < 300) {
            // Short press - interpret as tap (toggle call mode)
            console.log('[VoiceButton] Tap detected (toggle call)');
            if (callActive) {
                // End call
                onStop?.();
            } else {
                // Start call
                onStart?.();
            }
        } else if (!callActive) {
            // Long press - interpret as PTT release
            console.log('[VoiceButton] Press and hold release (PTT end)');
            onPressOut?.();
        }
    }, [callActive, onStop, onStart, onPressOut]);

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
        } else if (status === 'LISTENING' || isPressed) {
            // Show stop icon for PTT or active listening
            return <Square size={32} color="white" />;
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
            case 'LISTENING':
                buttonStyle = {
                    backgroundColor: '#EF4444', // Red for listening
                };
                break;
            case 'THINKING':
                buttonStyle = {
                    backgroundColor: '#F59E0B', // Amber for thinking
                };
                break;
            case 'ERROR':
                buttonStyle = {
                    backgroundColor: '#6B7280', // Gray for error
                };
                break;
            case 'IDLE':
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
            case 'LISTENING':
                buttonText = 'Stop listening';
                break;
            case 'THINKING':
                buttonText = 'Cancel';
                break;
            case 'ERROR':
                buttonText = 'Try again';
                break;
            case 'IDLE':
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
                {isActive && <PulsatingCircle isActive={true} volume={volume} />}
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
    // Only re-render in these cases:
    // 1. Status has changed
    // 2. Disabled state has changed
    // 3. Call active state has changed
    // 4. Keyboard active state has changed
    // 5. Call start time has changed
    // 6. Volume has changed AND we're in LISTENING mode
    const shouldSkip = prevProps.status === nextProps.status &&
                      prevProps.disabled === nextProps.disabled &&
                      prevProps.callActive === nextProps.callActive &&
                      prevProps.keyboardActive === nextProps.keyboardActive &&
                      prevProps.callStartTime === nextProps.callStartTime &&
                      (prevProps.status !== 'LISTENING' || prevProps.volume === nextProps.volume);
                      
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
