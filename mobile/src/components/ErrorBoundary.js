import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨🚨🚨 ERROR BOUNDARY CAUGHT:', error);
    console.error('Component stack:', errorInfo.componentStack);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView style={styles.scrollView}>
            <Text style={styles.title}>🚨 Application Error</Text>
            <Text style={styles.subtitle}>Something went wrong</Text>
            
            <Text style={styles.label}>Error:</Text>
            <Text style={styles.error}>{this.state.error?.toString()}</Text>
            
            <Text style={styles.label}>Component Stack:</Text>
            <Text style={styles.stack}>
              {this.state.errorInfo?.componentStack}
            </Text>
            
            <Text style={styles.label}>Error Stack:</Text>
            <Text style={styles.stack}>
              {this.state.error?.stack}
            </Text>
            
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                this.props.onReset?.();
              }}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD100',
    marginTop: 15,
    marginBottom: 5,
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    fontFamily: 'monospace',
  },
  stack: {
    fontSize: 12,
    color: '#CCC',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#FFD100',
    padding: 15,
    borderRadius: 8,
    marginTop: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
