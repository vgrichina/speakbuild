import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Animated } from 'react-native';
import { MoreVertical } from 'lucide-react-native';

const styles = StyleSheet.create({
    menuTrigger: {
        padding: 8,
        marginRight: 4,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    menuContent: {
        position: 'absolute',
        backgroundColor: 'white',
        borderRadius: 8,
        minWidth: 180,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    menuItem: {
        padding: 12,
        borderRadius: 4,
    },
    menuItemText: {
        color: '#666',
        fontSize: 14,
    },
    menuItemDanger: {
        color: '#EF4444',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 8,
    }
});

export const DebugMenuButton = ({ 
    onViewSource,
    onDebugGeneration,
    onClearHistory,
    currentHistoryEntry,
    showSourceCode
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
    const buttonRef = useRef();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const handleSelect = (action) => {
        closeMenu();
        action();
    };

    const openMenu = () => {
        buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
            setMenuPosition({
                top: pageY + height,
                right: 8
            });
            setIsOpen(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        });
    };

    const closeMenu = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setIsOpen(false);
        });
    };

    return (
        <>
            <Pressable 
                ref={buttonRef}
                style={styles.menuTrigger}
                onPress={openMenu}
            >
                <MoreVertical size={24} color="#666" />
            </Pressable>

            <Modal
                visible={isOpen}
                transparent={true}
                animationType="none"
                onRequestClose={closeMenu}
            >
                <Animated.View 
                    style={[
                        styles.overlay,
                        { opacity: fadeAnim }
                    ]}
                >
                    <Pressable 
                        style={StyleSheet.absoluteFill}
                        onPress={closeMenu}
                    />
                    <Animated.View 
                        style={[
                            styles.menuContent,
                            menuPosition,
                            {
                                opacity: fadeAnim,
                                transform: [{
                                    translateY: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-8, 0]
                                    })
                                }]
                            }
                        ]}
                    >
                        <Pressable
                            style={styles.menuItem}
                            disabled={!currentHistoryEntry?.code}
                            onPress={() => handleSelect(onViewSource)}
                        >
                            <Text style={[
                                styles.menuItemText,
                                !currentHistoryEntry?.code && { opacity: 0.5 }
                            ]}>
                                {showSourceCode ? 'Hide source' : 'View source'}
                            </Text>
                        </Pressable>

                        <View style={styles.divider} />

                        <Pressable
                            style={styles.menuItem}
                            onPress={() => handleSelect(onDebugGeneration)}
                        >
                            <Text style={styles.menuItemText}>
                                Component Generation
                            </Text>
                        </Pressable>

                        <View style={styles.divider} />

                        <Pressable
                            style={styles.menuItem}
                            onPress={() => handleSelect(onClearHistory)}
                        >
                            <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                                Clear storage
                            </Text>
                        </Pressable>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </>
    );
};
