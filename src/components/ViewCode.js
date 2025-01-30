import React from 'react';
import { View, Text, ScrollView, Pressable, Platform, Modal, SafeAreaView } from 'react-native';

export const ViewCode = ({ isVisible, onClose, code }) => {
    return (
        <Modal
            visible={isVisible}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="fullScreen"
        >
            <SafeAreaView style={{
                flex: 1,
                backgroundColor: '#F9FAFB',
            }}>
            <View style={{
                padding: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: '#E5E7EB',
                backgroundColor: 'white',
            }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Source Code</Text>
                <Pressable
                    onPress={onClose}
                    style={{
                        padding: 8,
                        marginRight: -8,
                    }}
                >
                    <Text style={{ fontSize: 24, color: '#666' }}>×</Text>
                </Pressable>
            </View>
            <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
            >
                <Text style={{ 
                    fontFamily: Platform.select({
                        ios: 'Menlo',
                        android: 'monospace',
                        default: 'monospace'
                    }),
                    fontSize: 14,
                    lineHeight: 20,
                }}>{code}</Text>
            </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};
