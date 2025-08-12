import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Svg, Path } from 'react-native-svg';

export default function SplashScreen() {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace('/onboard' as any);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <Svg width="60" height="60" viewBox="0 0 60 60">
            <Path
              d="M30 5C20.6 5 13 12.6 13 22c0 12 17 33 17 33s17-21 17-33c0-9.4-7.6-17-17-17z"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M20 35l5-8 5 2 5-5 5 3"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
          </Svg>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Trace</Text>
          <Text style={styles.subtitle}>Trip</Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E40AF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  logoContainer: {
    marginRight: 12,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    lineHeight: 36,
  },
}); 