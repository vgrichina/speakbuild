import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { LoadingSpinner } from './LoadingSpinner';

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

/**
 * Displays streaming response during generation
 * @param {Object} props - Component props
 * @param {string} props.responseStream - Current response stream text
 * @param {string} props.status - Current generation status
 * @param {string} props.modificationIntent - Intent of the modification
 */
export const ResponseStream = React.memo(({
    responseStream,
    status,
    modificationIntent
}) => {
    const scrollViewRef = React.useRef(null);
    const renderCount = React.useRef(0);
    
    // Add debug logging to track render performance
    React.useEffect(() => {
        renderCount.current += 1;
        console.log(`[ResponseStream] Rendered ${renderCount.current} times`);
    });

    // Memoize the scroll handler to prevent recreation on each render
    const handleContentSizeChange = React.useCallback(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
    }, []);

    if (!responseStream && status !== 'THINKING') return null;

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
                    {status === 'THINKING' && <LoadingSpinner />}
                </View>
                <ScrollView 
                    style={{ minHeight: 100 }}
                    ref={scrollViewRef}
                    onContentSizeChange={handleContentSizeChange}
                >
                    <Text style={{ color: '#000' }}>{responseStream || ''}</Text>
                </ScrollView>
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    // Only re-render when specific props change
    const textLengthDifference = 
        (prevProps.responseStream && nextProps.responseStream) 
            ? nextProps.responseStream.length - prevProps.responseStream.length 
            : 0;
            
    // Skip updates in these cases:
    // 1. Status hasn't changed
    // 2. Modification intent hasn't changed
    // 3. Text is exactly the same
    const shouldSkipUpdate = 
        prevProps.status === nextProps.status &&
        prevProps.modificationIntent === nextProps.modificationIntent &&
        prevProps.responseStream === nextProps.responseStream;
    
    console.log(`[ResponseStream] shouldSkipUpdate: ${shouldSkipUpdate}, textDiff: ${textLengthDifference}`);
    return shouldSkipUpdate;
});
