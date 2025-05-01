import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Feather } from '@expo/vector-icons';
import { conversationStorage } from '../services/conversationStorage';
import { componentHistoryService } from '../services/componentHistoryService';
import { useAssistantState } from '../hooks/useAssistantState';

// Import the constant directly since it's not exported
const HISTORY_CHANGE = 'historyChange';

export function ConversationList(props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const { activeConversationId, switchConversation, createNewConversation } = useAssistantState();

  useEffect(() => {
    loadConversations();
    
    // Subscribe to history changes to refresh the conversation list
    const unsubscribe = componentHistoryService.on(HISTORY_CHANGE, () => {
      loadConversations();
    });
    
    return () => {
      // Clean up subscription when component unmounts
      unsubscribe();
    };
  }, [activeConversationId]);

  const loadConversations = () => {
    const allConversations = conversationStorage.getAll();
    setConversations(allConversations);
  };

  const handleSelectConversation = (id) => {
    switchConversation(id);
    props.navigation.closeDrawer();
  };

  const handleCreateNew = () => {
    createNewConversation();
    loadConversations();
    props.navigation.closeDrawer();
  };

  const handleDeleteConversation = (id) => {
    conversationStorage.delete(id);
    loadConversations();
  };

  const filteredConversations = React.useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    return conversations.filter(conv => 
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
        <Text style={styles.conversationPreview} numberOfLines={2}>
          {item.previewText || item.title || "Empty conversation"}
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

  // Use a custom drawer content component without ScrollView
  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10
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
  conversationPreview: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    fontWeight: '400'
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
