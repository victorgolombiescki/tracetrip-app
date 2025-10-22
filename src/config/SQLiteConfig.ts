import { Platform } from 'react-native';

export const SQLiteConfig = {
    databaseName: 'tracking.db',
    
    maxRetries: 3,
    retryDelay: 1000, 
    
    operationTimeout: 10000, 
    
    enableLogging: __DEV__,
    
    android: {
        enableWAL: true,
        synchronous: 'NORMAL',
    },
    
    ios: {
        enableWAL: true,
        synchronous: 'NORMAL',
    },
    
    backupEnabled: true,
    backupInterval: 24 * 60 * 60 * 1000, 
    
    cleanupEnabled: true,
    maxRecords: 10000, 
    cleanupThreshold: 0.8, 
};

export const getPlatformConfig = () => {
    if (Platform.OS === 'android') {
        return SQLiteConfig.android;
    } else if (Platform.OS === 'ios') {
        return SQLiteConfig.ios;
    }
    return {};
};

export const logSQLiteOperation = (operation: string, success: boolean, error?: any) => {
    if (!SQLiteConfig.enableLogging) return;
    
    const status = success ? '✅' : '❌';
    const message = `${status} SQLite ${operation}`;
    
    if (success) {
        console.log(message);
    } else {
        console.error(message, error);
    }
};


