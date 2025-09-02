import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppRegistry } from 'react-native';

function App() {
  const handlePress = () => { };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TraceTrip</Text>
      <Text style={styles.subtitle}>App funcionando no Android!</Text>
      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>Teste</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#1E40AF',
    fontSize: 16,
    fontWeight: '600',
  },
});

AppRegistry.registerComponent('main', () => App);

export default App; 