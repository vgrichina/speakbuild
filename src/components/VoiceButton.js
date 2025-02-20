import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Square, Mic, MicOff } from 'lucide-react-native';

// Animation value outside component to prevent recreation
const pulseAnimation = new Animated.Value(1);

const PulsatingCircle = ({ isActive, volume }) => {
    React.useEffect(() => {
        if (isActive) {
            const safeVolume = isNaN(volume) ? 0 : volume;
            console.log('PulsatingCircle volume:', safeVolume, 'raw volume:', volume);
            Animated.spring(pulseAnimation, {
                toValue: 1 + (safeVolume * 0.5),
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

export const VoiceButton = ({ 
    disabled,
    isActive,
    onToggle,
    volume 
}) => {
    const [isPressed, setIsPressed] = useState(false);

    // Add logging when volume changes
    React.useEffect(() => {
        if (isActive) {
            console.log('VoiceButton received volume:', volume);
        }
    }, [isActive, volume]);

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
                        backgroundColor: isActive ? '#EF4444' : '#3B82F6',
                        transform: [{ scale: isPressed ? 0.95 : 1 }],
                    },
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
                {isActive ? 'Stop' : 'Start listening'}
            </Text>
        </View>
    );
};
