import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
  Clipboard,
  PermissionsAndroid,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { getConversations, getMessages, getOrCreateConversation, markMessagesAsRead, getUnreadCount, uploadChatImage, deleteConversation, deleteMultipleConversations } from '../services/messageApi';
import { launchImageLibrary } from 'react-native-image-picker';
import EmojiPicker from 'rn-emoji-keyboard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CallScreen from '../components/CallScreen';
import RNFS from 'react-native-fs';
import BottomNavigation from '../components/BottomNavigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ChatScreen = () => {
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [showCallScreen, setShowCallScreen] = useState(false);
  const [callType, setCallType] = useState('voice'); // 'voice' or 'video'
  const [isOutgoingCall, setIsOutgoingCall] = useState(true);
  const [currentCaller, setCurrentCaller] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [selectedChats, setSelectedChats] = useState([]);
  const [isSelectingChats, setIsSelectingChats] = useState(false);
  
  const { socket, isConnected: socketConnected, onlineUsers } = useSocket();
  const { user } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Create dynamic styles based on theme
  const styles = createStyles(theme);

  useEffect(() => {
    setIsConnected(socketConnected);
  }, [socketConnected]);

  // Handle socket connection status
  useEffect(() => {
    if (socket && socketConnected) {
      // Join user room
      socket.emit('join-user-room', user._id);
    }
  }, [socket, socketConnected, user]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await getConversations();
      setChatList(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId) => {
    try {
      setMessagesLoading(true);
      const response = await getMessages(conversationId);
      
      // Format messages with proper type (sent/received)
      const formattedMessages = response.data.map(msg => ({
        ...msg,
        id: msg._id || msg.id,
        type: (msg.sender?._id?.toString() || msg.senderId?.toString()) === user._id?.toString() 
          ? 'sent' 
          : 'received',
        time: msg.createdAt 
          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      setMessages(formattedMessages);
      
      // Mark messages as read
      await markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Handle selecting a chat
  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    const convId = chat.conversationId || chat._id;
    setCurrentConversationId(convId);
    
    if (convId) {
      await fetchMessages(convId);
    }
  };

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return chatList;
    
    const query = searchQuery.toLowerCase();
    
    return chatList.filter(chat => {
      const otherParticipant = chat.participants?.find(p => 
        p._id?.toString() !== user._id?.toString()
      ) || chat.otherParticipant;
      
      return (
        (otherParticipant?.name || '').toLowerCase().includes(query) ||
        (chat.lastMessage || '').toLowerCase().includes(query) ||
        (chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase().includes(query) : false)
      );
    });
  }, [chatList, searchQuery]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!message.trim() && !imagePreview) return;
    if (!currentConversationId || !socket || !isConnected) return;
    
    // Check if socket is connected before sending
    if (!socket.connected) {
      console.error('Socket is not connected');
      return;
    }

    const tempMessageId = `temp_${Date.now()}`;
    const tempMessage = {
      id: tempMessageId,
      text: message,
      imageUrl: imagePreview,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'sent',
      sender: user,
      createdAt: new Date(),
      conversationId: currentConversationId,
      temporary: true,
      replyTo: replyToMessage ? {
        id: replyToMessage.id,
        text: replyToMessage.text,
        imageUrl: replyToMessage.imageUrl,
        senderName: replyToMessage.sender?.name || 'Unknown',
      } : null,
    };

    // Add temporary message to UI
    setMessages(prev => [...prev, tempMessage]);

    try {
      let messageData = {
        conversationId: currentConversationId,
        text: message,
        replyTo: replyToMessage ? {
          id: replyToMessage.id,
          text: replyToMessage.text,
          imageUrl: replyToMessage.imageUrl,
          senderName: replyToMessage.sender?.name || 'Unknown',
        } : null,
      };
      
      // If there's an image to upload, we need to upload it first
      if (imagePreview) {
        const formData = new FormData();
        // Handle different image URI formats for React Native
        let imageUri = imagePreview;
        
        // Remove file:// prefix if present
        if (imagePreview.startsWith('file://')) {
          imageUri = imagePreview.replace('file://', '');
        }
        
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'chat_image.jpg',
        });
        
        const uploadResponse = await uploadChatImage(formData);
        if (uploadResponse && uploadResponse.data && uploadResponse.data.imageUrl) {
          messageData.imageUrl = uploadResponse.data.imageUrl;
        }
      }
      
      const recipient = selectedChat.participants?.find(p => 
        p._id?.toString() !== user._id?.toString()
      );
    
    if (!recipient?._id) {
      console.error('No recipient found for conversation');
      // Remove temporary message
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      return;
    }
    
    // Emit message to server
    socket.emit('send-message', {
      ...messageData,
      recipientId: recipient._id
    });

      // Clear input and reply
      setMessage('');
      setImagePreview(null);
      setShowEmojiPicker(false);
      setReplyToMessage(null);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temporary message if failed
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || !isConnected || !currentConversationId || !selectedChat) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Emit typing indicator (only if user is typing)
    if (message.trim().length === 0) {
      // If message is empty, stop typing
      socket.emit('stop-typing', { conversationId: currentConversationId });
      return;
    }

    const recipient = selectedChat.participants?.find(p => 
      p._id?.toString() !== user._id?.toString()
    );
    
    if (recipient?._id) {
      socket.emit('typing', {
        conversationId: currentConversationId,
        recipientId: recipient._id
      });
    }

    // Stop typing after 2 seconds of inactivity (WhatsApp-like behavior)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { conversationId: currentConversationId });
    }, 2000);
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  // Socket event listeners for messages and typing
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    const handleNewMessage = (newMessage) => {
      console.log('New message received:', newMessage);
      
      if (!newMessage) return;
      
      // Normalize conversationId for comparison
      const messageConvId = newMessage.conversationId?.toString();
      const currentConvId = currentConversationId?.toString();
      
      // Check if message is for current conversation
      if (messageConvId && currentConvId && messageConvId === currentConvId) {
        const messageId = (newMessage._id || newMessage.id)?.toString();
        
        // Check if message already exists (prevent duplicates)
        setMessages(prev => {
          const alreadyExists = prev.some(msg => 
            msg.id?.toString() === messageId || 
            msg._id?.toString() === messageId
          );
          
          if (alreadyExists) {
            console.log('Duplicate message detected, skipping:', messageId);
            // Just remove temporary messages
            return prev.filter(msg => !msg.temporary);
          }
          
          // Format message for display
          const formattedMessage = {
            id: messageId || `msg_${Date.now()}`,
            _id: messageId,
            text: newMessage.text || '',
            imageUrl: newMessage.imageUrl || null,
            time: newMessage.createdAt 
              ? new Date(newMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: (newMessage.sender?._id?.toString() || newMessage.sender?.id?.toString() || newMessage.senderId?.toString()) === (user?._id?.toString() || user?.id?.toString()) 
              ? 'sent' 
              : 'received',
            sender: newMessage.sender || {},
            createdAt: newMessage.createdAt || new Date(),
            conversationId: messageConvId
          };
          
          // Remove temporary messages and add real message
          const filtered = prev.filter(msg => !msg.temporary);
          return [...filtered, formattedMessage];
        });
      } else {
        // Message is for a different conversation
        // Update chat list with new message
        setChatList(prev => {
          return prev.map(chat => {
            if (chat.conversationId?.toString() === messageConvId) {
              return {
                ...chat,
                lastMessage: newMessage.text || 'Image',
                lastMessageAt: newMessage.createdAt || new Date(),
                unreadCount: (chat.unreadCount || 0) + 1
              };
            }
            return chat;
          });
        });
      }
    };

    // Listen for typing indicators
    const handleTyping = (data) => {
      if (data.conversationId === currentConversationId) {
        setTypingUsers({ [data.userId]: { name: data.userName, userId: data.userId } });
      }
    };

    // Listen for stop typing
    const handleStopTyping = (data) => {
      if (data.conversationId === currentConversationId) {
        setTypingUsers({});
      }
    };

    // Listen for message edited
    const handleMessageEdited = (data) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id?.toString() === data._id?.toString() ? { ...msg, text: data.text, edited: true } : msg
        )
      );
    };

    // Listen for message deleted
    const handleMessageDeleted = (data) => {
      setMessages(prev => 
        prev.filter(msg => msg.id?.toString() !== data._id?.toString())
      );
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);
    socket.on('message-edited', handleMessageEdited);
    socket.on('message-deleted', handleMessageDeleted);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
      socket.off('message-edited', handleMessageEdited);
      socket.off('message-deleted', handleMessageDeleted);
    };
  }, [socket, currentConversationId, user]);

  // Socket event listeners for calls (separate from messages, always active)
  useEffect(() => {
    if (!socket) return;

    // Listen for incoming call
    const handleIncomingCall = (data) => {
      console.log('📞 Incoming call received:', data);
      
      if (data.callType && data.caller) {
        console.log('Setting up incoming call screen...');
        setCurrentCaller(data.caller);
        setCallType(data.callType);
        setIsOutgoingCall(false);
        setShowCallScreen(true);
      }
    };

    // Listen for call ended
    const handleCallEnded = (data) => {
      console.log('Call ended by other user:', data);
      setShowCallScreen(false);
      setCurrentCaller(null);
      Alert.alert('Call Ended', 'The call has been ended');
    };

    // Listen for call rejected
    const handleCallRejected = (data) => {
      console.log('Call rejected by other user:', data);
      setShowCallScreen(false);
      setCurrentCaller(null);
      Alert.alert('Call Rejected', 'The call was rejected');
    };

    // Listen for call accepted
    const handleCallAccepted = (data) => {
      console.log('Call accepted by other user:', data);
      // You can add logic here to connect the call
    };

    console.log('📞 Setting up call event listeners...');
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-ended', handleCallEnded);
    socket.on('call-rejected', handleCallRejected);
    socket.on('call-accepted', handleCallAccepted);

    return () => {
      console.log('📞 Removing call event listeners...');
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-ended', handleCallEnded);
      socket.off('call-rejected', handleCallRejected);
      socket.off('call-accepted', handleCallAccepted);
    };
  }, [socket]);

  // Join conversation room when conversation is selected
  useEffect(() => {
    if (socket && currentConversationId) {
      socket.emit('join-conversation', currentConversationId);
    }

    return () => {
      if (socket && currentConversationId) {
        socket.emit('leave-conversation', currentConversationId);
      }
    };
  }, [socket, currentConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, []);



  // Render chat list item
  const renderChatItem = ({ item }) => {
    const otherParticipant = item.participants?.find(p => 
      p._id?.toString() !== user._id?.toString()
    ) || item.otherParticipant;
    
    const chatId = item._id?.toString() || item.conversationId?.toString();
    const isSelected = selectedChats.includes(chatId);
    
    return (
      <TouchableOpacity 
        style={[styles.chatItem, isSelectingChats && isSelected && styles.chatItemSelected]}
        onPress={isSelectingChats ? () => toggleChatSelection(chatId) : () => handleSelectChat(item)}
        onLongPress={() => {
          if (!isSelectingChats) {
            setIsSelectingChats(true);
            toggleChatSelection(chatId);
          }
        }}
        activeOpacity={0.7}
      >
        {isSelectingChats && (
          <View style={styles.chatSelectionIndicator}>
            <Icon 
              name={isSelected ? "check-circle" : "radio-button-unchecked"}
              size={24}
              color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>
        )}
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: otherParticipant?.profilePicture || 'https://via.placeholder.com/40' }} 
            style={styles.avatar}
          />
          {(item.otherParticipant?.isOnline || (onlineUsers && onlineUsers.has(item.otherParticipant?._id?.toString()))) && (
            <View style={styles.onlineIndicator} />
          )}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>
              {otherParticipant?.name || 'Unknown User'}
            </Text>
            {item.lastMessageAt && (
              <Text style={styles.chatTime}>
                {new Date(item.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <View style={styles.chatPreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
        {isSelectingChats && (
          <TouchableOpacity 
            style={styles.chatItemDeleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteChat(chatId);
            }}
          >
            <Icon name="delete" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Render chat skeleton loader
  const renderChatSkeleton = () => (
    <View style={styles.skeletonChatItem}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonChatInfo}>
        <View style={styles.skeletonChatName} />
        <View style={styles.skeletonLastMessage} />
      </View>
    </View>
  );

  // Render message skeleton loader
  const renderMessageSkeleton = (index) => (
    <View 
      key={`skeleton-${index}`}
      style={[
        styles.skeletonMessageContainer,
        index % 2 === 0 ? styles.skeletonMessageRight : styles.skeletonMessageLeft
      ]}
    >
      <View style={[
        styles.skeletonMessageBubble,
        index % 2 === 0 ? styles.skeletonBubbleRight : styles.skeletonBubbleLeft
      ]} />
    </View>
  );

  // Render message item
  const renderMessage = ({ item }) => {
    const isOwnMessage = item.type === 'sent';
    
    return (
      <View>
        {/* Reply context */}
        {item.replyTo && (
          <View style={[styles.replyContext, isOwnMessage ? styles.replyContextRight : styles.replyContextLeft]}>
            <View style={styles.replyBar} />
            <View style={styles.replyContent}>
              {item.replyTo.senderName && (
                <Text style={styles.replyName}>{item.replyTo.senderName}</Text>
              )}
              {item.replyTo.imageUrl && (
                <Text style={styles.replyText}>📷 Photo</Text>
              )}
              {item.replyTo.text && typeof item.replyTo.text === 'string' && item.replyTo.text.trim().length > 0 && (
                <Text style={styles.replyText} numberOfLines={1}>
                  {item.replyTo.text}
                </Text>
              )}
            </View>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.messageContainer, isOwnMessage ? styles.sentMessage : styles.receivedMessage]}
          onLongPress={() => handleMessageLongPress(item)}
          activeOpacity={0.7}
        >
          {!isOwnMessage && (
            <Image 
              source={{ uri: item.sender?.profilePicture || 'https://via.placeholder.com/30' }} 
              style={styles.messageAvatar}
            />
          )}
          <View style={[styles.messageBubble, isOwnMessage ? styles.sentBubble : styles.receivedBubble]}>
            {item.imageUrl && (
              <TouchableOpacity onPress={() => handleImagePress(item)}>
                <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
              </TouchableOpacity>
            )}
            {item.text && typeof item.text === 'string' && item.text.trim().length > 0 && (
              <Text style={[styles.messageText, isOwnMessage ? styles.sentText : styles.receivedText]}>
                {item.text}
              </Text>
            )}
            {item.time && (
              <Text style={[styles.messageTime, isOwnMessage ? styles.sentTime : styles.receivedTime]}>
                {item.time}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Handle image selection
  const handleImageSelect = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.error) {
        console.log('Image picker cancelled or error:', response.error);
        return;
      }

      if (response.assets && response.assets[0]) {
        const selectedImage = response.assets[0];
        setImagePreview(selectedImage.uri);
        setMessage(prev => prev + ' [Image attached]');
      }
    });
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setMessage(prev => prev + emoji);
  };

  // Handle message long press
  const handleMessageLongPress = (msg) => {
    setSelectedMessage(msg);
    setShowMessageOptions(true);
  };

  // Handle copy message
  const handleCopyMessage = () => {
    if (selectedMessage?.text) {
      Clipboard.setString(selectedMessage.text);
      setShowMessageOptions(false);
      Alert.alert('Copied', 'Message copied to clipboard');
    }
  };

  // Handle delete message
  const handleDeleteMessage = () => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Emit delete message event
            if (socket && selectedMessage) {
              socket.emit('delete-message', {
                messageId: selectedMessage.id,
                conversationId: currentConversationId
              });
            }
            setShowMessageOptions(false);
          }
        }
      ]
    );
  };

  // Handle clear chat
  const handleClearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            setShowChatOptions(false);
          }
        }
      ]
    );
  };

  // Toggle chat selection for bulk operations
  const toggleChatSelection = (chatId) => {
    setSelectedChats(prev => {
      if (prev.includes(chatId)) {
        return prev.filter(id => id !== chatId);
      } else {
        return [...prev, chatId];
      }
    });
  };

  // Toggle chat selection mode
  const toggleSelectMode = () => {
    if (isSelectingChats) {
      // Exit selection mode and clear selections
      setIsSelectingChats(false);
      setSelectedChats([]);
    } else {
      // Enter selection mode
      setIsSelectingChats(true);
    }
  };

  // Delete selected chats
  const handleDeleteSelectedChats = async () => {
    if (selectedChats.length === 0) return;
    
    Alert.alert(
      'Delete Chats',
      `Are you sure you want to delete ${selectedChats.length} chat${selectedChats.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call API to delete conversations from database
              await deleteMultipleConversations(selectedChats);
              
              // Remove selected chats from the chat list
              setChatList(prev => prev.filter(chat => 
                !selectedChats.includes(chat._id?.toString() || chat.conversationId?.toString())
              ));
              
              // Clear selections and exit selection mode
              setSelectedChats([]);
              setIsSelectingChats(false);
              
              Alert.alert('Success', `${selectedChats.length} chat${selectedChats.length > 1 ? 's' : ''} deleted successfully.`);
            } catch (error) {
              console.error('Error deleting chats:', error);
              Alert.alert('Error', 'Failed to delete chats from server. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Delete a single chat
  const handleDeleteChat = (chatId) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call API to delete conversation from database
              await deleteConversation(chatId);
              
              // Remove the chat from the chat list
              setChatList(prev => prev.filter(chat => 
                (chat._id?.toString() || chat.conversationId?.toString()) !== chatId
              ));
              
              Alert.alert('Success', 'Chat deleted successfully.');
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat from server. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Select all chats
  const selectAllChats = () => {
    setSelectedChats(chatList.map(chat => chat._id?.toString() || chat.conversationId?.toString()));
  };

  // Deselect all chats
  const deselectAllChats = () => {
    setSelectedChats([]);
  };

  // Handle block user
  const handleBlockUser = () => {
    const otherUser = selectedChat.participants?.find(p => 
      p._id?.toString() !== user._id?.toString()
    );
    
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${otherUser?.name || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            // Implement block logic here
            setShowChatOptions(false);
            Alert.alert('Blocked', `You have blocked ${otherUser?.name || 'this user'}`);
          }
        }
      ]
    );
  };

  // Handle voice call
  const handleVoiceCall = () => {
    const otherUser = selectedChat.participants?.find(p => 
      p._id?.toString() !== user._id?.toString()
    );
    
    if (!otherUser) {
      Alert.alert('Error', 'Unable to find user information');
      return;
    }

    setCurrentCaller(otherUser);
    setCallType('voice');
    setIsOutgoingCall(true);
    setShowCallScreen(true);

    // Emit call initiation through socket
    if (socket && socket.connected) {
      socket.emit('initiate-call', {
        callType: 'voice',
        recipientId: otherUser._id,
        conversationId: currentConversationId,
      });
    }

    console.log('Voice call initiated with:', otherUser.name);
  };

  // Handle video call
  const handleVideoCall = () => {
    const otherUser = selectedChat.participants?.find(p => 
      p._id?.toString() !== user._id?.toString()
    );
    
    if (!otherUser) {
      Alert.alert('Error', 'Unable to find user information');
      return;
    }

    setCurrentCaller(otherUser);
    setCallType('video');
    setIsOutgoingCall(true);
    setShowCallScreen(true);

    // Emit call initiation through socket
    if (socket && socket.connected) {
      socket.emit('initiate-call', {
        callType: 'video',
        recipientId: otherUser._id,
        conversationId: currentConversationId,
      });
    }

    console.log('Video call initiated with:', otherUser.name);
  };

  // Handle call end
  const handleEndCall = () => {
    setShowCallScreen(false);
    
    // Emit call end through socket
    if (socket && socket.connected && currentCaller) {
      socket.emit('end-call', {
        recipientId: currentCaller._id,
        conversationId: currentConversationId,
      });
    }

    setCurrentCaller(null);
  };

  // Handle call accept
  const handleAcceptCall = () => {
    if (socket && socket.connected && currentCaller) {
      socket.emit('accept-call', {
        recipientId: currentCaller._id,
        conversationId: currentConversationId,
      });
    }
  };

  // Handle call reject
  const handleRejectCall = () => {
    if (socket && socket.connected && currentCaller) {
      socket.emit('reject-call', {
        recipientId: currentCaller._id,
        conversationId: currentConversationId,
      });
    }
    setShowCallScreen(false);
    setCurrentCaller(null);
  };

  // Handle image press - open full screen viewer
  const handleImagePress = (message) => {
    setSelectedImage(message);
    setShowImageViewer(true);
  };

  // Handle download image
  const handleDownloadImage = async () => {
    if (!selectedImage?.imageUrl) return;

    try {
      // Request storage permission on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'App needs access to your storage to download images',
            buttonPositive: 'OK',
          }
        );
        
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Storage permission is required to download images');
          return;
        }
      }

      // Download image
      const fileUri = selectedImage.imageUrl;
      const fileName = `IMG_${Date.now()}.jpg`;
      const downloadDest = `${RNFS.DownloadDirectoryPath}/${fileName}`;

      const downloadResult = await RNFS.downloadFile({
        fromUrl: fileUri,
        toFile: downloadDest,
      }).promise;

      if (downloadResult.statusCode === 200) {
        // Scan file to make it visible in gallery
        if (Platform.OS === 'android') {
          await RNFS.scanFile(downloadDest);
        }
        Alert.alert('Success', `Image saved to Downloads folder`);
        setShowImageViewer(false);
      } else {
        Alert.alert('Error', 'Failed to download image');
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', `Failed to download image: ${error.message}`);
    }
  };

  // Handle forward image
  const handleForwardImage = () => {
    setMessageToForward(selectedImage);
    setShowImageViewer(false);
    setShowForwardModal(true);
  };

  // Handle forward message from long press
  const handleForwardMessage = () => {
    setMessageToForward(selectedMessage);
    setShowMessageOptions(false);
    setShowForwardModal(true);
  };

  // Toggle contact selection
  const toggleContactSelection = (chatId) => {
    setSelectedContacts(prev => {
      if (prev.includes(chatId)) {
        return prev.filter(id => id !== chatId);
      } else {
        return [...prev, chatId];
      }
    });
  };

  // Send forwarded message
  const handleSendForward = async () => {
    if (selectedContacts.length === 0 || !messageToForward) return;

    try {
      for (const contactId of selectedContacts) {
        const chat = chatList.find(c => 
          (c._id?.toString() === contactId || c.conversationId?.toString() === contactId)
        );
        
        if (!chat) continue;

        const recipient = chat.participants?.find(p => 
          p._id?.toString() !== user._id?.toString()
        );

        if (!recipient?._id) continue;

        // Create forwarded message data
        const forwardData = {
          conversationId: chat.conversationId || chat._id,
          text: messageToForward.text || '',
          imageUrl: messageToForward.imageUrl || null,
          recipientId: recipient._id,
          isForwarded: true,
        };

        // Emit forwarded message
        if (socket && socket.connected) {
          socket.emit('send-message', forwardData);
        }
      }

      Alert.alert(
        'Success', 
        `Message forwarded to ${selectedContacts.length} ${selectedContacts.length === 1 ? 'contact' : 'contacts'}`
      );
      
      // Reset state
      setShowForwardModal(false);
      setMessageToForward(null);
      setSelectedContacts([]);
    } catch (error) {
      console.error('Error forwarding message:', error);
      Alert.alert('Error', 'Failed to forward message');
    }
  };

  // Handle reply to message
  const handleReplyToMessage = () => {
    setReplyToMessage(selectedImage);
    setShowImageViewer(false);
    messageInputRef.current?.focus();
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar 
          backgroundColor={theme.colors.surface} 
          barStyle={theme.isDarkMode ? 'light-content' : 'dark-content'}
        />
        <View style={styles.mainContainer}>
          <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
          {/* Header with Search */}
          {!selectedChat && (
            <View style={styles.header}>
              {isSelectingChats ? (
                // Selection mode header
                <View style={styles.selectionHeader}>
                  <TouchableOpacity 
                    style={styles.selectionBackButton}
                    onPress={() => {
                      setIsSelectingChats(false);
                      setSelectedChats([]);
                    }}
                  >
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.selectionHeaderText}>
                    {selectedChats && selectedChats.length > 0 ? `${selectedChats.length} selected` : 'Select Chats'}
                  </Text>
                  <View style={styles.selectionActions}>
                    {selectedChats.length === chatList.length ? (
                      <TouchableOpacity onPress={deselectAllChats}>
                        <Text style={styles.selectionActionText}>Deselect</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={selectAllChats}>
                        <Text style={styles.selectionActionText}>Select All</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.selectionDeleteButton}
                      onPress={handleDeleteSelectedChats}
                      disabled={selectedChats.length === 0}
                    >
                      <Icon name="delete" size={24} color={selectedChats.length > 0 ? theme.colors.error : theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // Normal mode header
                !showSearchBar ? (
                  <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Chats</Text>
                    <View style={styles.headerRightContainer}>
                      <TouchableOpacity 
                        style={styles.searchIconButton}
                        onPress={() => setShowSearchBar(true)}
                      >
                        <Icon name="search" size={24} color={theme.colors.text} />
                      </TouchableOpacity>
                      {chatList.length > 0 && (
                        <TouchableOpacity 
                          style={styles.selectIconButton}
                          onPress={toggleSelectMode}
                        >
                          <Icon name="select-all" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.searchBarExpanded}>
                    <TouchableOpacity 
                      style={styles.searchBackButton}
                      onPress={() => {
                        setShowSearchBar(false);
                        setSearchQuery('');
                      }}
                    >
                      <Icon name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.searchInputExpanded}
                      placeholder="Search chats..."
                      placeholderTextColor={theme.colors.placeholder}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity 
                        style={styles.searchClearButton}
                        onPress={() => setSearchQuery('')}
                      >
                        <Icon name="close" size={20} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                )
              )}
            </View>
          )}
          
          

          {selectedChat ? (
            // Chat thread view
            <View style={styles.chatThreadContainer}>
              {/* Chat header */}
              <View style={styles.chatThreadHeader}>
                <TouchableOpacity onPress={() => {
                  setSelectedChat(null);
                  setCurrentConversationId(null);
                  setMessages([]);
                }}>
                  <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.chatThreadHeaderInfo}
                  onPress={() => {
                    // Navigate to user profile
                    const otherUser = selectedChat.participants?.find(p => 
                      p._id?.toString() !== user._id?.toString()
                    ) || selectedChat.otherParticipant;
                    
                    if (otherUser?._id || otherUser?.id) {
                      navigation.navigate('Profile', { 
                        userId: otherUser._id || otherUser.id 
                      });
                    } else {
                      Alert.alert('Error', 'User information not available');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Image 
                    source={{ uri: selectedChat.participants?.find(p => 
                      p._id?.toString() !== user._id?.toString()
                    )?.profilePicture || selectedChat.otherParticipant?.profilePicture || 'https://via.placeholder.com/40' }} 
                    style={styles.chatThreadAvatar}
                  />
                  <View>
                    <Text style={styles.chatThreadName}>
                      {selectedChat.participants?.find(p => 
                        p._id?.toString() !== user._id?.toString()
                      )?.name || selectedChat.otherParticipant?.name || 'Unknown User'}
                    </Text>
                    <Text style={styles.chatThreadStatus}>
                      {(() => {
                        if (Object.keys(typingUsers).length > 0) {
                          return 'typing...';
                        }
                        const isOnline = selectedChat?.otherParticipant?.isOnline || 
                          (onlineUsers && onlineUsers.has(selectedChat?.otherParticipant?._id?.toString()));
                        return isOnline ? 'online' : 'offline';
                      })()}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={handleVoiceCall}
                  >
                    <Icon name="call" size={22} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={handleVideoCall}
                  >
                    <Icon name="videocam" size={24} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => setShowChatOptions(true)}
                  >
                    <Icon name="more-vert" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Messages list */}
              <View style={styles.messagesContainer}>
                {messagesLoading ? (
                  <View style={styles.messagesSkeletonContainer}>
                    {[...Array(8)].map((_, index) => renderMessageSkeleton(index))}
                  </View>
                ) : (
                  <FlatList
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => {
                      const id = item.id?.toString() || item._id?.toString();
                      return id || `msg_${Date.now()}_${Math.random()}`;
                    }}
                    ref={messagesEndRef}
                    onContentSizeChange={scrollToBottom}
                    style={styles.messagesList}
                    contentContainerStyle={styles.messagesContentContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View style={styles.emptyMessagesContainer}>
                        <Text style={styles.emptyMessagesText}>No messages yet</Text>
                        <Text style={styles.emptyMessagesSubtext}>Start the conversation!</Text>
                      </View>
                    }
                  />
                )}
              </View>

              {/* Message input */}
              <View style={styles.inputContainer}>
                {/* Reply Preview */}
                {replyToMessage && (
                  <View style={styles.replyPreview}>
                    <View style={styles.replyPreviewBar} />
                    <View style={styles.replyPreviewContent}>
                      {(replyToMessage.sender?.name || replyToMessage.senderName) && (
                        <Text style={styles.replyPreviewName}>
                          {replyToMessage.sender?.name || replyToMessage.senderName || 'Unknown'}
                        </Text>
                      )}
                      {replyToMessage.imageUrl && (
                        <Text style={styles.replyPreviewText}>📷 Photo</Text>
                      )}
                      {replyToMessage.text && typeof replyToMessage.text === 'string' && replyToMessage.text.trim().length > 0 && (
                        <Text style={styles.replyPreviewText} numberOfLines={1}>
                          {replyToMessage.text}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={handleCancelReply} style={styles.replyPreviewClose}>
                      <Icon name="close" size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {imagePreview && (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
                    <TouchableOpacity 
                      style={styles.removeImage}
                      onPress={() => setImagePreview(null)}
                    >
                      <Icon name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={styles.inputRow}>
                  <TouchableOpacity style={styles.inputButton} onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
                    <Icon name="emoji-emotions" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.inputButton} onPress={handleImageSelect}>
                    <Icon name="attach-file" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.messageInput}
                    value={message}
                    onChangeText={(text) => {
                      setMessage(text);
                      handleTyping();
                    }}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.colors.placeholder}
                    multiline
                    ref={messageInputRef}
                  />
                  
                  <TouchableOpacity 
                    style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!message.trim()}
                  >
                    <Icon name="send" size={20} color={message.trim() ? theme.colors.primary : theme.colors.placeholder} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Emoji picker */}
              {showEmojiPicker && (
                <View style={styles.emojiPickerContainer}>
                  <EmojiPicker
                    onEmojiSelected={handleEmojiSelect}
                    showHistory={true}
                    showSearchBar={true}
                    showSectionTitles={true}
                  />
                </View>
              )}
            </View>
          ) : (
            // Chat list view
            <View style={styles.chatListContainer}>
              {loading ? (
                <View style={styles.skeletonContainer}>
                  {[...Array(10)].map((_, index) => (
                    <View key={`skeleton-${index}`}>
                      {renderChatSkeleton()}
                    </View>
                  ))}
                </View>
              ) : (
                <View>
                  {filteredChats.length === 0 && searchQuery && searchQuery.trim().length > 0 ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No chats found</Text>
                      <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredChats}
                      renderItem={renderChatItem}
                      keyExtractor={(item) => item._id?.toString() || item.conversationId?.toString() || Date.now().toString()}
                      showsVerticalScrollIndicator={false}
                    />
                  )}
                </View>
              )}
            </View>
          )}

          {/* Chat Options Modal */}
          <Modal
            visible={showChatOptions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowChatOptions(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowChatOptions(false)}
            >
              <View style={styles.optionsModal}>
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={handleClearChat}
                >
                  <Icon name="delete-sweep" size={24} color={theme.colors.text} />
                  <Text style={styles.optionText}>Clear Chat</Text>
                </TouchableOpacity>
                <View style={styles.optionDivider} />
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={handleBlockUser}
                >
                  <Icon name="block" size={24} color={theme.colors.error} />
                  <Text style={[styles.optionText, { color: theme.colors.error }]}>Block User</Text>
                </TouchableOpacity>
                <View style={styles.optionDivider} />
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={() => setShowChatOptions(false)}
                >
                  <Icon name="close" size={24} color={theme.colors.text} />
                  <Text style={styles.optionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
          
          {/* Message Options Modal */}
          <Modal
            visible={showMessageOptions}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowMessageOptions(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowMessageOptions(false)}
            >
              <View style={styles.optionsModal}>
                {selectedMessage?.text && (
                  <>
                    <TouchableOpacity 
                      style={styles.optionItem}
                      onPress={handleCopyMessage}
                    >
                      <Icon name="content-copy" size={24} color={theme.colors.text} />
                      <Text style={styles.optionText}>Copy</Text>
                    </TouchableOpacity>
                    <View style={styles.optionDivider} />
                  </>
                )}
                {/* Forward Option - Always available */}
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={handleForwardMessage}
                >
                  <Icon name="forward" size={24} color={theme.colors.primary} />
                  <Text style={styles.optionText}>Forward</Text>
                </TouchableOpacity>
                <View style={styles.optionDivider} />
                {selectedMessage?.type === 'sent' && (
                  <>
                    <TouchableOpacity 
                      style={styles.optionItem}
                      onPress={handleDeleteMessage}
                    >
                      <Icon name="delete" size={24} color={theme.colors.error} />
                      <Text style={[styles.optionText, { color: theme.colors.error }]}>Delete</Text>
                    </TouchableOpacity>
                    <View style={styles.optionDivider} />
                  </>
                )}
                <TouchableOpacity 
                  style={styles.optionItem}
                  onPress={() => setShowMessageOptions(false)}
                >
                  <Icon name="close" size={24} color={theme.colors.text} />
                  <Text style={styles.optionText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Call Screen */}
          <CallScreen
            visible={showCallScreen}
            onEndCall={handleEndCall}
            callType={callType}
            callerInfo={currentCaller}
            isOutgoing={isOutgoingCall}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />

          {/* Image Viewer Modal */}
          <Modal
            visible={showImageViewer}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowImageViewer(false)}
          >
            <View style={styles.imageViewerContainer}>
              {/* Header */}
              <View style={styles.imageViewerHeader}>
                <TouchableOpacity onPress={() => setShowImageViewer(false)}>
                  <Icon name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.imageViewerTitle}>
                  {selectedImage?.sender?.name || 'Unknown'}
                </Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Image */}
              <View style={styles.imageViewerContent}>
                <Image
                  source={{ uri: selectedImage?.imageUrl }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
                {selectedImage?.text && (
                  <View style={styles.imageCaption}>
                    <Text style={styles.imageCaptionText}>{selectedImage.text}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.imageViewerActions}>
                <TouchableOpacity style={styles.imageActionButton} onPress={handleForwardImage}>
                  <Icon name="forward" size={28} color="#fff" />
                  <Text style={styles.imageActionText}>Forward</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.imageActionButton} onPress={handleReplyToMessage}>
                  <Icon name="reply" size={28} color="#fff" />
                  <Text style={styles.imageActionText}>Reply</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.imageActionButton} onPress={handleDownloadImage}>
                  <Icon name="download" size={28} color="#fff" />
                  <Text style={styles.imageActionText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Forward Modal */}
          <Modal
            visible={showForwardModal}
            transparent={false}
            animationType="slide"
            onRequestClose={() => setShowForwardModal(false)}
          >
            <View style={styles.forwardContainer}>
              {/* Header */}
              <View style={styles.forwardHeader}>
                <TouchableOpacity onPress={() => {
                  setShowForwardModal(false);
                  setSelectedContacts([]);
                  setMessageToForward(null);
                }}>
                  <Icon name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.forwardTitle}>Forward to...</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* Selected count */}
              {selectedContacts.length > 0 && (
                <View style={styles.selectedCountContainer}>
                  <Text style={styles.selectedCountText}>
                    {selectedContacts.length} {selectedContacts.length === 1 ? 'contact' : 'contacts'} selected
                  </Text>
                </View>
              )}

              {/* Message Preview */}
              <View style={styles.forwardPreview}>
                <Icon name="forward" size={20} color={theme.colors.textSecondary} />
                <View style={styles.forwardPreviewContent}>
                  {messageToForward?.imageUrl && (
                    <View style={styles.forwardPreviewImage}>
                      <Image source={{ uri: messageToForward.imageUrl }} style={styles.forwardThumb} />
                    </View>
                  )}
                  {messageToForward?.text && (
                    <Text style={styles.forwardPreviewText} numberOfLines={2}>
                      {messageToForward.text}
                    </Text>
                  )}
                </View>
              </View>

              {/* Contacts List */}
              <FlatList
                data={chatList.filter(chat => {
                  // Filter out current chat
                  return (chat._id?.toString() || chat.conversationId?.toString()) !== currentConversationId?.toString();
                })}
                keyExtractor={(item) => item._id?.toString() || item.conversationId?.toString()}
                renderItem={({ item }) => {
                  const otherParticipant = item.participants?.find(p => 
                    p._id?.toString() !== user._id?.toString()
                  ) || item.otherParticipant;
                  
                  const chatId = item._id?.toString() || item.conversationId?.toString();
                  const isSelected = selectedContacts.includes(chatId);
                  
                  return (
                    <TouchableOpacity 
                      style={[styles.forwardContactItem, isSelected && styles.forwardContactSelected]}
                      onPress={() => toggleContactSelection(chatId)}
                    >
                      <View style={styles.forwardContactLeft}>
                        <Image 
                          source={{ uri: otherParticipant?.profilePicture || 'https://via.placeholder.com/40' }} 
                          style={styles.forwardAvatar}
                        />
                        <Text style={styles.forwardContactName}>
                          {otherParticipant?.name || 'Unknown User'}
                        </Text>
                      </View>
                      {isSelected && (
                        <Icon name="check-circle" size={24} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />

              {/* Send Button */}
              {selectedContacts.length > 0 && (
                <TouchableOpacity 
                  style={styles.forwardSendButton}
                  onPress={handleSendForward}
                >
                  <Icon name="send" size={24} color="#fff" />
                  <Text style={styles.forwardSendText}>Send to {selectedContacts.length}</Text>
                </TouchableOpacity>
              )}
            </View>
          </Modal>
        </KeyboardAvoidingView>
        </View> {/* Closing View tag for mainContainer */}
        
        {/* Show Bottom Navigation only when not in a specific chat */}
        {!selectedChat && <BottomNavigation />}
      </SafeAreaView>
    </>
  );
};

const createStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 56,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  searchIconButton: {
    padding: 8,
  },
  searchBarExpanded: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBackButton: {
    padding: 4,
    marginRight: 8,
  },
  searchInputExpanded: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
    paddingVertical: 8,
  },
  searchClearButton: {
    padding: 4,
    marginLeft: 8,
  },
  chatListContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: theme.colors.success,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  chatTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  chatThreadContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  chatThreadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  chatThreadHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    flex: 1,
  },
  chatThreadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatThreadName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  chatThreadStatus: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messagesContentContainer: {
    paddingTop: 10,
    paddingBottom: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  sentMessage: {
    justifyContent: 'flex-end',
  },
  receivedMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.7,
    padding: 10,
    borderRadius: 15,
  },
  sentBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 5,
  },
  receivedBubble: {
    backgroundColor: theme.isDarkMode ? theme.colors.surface : '#E8E8E8',
    borderBottomLeftRadius: 5,
  },
  messageImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: theme.colors.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTime: {
    color: theme.colors.textSecondary,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputButton: {
    padding: 8,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
    color: theme.colors.text,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emojiPickerContainer: {
    height: 250,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  moreButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  callButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 16,
    color: theme.colors.text,
  },
  optionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  // Skeleton loader styles
  skeletonContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  skeletonChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.isDarkMode ? '#404040' : '#e0e0e0',
    marginRight: 12,
  },
  skeletonChatInfo: {
    flex: 1,
  },
  skeletonChatName: {
    width: '60%',
    height: 16,
    backgroundColor: theme.isDarkMode ? '#404040' : '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLastMessage: {
    width: '80%',
    height: 14,
    backgroundColor: theme.isDarkMode ? '#333333' : '#f0f0f0',
    borderRadius: 4,
  },
  messagesSkeletonContainer: {
    flex: 1,
    padding: 10,
    backgroundColor: theme.colors.background,
  },
  skeletonMessageContainer: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  skeletonMessageLeft: {
    justifyContent: 'flex-start',
  },
  skeletonMessageRight: {
    justifyContent: 'flex-end',
  },
  skeletonMessageBubble: {
    height: 60,
    borderRadius: 15,
    backgroundColor: theme.isDarkMode ? '#404040' : '#e0e0e0',
  },
  skeletonBubbleLeft: {
    width: '70%',
    marginLeft: 10,
  },
  skeletonBubbleRight: {
    width: '60%',
    marginRight: 10,
  },
  // Reply context styles
  replyContext: {
    flexDirection: 'row',
    backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 10,
    marginTop: 8,
    maxWidth: SCREEN_WIDTH * 0.7,
  },
  replyContextLeft: {
    alignSelf: 'flex-start',
    marginLeft: 50,
  },
  replyContextRight: {
    alignSelf: 'flex-end',
  },
  replyBar: {
    width: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  replyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  // Reply preview styles (input area)
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  replyPreviewBar: {
    width: 3,
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginRight: 10,
  },
  replyPreviewContent: {
    flex: 1,
  },
  replyPreviewName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  replyPreviewClose: {
    padding: 4,
  },
  // Image viewer styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  imageViewerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
  imageCaption: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 8,
  },
  imageCaptionText: {
    color: '#fff',
    fontSize: 15,
  },
  imageViewerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  imageActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageActionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  // Forward modal styles
  forwardContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  forwardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  forwardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectedCountContainer: {
    backgroundColor: theme.colors.primary,
    padding: 8,
    alignItems: 'center',
  },
  selectedCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  forwardPreview: {
    flexDirection: 'row',
    backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    padding: 12,
    margin: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  forwardPreviewContent: {
    flex: 1,
    marginLeft: 10,
  },
  forwardPreviewImage: {
    marginBottom: 8,
  },
  forwardThumb: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  forwardPreviewText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  forwardContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 4,
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  forwardContactSelected: {
    backgroundColor: theme.isDarkMode ? 'rgba(230, 81, 0, 0.15)' : 'rgba(230, 81, 0, 0.1)',
    borderColor: theme.colors.primary,
  },
  forwardContactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  forwardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  forwardContactName: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  forwardSendButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    margin: 10,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  forwardSendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Chat selection mode styles
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectionBackButton: {
    marginRight: 12,
  },
  selectionHeaderText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionActionText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  selectionDeleteButton: {
    padding: 4,
  },
  chatSelectionIndicator: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItemSelected: {
    backgroundColor: theme.isDarkMode ? 'rgba(230, 81, 0, 0.15)' : 'rgba(230, 81, 0, 0.1)',
    borderColor: theme.colors.primary,
  },
  chatItemDeleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  selectIconButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.inputBackground,
    margin: 10,
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default ChatScreen;