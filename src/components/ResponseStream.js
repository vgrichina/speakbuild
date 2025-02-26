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

/**
 * Displays streaming response during generation
 * @param {Object} props - Component props
 * @param {string} props.responseStream - Current response stream text
 * @param {string} props.status - Current generation status
 * @param {string} props.modificationIntent - Intent of the modification
 */
export const ResponseStream = ({
    responseStream,
    status,
    modificationIntent
}) => {
    const scrollViewRef = React.useRef(null);

    if (!responseStream && status !== 'GENERATING') return null;

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
                    {status === 'GENERATING' && <LoadingSpinner />}
                </View>
                <ScrollView 
                    style={{ minHeight: 100 }}
                    ref={scrollViewRef}
                    onContentSizeChange={() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }}
                >
                    <Text style={{ color: '#000' }}>{responseStream || ''}</Text>
                </ScrollView>
            </View>
        </View>
    );
};
