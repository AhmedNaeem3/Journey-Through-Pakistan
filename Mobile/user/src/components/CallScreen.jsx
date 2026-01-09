import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CallScreen = ({ 
  visible, 
  onEndCall, 
  callType = 'voice', // 'voice' or 'video'
  callerInfo = {},
  isOutgoing = true,
  onAccept,
  onReject,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === 'video');
  const [callStatus, setCallStatus] = useState(isOutgoing ? 'calling' : 'incoming');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    // Start pulse animation for ringing
    if (callStatus === 'calling' || callStatus === 'incoming') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible, callStatus, pulseAnim]);

  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAccept = () => {
    setCallStatus('connected');
    if (onAccept) onAccept();
  };

  const handleReject = () => {
    if (onReject) onReject();
    if (onEndCall) onEndCall();
  };

  const handleEndCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (onEndCall) onEndCall();
  };

  const getCallStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return 'Calling...';
      case 'incoming':
        return 'Incoming Call';
      case 'connected':
        return formatDuration(callDuration);
      default:
        return '';
    }
  };

  // Render nothing if not visible - AFTER all hooks
  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        {callType === 'video' && isVideoOn ? (
          <View style={styles.videoContainer}>
            <Text style={styles.videoPlaceholder}>Video Stream</Text>
            {/* TODO: Add actual video stream component */}
          </View>
        ) : (
          <View style={styles.voiceCallBackground}>
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Image
                source={{ uri: callerInfo.profilePicture || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
              />
            </Animated.View>
          </View>
        )}
      </View>

      {/* Call Info */}
      <View style={styles.callInfo}>
        <Text style={styles.callerName}>{callerInfo.name || 'Unknown'}</Text>
        <Text style={styles.callStatus}>{getCallStatusText()}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {callStatus === 'connected' && (
          <View style={styles.controlsRow}>
            {/* Mute Button */}
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Icon name={isMuted ? 'mic-off' : 'mic'} size={28} color="#fff" />
              <Text style={styles.controlLabel}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>

            {/* Speaker Button */}
            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
            >
              <Icon name={isSpeakerOn ? 'volume-up' : 'volume-down'} size={28} color="#fff" />
              <Text style={styles.controlLabel}>Speaker</Text>
            </TouchableOpacity>

            {/* Video Toggle (for video calls) */}
            {callType === 'video' && (
              <TouchableOpacity
                style={[styles.controlButton, !isVideoOn && styles.controlButtonActive]}
                onPress={() => setIsVideoOn(!isVideoOn)}
              >
                <Icon name={isVideoOn ? 'videocam' : 'videocam-off'} size={28} color="#fff" />
                <Text style={styles.controlLabel}>Video</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Call Action Buttons */}
        <View style={styles.actionButtons}>
          {callStatus === 'incoming' ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleReject}
              >
                <Icon name="call-end" size={32} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAccept}
              >
                <Icon name="call" size={32} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.endCallButton]}
              onPress={handleEndCall}
            >
              <Icon name="call-end" size={32} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    zIndex: 9999,
  },
  background: {
    flex: 1,
  },
  voiceCallBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    color: '#fff',
    fontSize: 18,
  },
  avatarContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  callInfo: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 50,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  controlButtonActive: {
    backgroundColor: '#007AFF',
  },
  controlLabel: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  endCallButton: {
    backgroundColor: '#f44336',
  },
});

export default CallScreen;
