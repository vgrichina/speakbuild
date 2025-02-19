import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Square, Mic, MicOff } from 'lucide-react-native';

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
    isRecording,
    isProcessing,
    onStartRecording,
    onStopRecording,
    onStopProcessing
}) => {
    const [isPressed, setIsPressed] = useState(false);

    const handlePress = useCallback(() => {
        if (isProcessing) {
            onStopProcessing();
        } else if (isRecording) {
            onStopRecording();
        } else {
            onStartRecording();
        }
    }, [isProcessing, isRecording, onStartRecording, onStopRecording, onStopProcessing]);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {isRecording && <PulsatingCircle isActive={true} volume={volume} />}
            <Pressable
                onPress={handlePress}
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
                        backgroundColor: isProcessing ? '#EF4444' : (isRecording ? '#EF4444' : '#3B82F6'),
                        transform: [{ scale: isPressed ? 0.95 : 1 }],
                    },
                    disabled && { opacity: 0.5 }
                ]}
            >
                {isProcessing ? (
                    <Square size={24} color="white" />
                ) : isRecording ? (
                    <MicOff size={32} color="white" />
                ) : (
                    <Mic size={32} color="white" />
                )}
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
