import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11
    }).start();
  }, [isVisible]);

  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(code);
      // Could add toast/feedback here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[
      styles.container,
      {
        transform: [{
          translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [300, 0]
          })
        }]
      }
    ]}>
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
    </Animated.View>
  );
}
