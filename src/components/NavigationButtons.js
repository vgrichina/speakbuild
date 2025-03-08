import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAssistantState } from '../hooks/useAssistantState';
import { AssistantService } from '../services/assistantService';

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
    // Use our new non-React-context state
    const { 
        history,
        currentHistoryIndex,
        navigateBack,
        navigateForward,
        abortGeneration
    } = useAssistantState();

    return (
        <View style={styles.container}>
            <Pressable
                onPress={() => {
                    abortGeneration();
                    navigateBack();
                }}
                disabled={currentHistoryIndex <= 0}
                style={({ pressed }) => [
                    styles.navButton,
                    currentHistoryIndex <= 0 && styles.buttonDisabled,
                    pressed && styles.buttonPressed
                ]}
            >
                <Feather name="arrow-left" size={20} color={currentHistoryIndex <= 0 ? '#999' : '#666'} />
            </Pressable>
            
            <Pressable
                onPress={() => {
                    abortGeneration();
                    navigateForward();
                }}
                disabled={!history || currentHistoryIndex >= (history.length - 1)}
                style={({ pressed }) => [
                    styles.navButton,
                    !history || currentHistoryIndex >= (history.length - 1) && styles.buttonDisabled,
                    pressed && styles.buttonPressed
                ]}
            >
                <Feather name="arrow-right" size={20} color={!history || currentHistoryIndex >= (history.length - 1) ? '#999' : '#666'} />
            </Pressable>
        </View>
    );
};
