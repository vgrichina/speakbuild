import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Square, Phone, PhoneOff } from 'lucide-react-native';
import { useLocalParticipant } from '@livekit/react-native';

// Animation value outside component to prevent recreation
const pulseAnimation = new Animated.Value(1);

const PulsatingCircle = ({ isActive, volume }) => {
    const animConfig = React.useMemo(() => ({
        toValue: 1 + (volume * 0.5),
        friction: 3,
        tension: 40,
        useNativeDriver: true,
    }), [volume]);

    React.useEffect(() => {
        if (isActive) {
            Animated.spring(pulseAnimation, animConfig).start();
        } else {
            pulseAnimation.setValue(1);
        }
    }, [isActive, animConfig]);

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
    volume,
    isGenerating,
    onStopGeneration,
    onStartCall,
    onEndCall,
    isConnecting
}) => {
    const [isPressed, setIsPressed] = useState(false);
    const { localParticipant } = useLocalParticipant();

    const handlePress = useCallback(() => {
        if (isGenerating) {
            onStopGeneration();
        } else if (localParticipant) {
            onEndCall();
        } else {
            onStartCall();
        }
    }, [isGenerating, localParticipant, onStartCall, onEndCall]);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {localParticipant && <PulsatingCircle isActive={true} volume={volume} />}
            <Pressable
                onPress={handlePress}
                onPressIn={() => setIsPressed(true)}
                onPressOut={() => setIsPressed(false)}
                disabled={disabled || isConnecting}
                style={[
                    {
                        width: 64,
                        height: 64,
                        borderRadius: 32,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isGenerating ? '#EF4444' : (localParticipant ? '#EF4444' : '#3B82F6'),
                        transform: [{ scale: isPressed ? 0.95 : 1 }],
                    },
                    (disabled || isConnecting) && { opacity: 0.5 }
                ]}
            >
                {isGenerating ? (
                    <Square size={24} color="white" />
                ) : isConnecting ? (
                    <ActivityIndicator color="white" />
                ) : localParticipant ? (
                    <PhoneOff size={32} color="white" />
                ) : (
                    <Phone size={32} color="white" />
                )
                }
            </Pressable>
            <Text style={{ 
                marginTop: 8,
                color: (isGenerating || localParticipant) ? '#EF4444' : '#666',
                fontSize: 12 
            }}>
                {isGenerating ? 'Stop generating' : 
                 isConnecting ? 'Connecting...' :
                 localParticipant ? 'End call' : 'Start call'}
            </Text>
        </View>
    );
};
