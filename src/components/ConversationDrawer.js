import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useComponentHistory } from '../contexts/ComponentHistoryContext';
import { conversationStorage } from '../services/conversationStorage';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ConversationDrawer = ({ isOpen, onClose }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const { activeConversationId, switchConversation, createNewConversation } = useComponentHistory();
  const drawerAnimation = useState(new Animated.Value(isOpen ? 0 : -300))[0];
  
  // Load conversations
  React.useEffect(() => {
    if (isOpen) {
      loadConversations();
      animateDrawer(0);
    } else {
      animateDrawer(-300);
    }
  }, [isOpen]);
  
  const loadConversations = useCallback(() => {
    const allConversations = conversationStorage.getAll();
    setConversations(allConversations);
  }, []);
  
  const animateDrawer = (toValue) => {
    Animated.timing(drawerAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true
    }).start();
  };
  
  const handleCreateNew = () => {
    createNewConversation();
    loadConversations();
    onClose();
  };
  
  const handleSelectConversation = (id) => {
    switchConversation(id);
    onClose();
  };
  
  const handleDeleteConversation = (id) => {
    conversationStorage.delete(id);
    loadConversations();
  };
  
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.previewText.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);
  
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.conversationItem, 
        activeConversationId === item.id && styles.activeConversation
      ]}
      onPress={() => handleSelectConversation(item.id)}
    >
      <View style={styles.conversationContent}>
        <Text style={styles.conversationTitle}>{item.title}</Text>
        <Text style={styles.conversationPreview} numberOfLines={1}>
          {item.previewText || "Empty conversation"}
        </Text>
        <Text style={styles.conversationDate}>
          {new Date(item.updatedAt).toLocaleString()}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeleteConversation(item.id)}
      >
        <Feather name="trash-2" size={18} color="#ff6b6b" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
  
  return (
    <>
      {isOpen && (
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={onClose} 
        />
      )}
      
      <Animated.View 
        style={[
          styles.drawer, 
          { paddingTop: insets.top, transform: [{ translateX: drawerAnimation }] }
        ]}
      >
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity style={styles.newButton} onPress={handleCreateNew}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.newButtonText}>New Conversation</Text>
        </TouchableOpacity>
        
        <FlatList
          data={filteredConversations}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {searchQuery ? "No matching conversations" : "No conversations yet"}
            </Text>
          }
        />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#fff',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8
  },
  newButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f8f8'
  },
  activeConversation: {
    backgroundColor: '#e6f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF'
  },
  conversationContent: {
    flex: 1
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4
  },
  conversationPreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  conversationDate: {
    fontSize: 12,
    color: '#999'
  },
  deleteButton: {
    justifyContent: 'center',
    padding: 8
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 16
  }
});
