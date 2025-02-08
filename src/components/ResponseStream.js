import React from 'react';
import { View, Text, ScrollView, Animated, Easing } from 'react-native';
import { Loader2 } from 'lucide-react-native';

const styles = {
    transcriptionBox: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 8,
        marginVertical: 8,
    },
    heading: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    }
};

const LoadingSpinner = () => {
    const spinValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        return () => spinValue.setValue(0);
    }, []);

    return (
        <Animated.View
            style={{
                marginLeft: 8,
                transform: [{
                    rotate: spinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                    })
                }]
            }}
        >
            <Loader2 
                size={16} 
                color="#666"
            />
        </Animated.View>
    );
};

export const ResponseStream = ({
    responseStream,
    isProcessing,
    modificationIntent
}) => {
    console.log('ResponseStream', { responseStream, isProcessing, modificationIntent });
    const scrollViewRef = React.useRef(null);

    if (!responseStream && !isProcessing) return null;

    console.log('rendering', { responseStream });

    return (
        <View style={[
            styles.transcriptionBox, 
            { 
                backgroundColor: '#EBF8FF',
                flex: 1,
                marginBottom: 16
            }
        ]}>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.heading}>
                        {modificationIntent === 'modify' ? 'Modifying Component:' : 
                         modificationIntent === 'new' ? 'Creating New Component:' : 
                         'Response:'}
                    </Text>
                    {isProcessing && <LoadingSpinner />}
                </View>
                <View style={{ minHeight: 100 }}>
                    <Text>DEBUG: Start of content</Text>
                    <Text style={{ color: '#000' }}>{responseStream || 'No content'}</Text>
                    <Text>DEBUG: End of content</Text>
                </View>
            </View>
        </View>
    );
};
