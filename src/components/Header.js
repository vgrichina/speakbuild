import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Settings, ArrowLeft, ArrowRight } from 'lucide-react-native';

const styles = {
    compactHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        height: 56,
        overflow: 'visible',
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
};

export const Header = ({ 
    currentComponent,
    currentHistoryIndex,
    componentHistory,
    onNavigateBack,
    onNavigateForward,
    onOpenSettings,
    onClearHistory,
    onDebugGeneration,
    onToggleSourceCode,
    showSourceCode,
    stopGeneration
}) => {
    const [showDebugMenu, setShowDebugMenu] = useState(false);
    
    return (
        <View style={styles.compactHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                    onPress={onOpenSettings}
                    style={{
                        padding: 12,
                        marginLeft: -8,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}
                >
                    <Settings size={24} color="#666" />
                </Pressable>

                {currentComponent && (
                    <View style={{ flexDirection: 'row', marginLeft: 8 }}>
                        <Pressable
                            onPress={() => {
                                stopGeneration();
                                onNavigateBack();
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
                                stopGeneration();
                                onNavigateForward();
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
                )}
            </View>

            {currentComponent && (
                <View style={{ overflow: 'visible' }}>
                    <Pressable
                        onPress={() => setShowDebugMenu(!showDebugMenu)}
                        style={{
                            padding: 12,
                            marginRight: -8,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: '#666', fontSize: 24, lineHeight: 24, height: 32, textAlignVertical: 'center' }}>⋮</Text>
                    </Pressable>
                    {showDebugMenu && (
                        <View style={styles.debugMenu}>
                            <Pressable
                                style={styles.menuItem}
                                onPress={() => {
                                    onToggleSourceCode();
                                    setShowDebugMenu(false);
                                }}
                            >
                                <Text style={styles.menuItemText}>
                                    {showSourceCode ? 'Hide source' : 'View source'}
                                </Text>
                            </Pressable>
                            <Pressable
                                style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                                onPress={() => {
                                    onDebugGeneration();
                                    setShowDebugMenu(false);
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
                                    setShowDebugMenu(false);
                                }}
                            >
                                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                                    Clear storage
                                </Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};
