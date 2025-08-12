import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class SecureStorage {
  private isWeb = Platform.OS === 'web';

  async setItemAsync(key: string, value: string): Promise<void> {
    if (this.isWeb) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (error) {
        console.warn('Failed to store in localStorage:', error);
      }
    } else {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (error) {
        console.warn('Failed to store in SecureStore:', error);
      }
    }
  }

  async getItemAsync(key: string): Promise<string | null> {
    if (this.isWeb) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } catch (error) {
        console.warn('Failed to get from localStorage:', error);
        return null;
      }
    } else {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        console.warn('Failed to get from SecureStore:', error);
        return null;
      }
    }
  }

  async deleteItemAsync(key: string): Promise<void> {
    if (this.isWeb) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
      }
    } else {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        console.warn('Failed to remove from SecureStore:', error);
      }
    }
  }
}

export const secureStorage = new SecureStorage(); 