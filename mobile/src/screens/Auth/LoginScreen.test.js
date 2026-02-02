// Temporary debugging version of LoginScreen
// Copy this content into LoginScreen.js to test

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { login, clearError } from '../../store/slices/authSlice';
import { CONFIG } from '../../constants/config';
import theme from '../../constants/theme';

const LoginScreen = ({ navigation }) => {
  console.log('=== LoginScreen Rendering ===');
  
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);
  
  console.log('isLoading type:', typeof isLoading, 'value:', isLoading);
  console.log('error type:', typeof error, 'value:', error);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  console.log('showPassword type:', typeof showPassword, 'value:', showPassword);

  // MINIMAL TEST VERSION - Comment out sections to test
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Test Screen</Text>
      <Text>Testing props...</Text>
      
      {/* Test 1: Simple TextInput */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        editable={true}  // Explicitly true
      />
      
      {/* Test 2: TextInput with boolean state */}
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}  // Explicitly true
      />
      
      {/* Test 3: Disabled prop */}
      <TouchableOpacity
        style={styles.button}
        disabled={false}  // Explicitly false
      >
        <Text>Test Button</Text>
      </TouchableOpacity>
      
      <Text>If you see this, basic props work!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: '#FFD100',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
  },
});

export default LoginScreen;
