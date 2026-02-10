import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import socketService from '../../services/socket/SocketService';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    // Monitor network connectivity
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    // Monitor socket connection
    const checkSocket = setInterval(() => {
      setIsSocketConnected(socketService.isConnected());
    }, 2000);

    // Initial check
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });
    setIsSocketConnected(socketService.isConnected());

    return () => {
      unsubscribe();
      clearInterval(checkSocket);
    };
  }, []);

  // Don't show if everything is online
  if (isOnline && isSocketConnected) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Ionicons 
        name="cloud-offline" 
        size={16} 
        color="#FFFFFF" 
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {!isOnline ? 'OFFLINE MODE' : 'SERVER DISCONNECTED'}
        </Text>
        <Text style={styles.subtitle}>
          {!isOnline 
            ? 'Using cached data • Alerts generated locally'
            : 'Socket disconnected • Reconnecting...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
    ...SHADOWS.md,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
});

export default OfflineIndicator;
