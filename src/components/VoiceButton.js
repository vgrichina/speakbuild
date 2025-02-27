import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Square, Mic, MicOff } from 'lucide-react-native';

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
 * Voice button component that changes appearance based on generation status
 * @param {Object} props - Component props
 * @param {string} props.status - Current generation status ('IDLE', 'RECORDING', 'GENERATING', 'ERROR')
 * @param {Function} props.onToggle - Function to call when button is pressed
 * @param {number} props.volume - Current audio volume (0-1)
 * @param {boolean} props.disabled - Whether the button is disabled
 */
export const VoiceButton = ({ 
    disabled,
    status,
    onToggle,
    volume = 0
}) => {
    console.log('VoiceButton rendered with status:', status); // Add logging
    const [isPressed, setIsPressed] = useState(false);
    
    // Determine if button should show active state
    const isActive = status === 'RECORDING' || status === 'GENERATING';
    console.log('VoiceButton isActive:', isActive); // Add logging

    // Determine the button style based on status
    let buttonStyle;
    switch (status) {
        case 'RECORDING':
            buttonStyle = {
                backgroundColor: '#EF4444', // Red for recording
            };
            break;
        case 'GENERATING':
            buttonStyle = {
                backgroundColor: '#F59E0B', // Amber for generating
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

    // Determine button text based on status
    let buttonText;
    switch (status) {
        case 'RECORDING':
            buttonText = 'Stop recording';
            break;
        case 'GENERATING':
            buttonText = 'Cancel';
            break;
        case 'ERROR':
            buttonText = 'Try again';
            break;
        case 'IDLE':
        default:
            buttonText = 'Start listening';
            break;
    }

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {isActive && <PulsatingCircle isActive={true} volume={volume} />}
            <Pressable
                onPress={onToggle}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                disabled={disabled}
                style={[
                    {
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ scale: isPressed ? 0.95 : 1 }],
                    },
                    buttonStyle,
                    disabled && { opacity: 0.5 }
                ]}
            >
                {isActive ? (
                    <Square size={32} color="white" />
                ) : (
                    <Mic size={32} color="white" />
                )}
            </Pressable>
            <Text style={{ 
                marginTop: 8,
                color: isActive ? '#EF4444' : '#666',
                fontSize: 12 
            }}>
                {buttonText}
            </Text>
        </View>
    );
};
