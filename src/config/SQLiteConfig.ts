import { Platform } from 'react-native';

export const SQLiteConfig = {
    // Configurações específicas para diferentes plataformas
    databaseName: 'tracking.db',
    
    // Configurações de retry
    maxRetries: 3,
    retryDelay: 1000, // 1 segundo
    
    // Configurações de timeout
    operationTimeout: 10000, // 10 segundos
    
    // Configurações de debug
    enableLogging: __DEV__,
    
    // Configurações específicas por plataforma
    android: {
        enableWAL: true, // Write-Ahead Logging
        synchronous: 'NORMAL', // FULL, NORMAL, OFF
    },
    
    ios: {
        enableWAL: true,
        synchronous: 'NORMAL',
    },
    
    // Configurações de backup
    backupEnabled: true,
    backupInterval: 24 * 60 * 60 * 1000, // 24 horas
    
    // Configurações de limpeza
    cleanupEnabled: true,
    maxRecords: 10000, // Máximo de registros antes de limpar
    cleanupThreshold: 0.8, // Limpar quando atingir 80% do máximo
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

