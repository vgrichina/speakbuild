import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    debugMenu: {
        position: 'absolute',
        right: 8,
        top: 48,
        backgroundColor: 'white',
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        minWidth: 150,
        zIndex: 1002,
    },
    menuItem: {
        padding: 12,
        borderRadius: 4,
    },
    menuItemText: {
        color: '#666',
        fontSize: 14,
    }
});

export const DebugMenuButton = ({ 
    onViewSource,
    onDebugGeneration,
    onClearHistory,
    currentComponent,
    showSourceCode
}) => {
    const [showMenu, setShowMenu] = useState(false);
    
    return (
        <View style={{ overflow: 'visible' }}>
            <Pressable
                onPress={() => setShowMenu(!showMenu)}
                style={{
                    padding: 12,
                    marginRight: -8,
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                <Text style={{ color: '#666', fontSize: 24, lineHeight: 24, height: 32, textAlignVertical: 'center' }}>⋮</Text>
            </Pressable>
            {showMenu && (
                <View style={styles.debugMenu}>
                    <Pressable
                        style={[
                            styles.menuItem,
                            !currentComponent && { opacity: 0.5 }
                        ]}
                        onPress={() => {
                            if (!currentComponent) return;
                            onViewSource();
                            setShowMenu(false);
                        }}
                    >
                        <Text style={[
                            styles.menuItemText,
                            !currentComponent && { color: '#999' }
                        ]}>
                            {showSourceCode ? 'Hide source' : 'View source'}
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                        onPress={() => {
                            onDebugGeneration();
                            setShowMenu(false);
                        }}
                    >
                        <Text style={styles.menuItemText}>
                            Component Generation
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                        onPress={() => {
                            onClearHistory();
                            setShowMenu(false);
                        }}
                    >
                        <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                            Clear storage
                        </Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
};
