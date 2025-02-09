import React, { useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Square, MicOff, Mic, Loader2 } from 'lucide-react-native';

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

export const VoiceButton = ({ isListening, onClick, disabled, volume, isGenerating, onStopGeneration }) => {
    const [isPressed, setIsPressed] = useState(false);

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            {!isGenerating && <PulsatingCircle isActive={isListening} volume={volume} />}
            <Pressable
                onPress={isGenerating ? onStopGeneration : onClick}
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
                        backgroundColor: isGenerating ? '#EF4444' : (isListening ? '#EF4444' : '#3B82F6'),
                        transform: [{ scale: isPressed ? 0.95 : 1 }],
                    },
                    disabled && { opacity: 0.5 }
                ]}
            >
                {isGenerating ? 
                    <Square size={24} color="white" /> :
                    (isListening ? 
                        <MicOff size={32} color="white" /> : 
                        <Mic size={32} color="white" />
                    )
                }
            </Pressable>
            <Text style={{ 
                marginTop: 8,
                color: (isGenerating || isListening) ? '#EF4444' : '#666',
                fontSize: 12 
            }}>
                {isGenerating ? 'Stop generating' : (isListening ? 'Tap to stop' : 'Tap to speak')}
            </Text>
        </View>
    );
};
