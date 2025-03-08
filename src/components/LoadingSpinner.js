import React from 'react';
import { Animated, Easing } from 'react-native';
import { Feather } from '@expo/vector-icons';

// Extract LoadingSpinner to a separate, memoized component
export const LoadingSpinner = React.memo(() => {
    const spinValue = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(spinValue, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );
        
        animation.start();

        return () => {
            animation.stop();
            spinValue.setValue(0);
        };
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
            <Feather 
                name="loader" 
                size={16} 
                color="#666"
            />
        </Animated.View>
    );
});
