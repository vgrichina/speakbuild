import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useComponentHistory } from '../contexts/ComponentHistoryContext';
import { useAssistant } from '../contexts/AssistantContext';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    navButton: {
        padding: 8,
        borderRadius: 4,
        backgroundColor: '#f5f5f5',
        marginHorizontal: 2,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonPressed: {
        backgroundColor: '#e5e5e5',
    },
});

export const NavigationButtons = () => {
    const { 
        currentIndex: currentHistoryIndex,
        history: componentHistory,
        setCurrentIndex
    } = useComponentHistory();
    
    const { abortGeneration } = useAssistant();

    return (
        <View style={styles.container}>
            <Pressable
                onPress={() => {
                    abortGeneration();
                    setCurrentIndex(currentHistoryIndex - 1);
                }}
                disabled={currentHistoryIndex <= 0}
                style={({ pressed }) => [
                    styles.navButton,
                    currentHistoryIndex <= 0 && styles.buttonDisabled,
                    pressed && styles.buttonPressed
                ]}
            >
                <ArrowLeft size={20} color={currentHistoryIndex <= 0 ? '#999' : '#666'} />
            </Pressable>
            
            <Pressable
                onPress={() => {
                    abortGeneration();
                    setCurrentIndex(currentHistoryIndex + 1);
                }}
                disabled={currentHistoryIndex >= componentHistory.length - 1}
                style={({ pressed }) => [
                    styles.navButton,
                    currentHistoryIndex >= componentHistory.length - 1 && styles.buttonDisabled,
                    pressed && styles.buttonPressed
                ]}
            >
                <ArrowRight size={20} color={currentHistoryIndex >= componentHistory.length - 1 ? '#999' : '#666'} />
            </Pressable>
        </View>
    );
};
