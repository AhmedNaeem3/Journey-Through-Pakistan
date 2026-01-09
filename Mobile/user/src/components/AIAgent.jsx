import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { generateGeminiContent } from '../services/geminiApi';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AIAgent = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation();
  // Use navigation state to get current route instead of useRoute()
  const navigationState = useNavigationState((state) => state);
  const styles = getStyles(theme);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Helper function to get current route name from navigation state
  const getCurrentRouteName = (state) => {
    if (!state || typeof state.index !== 'number') {
      return 'Home';
    }
    const route = state.routes[state.index];
    if (route.state) {
      return getCurrentRouteName(route.state);
    }
    return route.name;
  };

  // Get current page context
  const getPageContext = () => {
    const routeName = navigationState ? getCurrentRouteName(navigationState) : 'Home';
    const pageInfo = {
      Home: 'Home - Main page showing overview and recommendations',
      Landmark: 'Landmark Identification - Upload images to identify landmarks in Pakistan',
      LandmarkResult: 'Landmark Result - View detailed information about identified landmarks',
      Community: 'Community - Connect with other travelers, share posts and experiences',
      Chat: 'Chats - Direct messaging with other users',
      Profile: 'Profile - View and edit your profile information',
      Recommendations: 'Recommendations - Personalized travel recommendations',
      SavedLandmarks: 'Saved Landmarks - View your saved landmarks',
    };
    return pageInfo[routeName] || `Currently on page: ${routeName}`;
  };

  // Load chat history from AsyncStorage
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const savedMessages = await AsyncStorage.getItem('chatbot_history');
        if (savedMessages) {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed);
        } else {
          // Initialize with welcome message
          const welcomeMessage = {
            id: Date.now(),
            text: "Hello! I'm your AI assistant for Journey Through Pakistan. I can help you with:\n\n• Information about any page or feature\n• Answer questions about landmarks and places\n• Help with navigation and usage\n• Escalate issues to admin team if needed\n\nHow can I help you today?",
            sender: 'bot',
            timestamp: new Date().toISOString(),
          };
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        // Initialize with welcome message on error
        const welcomeMessage = {
          id: Date.now(),
          text: "Hello! I'm your AI assistant. How can I help you today?",
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
      }
    };

    if (user) {
      loadChatHistory();
    }
  }, [user]);

  // Save messages to AsyncStorage
  useEffect(() => {
    const saveChatHistory = async () => {
      if (messages.length > 0) {
        try {
          await AsyncStorage.setItem('chatbot_history', JSON.stringify(messages));
        } catch (error) {
          console.error('Error saving chat history:', error);
        }
      }
    };

    saveChatHistory();
  }, [messages]);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Format message text - handle bold markdown
  const formatMessageText = (text) => {
    if (!text) return '';

    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      const trimmedLine = line.trim();

      // Check if entire line is bold (heading)
      const headingMatch = trimmedLine.match(/^\*\*(.+?)\*\*[:：]?\s*$/);
      if (headingMatch) {
        return (
          <React.Fragment key={lineIndex}>
            <Text style={styles.messageHeading}>{headingMatch[1]}</Text>
            {lineIndex < lines.length - 1 && <Text>{'\n'}</Text>}
          </React.Fragment>
        );
      }

      // Check for inline bold text (**text**)
      const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/g);
      if (parts.length > 1) {
        return (
          <React.Fragment key={lineIndex}>
            {parts.map((part, partIndex) => {
              const boldMatch = part.match(/\*\*(.+?)\*\*/);
              if (boldMatch) {
                return (
                  <Text key={partIndex} style={styles.messageBold}>
                    {boldMatch[1]}
                  </Text>
                );
              }
              return <Text key={partIndex}>{part}</Text>;
            })}
            {lineIndex < lines.length - 1 && <Text>{'\n'}</Text>}
          </React.Fragment>
        );
      }

      // Regular line
      if (trimmedLine) {
        return (
          <React.Fragment key={lineIndex}>
            <Text>{trimmedLine}</Text>
            {lineIndex < lines.length - 1 && <Text>{'\n'}</Text>}
          </React.Fragment>
        );
      }

      // Empty line
      return <React.Fragment key={lineIndex}><Text>{'\n'}</Text></React.Fragment>;
    });
  };

  // Build context-aware prompt
  const buildPrompt = (userMessage) => {
    const pageContext = getPageContext();
    const userName = user?.name || 'User';

    return `You are a helpful AI assistant for "Journey Through Pakistan" - a travel and tourism mobile application. 

Current Context:
- User: ${userName}
- Current Page: ${pageContext}
- Application Features: Landmark identification, Community posts, Chat messaging, Profile management, Search functionality, Notifications, Settings, Personalized recommendations

Your role:
1. Help users understand how to use the application
2. Provide information about features and pages
3. Answer questions about landmarks and places in Pakistan
4. Assist with navigation and troubleshooting
5. If a user has a serious issue or complaint, suggest escalating to the admin team

User's question: ${userMessage}

Provide a helpful, concise, and friendly response. If the issue seems complex or requires admin attention, mention that you can escalate it to the admin team.`;
  };

  // Check if message needs escalation
  const needsEscalation = (message) => {
    const escalationKeywords = [
      'complaint',
      'problem',
      'issue',
      'error',
      'bug',
      'broken',
      'not working',
      'help',
      'urgent',
      'critical',
      'admin',
      'support',
      'technical',
      'fix',
    ];
    const lowerMessage = message.toLowerCase();
    return escalationKeywords.some((keyword) => lowerMessage.includes(keyword));
  };

  // Send message to Gemini
  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const prompt = buildPrompt(messageText);
      const response = await generateGeminiContent(prompt, 'gemini-2.5-flash-lite', 0.7);

      if (response.data.success && response.data.content) {
        const botMessage = {
          id: Date.now() + 1,
          text: response.data.content,
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, botMessage]);

        // Check if escalation is needed
        if (needsEscalation(messageText) && !escalating) {
          setTimeout(() => {
            const escalationMessage = {
              id: Date.now() + 2,
              text: "I noticed you mentioned an issue. Would you like me to escalate this to our admin team? They can provide more detailed assistance.",
              sender: 'bot',
              timestamp: new Date().toISOString(),
              showEscalationButton: true,
            };
            setMessages((prev) => [...prev, escalationMessage]);
          }, 1000);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  // Escalate to admin
  const escalateToAdmin = async (issueText) => {
    setEscalating(true);

    try {
      const response = await api.post('/support/escalate', {
        userId: user?._id || user?.id,
        userName: user?.name || 'Unknown User',
        userEmail: user?.email || 'No email',
        issue: issueText,
        currentPage: navigationState ? getCurrentRouteName(navigationState) : 'Unknown',
        timestamp: new Date().toISOString(),
      });

      if (response.data.success) {
        const escalationMessage = {
          id: Date.now(),
          text: "✅ Your issue has been escalated to our admin team. They will review it and get back to you soon. You'll receive a notification when they respond.",
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, escalationMessage]);
        Alert.alert('Success', 'Issue escalated to admin team successfully!');
      } else {
        throw new Error('Escalation failed');
      }
    } catch (error) {
      console.error('Error escalating to admin:', error);
      const errorMessage = {
        id: Date.now(),
        text: "I'm sorry, I couldn't escalate your issue right now. Please try again later or contact support directly.",
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      Alert.alert('Error', 'Failed to escalate issue. Please try again.');
    } finally {
      setEscalating(false);
    }
  };

  // Handle form submit
  const handleSubmit = () => {
    if (inputMessage.trim() && !isTyping) {
      sendMessage(inputMessage);
    }
  };

  // Quick action buttons
  const quickActions = [
    {
      text: 'How to identify landmarks?',
      action: () => sendMessage('How do I identify landmarks?'),
    },
    {
      text: 'Tell me about this page',
      action: () => sendMessage(`Tell me about ${getPageContext()}`),
    },
    {
      text: 'Report an issue',
      action: () => sendMessage('I have an issue that needs admin attention'),
    },
  ];

  // Clear chat history
  const clearChat = () => {
    Alert.alert(
      'Clear Chat History',
      'Are you sure you want to clear chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('chatbot_history');
              const welcomeMessage = {
                id: Date.now(),
                text: "Hello! I'm your AI assistant. How can I help you today?",
                sender: 'bot',
                timestamp: new Date().toISOString(),
              };
              setMessages([welcomeMessage]);
              Alert.alert('Success', 'Chat history cleared');
            } catch (error) {
              console.error('Error clearing chat:', error);
              Alert.alert('Error', 'Failed to clear chat history');
            }
          },
        },
      ]
    );
  };

  if (!user) return null; // Don't show chatbot for non-authenticated users

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.8}
        >
          <Icon name="chat" size={24} color="#fff" />
          <View style={styles.chatButtonBadge}>
            <Text style={styles.chatButtonBadgeText}>AI</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Chat Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Icon name="chat" size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.headerTitle}>AI Assistant</Text>
                  <Text style={styles.headerSubtitle}>Journey Through Pakistan</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Messages Area */}
            <ScrollView
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              ref={messagesEndRef}
              onContentSizeChange={scrollToBottom}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.message,
                    message.sender === 'user' ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  {message.sender === 'bot' && (
                    <View style={styles.messageAvatar}>
                      <Icon name="smart-toy" size={16} color={theme.colors.primary} />
                    </View>
                  )}
                  <View style={styles.messageContent}>
                    <View
                      style={[
                        styles.messageBubble,
                        message.sender === 'user'
                          ? styles.userBubble
                          : styles.botBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          message.sender === 'user'
                            ? styles.userMessageText
                            : styles.botMessageText,
                        ]}
                      >
                        {message.sender === 'bot'
                          ? formatMessageText(message.text)
                          : message.text}
                      </Text>
                      {message.showEscalationButton && (
                        <TouchableOpacity
                          style={styles.escalateButton}
                          onPress={() => {
                            const issueText =
                              messages[messages.length - 2]?.text || '';
                            escalateToAdmin(issueText);
                          }}
                          disabled={escalating}
                        >
                          <Icon
                            name="warning"
                            size={16}
                            color={theme.colors.warning || '#FF9800'}
                          />
                          <Text style={styles.escalateButtonText}>
                            {escalating ? 'Escalating...' : 'Escalate to Admin'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.messageTime}>
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              ))}

              {isTyping && (
                <View style={[styles.message, styles.botMessage]}>
                  <View style={styles.messageAvatar}>
                    <Icon name="smart-toy" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={styles.messageContent}>
                    <View style={[styles.messageBubble, styles.botBubble]}>
                      <View style={styles.typingIndicator}>
                        <View style={styles.typingDot} />
                        <View style={styles.typingDot} />
                        <View style={styles.typingDot} />
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <View ref={messagesEndRef} />
            </ScrollView>

            {/* Quick Actions */}
            {messages.length <= 2 && (
              <View style={styles.quickActions}>
                {quickActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickActionButton}
                    onPress={action.action}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickActionText}>{action.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Input Area */}
            <View style={styles.inputArea}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Type your message..."
                placeholderTextColor={theme.colors.textSecondary}
                value={inputMessage}
                onChangeText={setInputMessage}
                onSubmitEditing={handleSubmit}
                editable={!isTyping && !escalating}
                multiline={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputMessage.trim() || isTyping || escalating) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!inputMessage.trim() || isTyping || escalating}
                activeOpacity={0.7}
              >
                {isTyping ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Footer Actions */}
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearChat}
                activeOpacity={0.7}
              >
                <Text style={styles.clearButtonText}>Clear History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    chatButton: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      zIndex: 1000,
    },
    chatButtonBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: theme.colors.warning || '#FF9800',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chatButtonBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: '90%',
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border || theme.colors.inputBackground,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    closeButton: {
      padding: 4,
    },
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      padding: 16,
      paddingBottom: 20,
    },
    message: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 8,
    },
    userMessage: {
      justifyContent: 'flex-end',
    },
    botMessage: {
      justifyContent: 'flex-start',
    },
    messageAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    messageContent: {
      flex: 1,
      maxWidth: '80%',
    },
    messageBubble: {
      padding: 12,
      borderRadius: 16,
    },
    userBubble: {
      backgroundColor: theme.colors.primary,
      alignSelf: 'flex-end',
    },
    botBubble: {
      backgroundColor: theme.colors.surface,
      alignSelf: 'flex-start',
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    userMessageText: {
      color: '#fff',
    },
    botMessageText: {
      color: theme.colors.text,
    },
    messageHeading: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    messageBold: {
      fontWeight: '700',
      color: theme.colors.text,
    },
    messageTime: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    typingIndicator: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      paddingVertical: 4,
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.textSecondary,
    },
    escalateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      padding: 8,
      backgroundColor: theme.colors.warning + '20' || '#FF980020',
      borderRadius: 8,
    },
    escalateButtonText: {
      fontSize: 13,
      color: theme.colors.warning || '#FF9800',
      fontWeight: '600',
    },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      padding: 16,
      paddingTop: 0,
    },
    quickActionButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    quickActionText: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border || theme.colors.inputBackground,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.inputBackground,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.colors.text,
      maxHeight: 100,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    footerActions: {
      padding: 16,
      paddingTop: 0,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border || theme.colors.inputBackground,
    },
    clearButton: {
      alignSelf: 'center',
      paddingVertical: 8,
    },
    clearButtonText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
  });

export default AIAgent;

