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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#DC2626',
    fontSize: 16,
    marginBottom: 12,
  },
  stackTrace: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#374151',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  }
});

export function ErrorDetails({ isVisible, error, onClose }) {
  const copyErrorDetails = async () => {
    try {
      const errorText = `Error: ${error.message}\n\nStack Trace:\n${error.stack}`;
      await Clipboard.setStringAsync(errorText);
    } catch (e) {
      console.error('Failed to copy error details:', e);
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
          <Text style={styles.title}>Error Details</Text>
          <View style={styles.actions}>
            <Pressable style={styles.button} onPress={copyErrorDetails}>
              <Text style={styles.buttonText}>Copy</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error Message</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stack Trace</Text>
            <Text style={styles.stackTrace}>{error.stack}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
