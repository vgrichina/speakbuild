import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Modal, SafeAreaView } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
  actionText: {
    color: '#fff',
    opacity: 0.8,
  },
  codeContainer: {
    padding: 16,
  },
  code: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 20,
  }
});

export function ViewCode({ isVisible, code, title = 'Source Code', onClose }) {
  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(code);
      // Could add toast/feedback here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={copyToClipboard}>
            <Text style={styles.actionText}>Copy</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={onClose}>
            <Text style={styles.actionText}>Close</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView style={styles.codeContainer}>
        <Text style={styles.code}>{code}</Text>
      </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
