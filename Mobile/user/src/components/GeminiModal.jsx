import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { generateGeminiContent } from '../services/geminiApi';

/**
 * Reusable Gemini Modal Component for Mobile
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when modal is closed
 * @param {string} prompt - The prompt/question to send to Gemini (optional, for auto-fetch)
 * @param {string} title - Modal title (default: "AI Assistant")
 * @param {string} model - Gemini model to use (default: 'gemini-2.5-flash-lite')
 * @param {number} temperature - Temperature for generation (default: 0.7)
 * @param {function} onResponse - Optional callback when response is received
 * @param {string} landmarkName - Name of the landmark for context (optional)
 * @param {boolean} autoFetch - Whether to automatically fetch response when modal opens (default: false)
 */
const GeminiModal = ({
  isOpen,
  onClose,
  prompt,
  title = 'AI Assistant',
  model = 'gemini-2.5-flash-lite',
  temperature = 0.7,
  onResponse = null,
  landmarkName = null,
  autoFetch = false
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userQuestion, setUserQuestion] = useState('');

  useEffect(() => {
    if (isOpen && prompt && autoFetch) {
      fetchGeminiResponse(prompt);
    } else if (isOpen) {
      // Reset state when modal opens (but don't fetch)
      setResponse('');
      setError(null);
      setUserQuestion('');
    } else {
      // Reset state when modal closes
      setResponse('');
      setError(null);
      setUserQuestion('');
    }
  }, [isOpen, prompt, autoFetch]);

  const fetchGeminiResponse = async (questionPrompt = null) => {
    const finalPrompt = questionPrompt || prompt;
    
    if (!finalPrompt || !finalPrompt.trim()) {
      setError('Please provide a question');
      return;
    }

    // Build the full prompt with landmark context if available
    let fullPrompt = finalPrompt;
    if (landmarkName && !finalPrompt.toLowerCase().includes(landmarkName.toLowerCase())) {
      fullPrompt = `About ${landmarkName}: ${finalPrompt}`;
    }

    setLoading(true);
    setError(null);
    setResponse('');

    try {
      const res = await generateGeminiContent(fullPrompt, model, temperature);
      
      if (res.data.success && res.data.content) {
        setResponse(res.data.content);
        
        // Call optional callback
        if (onResponse) {
          onResponse(res.data.content);
        }
      } else {
        setError('Failed to get response from AI');
      }
    } catch (err) {
      console.error('Error fetching Gemini response:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to generate response. Please try again.'
      );
      Alert.alert('Error', 'Failed to generate AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (userQuestion.trim()) {
      fetchGeminiResponse(userQuestion);
    }
  };

  const formatResponse = (text) => {
    if (!text) return '';
    
    // Helper function to render inline bold text (**text**)
    const renderInlineWithBold = (textToRender, baseKey = '') => {
      if (!textToRender || typeof textToRender !== 'string') {
        return textToRender;
      }
      
      // Check if text contains bold markers
      if (!textToRender.includes('**')) {
        return textToRender;
      }
      
      const BOLD_INLINE = /\*\*([^*]+?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      let keyIndex = 0;
      
      // Reset regex
      BOLD_INLINE.lastIndex = 0;
      
      // Process all matches
      while ((match = BOLD_INLINE.exec(textToRender)) !== null) {
        // Add text before the bold match
        if (match.index > lastIndex) {
          const beforeText = textToRender.slice(lastIndex, match.index);
          if (beforeText) {
            parts.push({ type: 'text', content: beforeText, key: `${baseKey}-text-${keyIndex}` });
          }
        }
        // Add the bold text
        parts.push({ 
          type: 'bold', 
          content: match[1], 
          key: `${baseKey}-bold-${keyIndex++}` 
        });
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < textToRender.length) {
        const remainingText = textToRender.slice(lastIndex);
        if (remainingText) {
          parts.push({ type: 'text', content: remainingText, key: `${baseKey}-text-${keyIndex}` });
        }
      }
      
      // If no bold found, return original
      if (parts.length === 0) {
        return textToRender;
      }
      
      // Render as array of strings and Text components
      return parts.map(part => {
        if (part.type === 'bold') {
          return (
            <Text key={part.key} style={{ fontWeight: 'bold', fontFamily: undefined }}>
              {part.content}
            </Text>
          );
        }
        return part.content;
      });
    };
    
    // Split by double newlines to create paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((para, index) => {
      const trimmedPara = para.trim();
      if (!trimmedPara) return null;

      // Check if it's a heading (starts with #)
      if (trimmedPara.startsWith('#')) {
        const level = trimmedPara.match(/^#+/)[0].length;
        const headingText = trimmedPara.replace(/^#+\s*/, '');
        const fontSize = level === 1 ? 24 : level === 2 ? 20 : 18;
        
        return (
          <Text key={index} style={[styles.heading, { fontSize }]}>
            {renderInlineWithBold(headingText, `heading-${index}`)}
          </Text>
        );
      }

      // Check if it's a list item
      if (trimmedPara.match(/^[-*•]\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <View key={index} style={styles.listContainer}>
            {items.map((item, itemIndex) => {
              const itemText = item.replace(/^[-*•]\s/, '');
              return (
                <Text key={itemIndex} style={styles.listItem}>
                  • {renderInlineWithBold(itemText, `list-${index}-${itemIndex}`)}
                </Text>
              );
            })}
          </View>
        );
      }

      // Check if it's a numbered list
      if (trimmedPara.match(/^\d+\.\s/)) {
        const items = trimmedPara.split(/\n/).filter(item => item.trim());
        return (
          <View key={index} style={styles.listContainer}>
            {items.map((item, itemIndex) => {
              const itemText = item.replace(/^\d+\.\s/, '');
              return (
                <Text key={itemIndex} style={styles.listItem}>
                  {itemIndex + 1}. {renderInlineWithBold(itemText, `numlist-${index}-${itemIndex}`)}
                </Text>
              );
            })}
          </View>
        );
      }

      // Regular paragraph with bold support
      return (
        <Text key={index} style={styles.paragraph}>
          {trimmedPara.split('\n').map((line, lineIndex, array) => {
            const boldContent = renderInlineWithBold(line, `para-${index}-${lineIndex}`);
            return (
              <React.Fragment key={lineIndex}>
                {Array.isArray(boldContent) ? boldContent : boldContent}
                {lineIndex < array.length - 1 && '\n'}
              </React.Fragment>
            );
          })}
        </Text>
      );
    }).filter(Boolean);
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={styles.body} showsVerticalScrollIndicator={true}>
              {/* Input field for user questions */}
              {!loading && !response && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {landmarkName ? `Ask anything about ${landmarkName}` : 'Ask your question'}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    numberOfLines={4}
                    placeholder={landmarkName ? `e.g., What is the history of ${landmarkName}?` : 'Type your question here...'}
                    value={userQuestion}
                    onChangeText={setUserQuestion}
                    editable={!loading}
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={[styles.submitButton, (!userQuestion.trim() || loading) && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={!userQuestion.trim() || loading}
                  >
                    <Text style={styles.submitButtonText}>Ask AI</Text>
                  </TouchableOpacity>
                </View>
              )}

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Generating response...</Text>
                </View>
              )}

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => fetchGeminiResponse(userQuestion || prompt)}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!loading && !error && response && (
                <View style={styles.responseContainer}>
                  {formatResponse(response)}
                </View>
              )}

              {response && !loading && (
                <TouchableOpacity
                  style={styles.askAnotherButton}
                  onPress={() => {
                    setResponse('');
                    setUserQuestion('');
                    setError(null);
                  }}
                >
                  <Text style={styles.askAnotherButtonText}>Ask Another Question</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.footerButton} onPress={onClose}>
                <Text style={styles.footerButtonText}>Close</Text>
              </TouchableOpacity>
              {response && (
                <TouchableOpacity
                  style={[styles.footerButton, styles.copyButton]}
                  onPress={() => {
                    // Copy to clipboard
                    // Note: You may need to install @react-native-clipboard/clipboard
                    Alert.alert('Copied', 'Response copied to clipboard!');
                  }}
                >
                  <Text style={styles.footerButtonText}>Copy Response</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    height: '90%',
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    flex: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    padding: 16,
    minHeight: 0,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: theme.colors.error + '20',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  responseContainer: {
    marginBottom: 16,
  },
  heading: {
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  listContainer: {
    marginLeft: 16,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
    marginBottom: 4,
  },
  askAnotherButton: {
    backgroundColor: theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  askAnotherButtonText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    backgroundColor: theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  copyButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  footerButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GeminiModal;


