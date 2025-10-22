import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';
import { SQLiteConfig, getPlatformConfig, logSQLiteOperation } from '@/src/config/SQLiteConfig';

export interface LocationRecord {
    id?: number;
    latitude: number;
    longitude: number;
    timestamp: number;
    accuracy?: number;
    synced: boolean;
    createdAt: string;
}

class LocalDatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;
    private isInitializing = false;
    private initializationPromise: Promise<void> | null = null;

    async initialize(): Promise<void> {
        // Se já está inicializado, retorna imediatamente
        if (this.db) {
            return;
        }

        // Se já está inicializando, aguarda a inicialização em andamento
        if (this.isInitializing && this.initializationPromise) {
            return this.initializationPromise;
        }

        // Inicia nova inicialização
        this.isInitializing = true;
        this.initializationPromise = this._doInitialize();

        try {
            await this.initializationPromise;
        } finally {
            this.isInitializing = false;
            this.initializationPromise = null;
        }
    }

    private async _doInitialize(): Promise<void> {
        try {
            console.log('🔄 Inicializando banco de dados...');
            
            this.db = await SQLite.openDatabaseAsync(SQLiteConfig.databaseName);
            
            if (!this.db) {
                throw new Error('Falha ao abrir banco de dados');
            }
            
            // Configurar banco com configurações específicas da plataforma
            await this.configureDatabase();
            
            await this.createTables();
            logSQLiteOperation('initialize', true);
        } catch (error) {
            logSQLiteOperation('initialize', false, error);
            this.db = null;
            throw error;
        }
    }

    private async configureDatabase(): Promise<void> {
        if (!this.db) return;

        try {
            const platformConfig = getPlatformConfig();
            
            // Configurar WAL se suportado
            if (platformConfig.enableWAL) {
                await this.db.execAsync('PRAGMA journal_mode=WAL');
            }
            
            // Configurar modo síncrono
            if (platformConfig.synchronous) {
                await this.db.execAsync(`PRAGMA synchronous=${platformConfig.synchronous}`);
            }
            
            // Configurações de performance
            await this.db.execAsync('PRAGMA cache_size=10000');
            await this.db.execAsync('PRAGMA temp_store=MEMORY');
            
            logSQLiteOperation('configure', true);
        } catch (error) {
            logSQLiteOperation('configure', false, error);
            // Não falhar se configuração não funcionar
        }
    }

    private async createTables(): Promise<void> {
        if (!this.db) {
            console.error('❌ Banco de dados não disponível para criar tabelas');
            return;
        }

        try {            
            await this.db.execAsync(`
                CREATE TABLE IF NOT EXISTS locations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    timestamp INTEGER NOT NULL,
                    accuracy REAL,
                    synced BOOLEAN DEFAULT FALSE,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await this.db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_locations_synced 
                ON locations(synced);
            `);

            await this.db.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_locations_timestamp 
                ON locations(timestamp);
            `);
            
        } catch (error) {
            console.error('❌ Erro ao criar tabelas:', error);
            throw error;
        }
    }

    async saveLocation(location: Omit<LocationRecord, 'id' | 'synced' | 'createdAt'>): Promise<number> {
        if (!this.db) {
            await this.initialize();
        }

        if (!this.db) {
            throw new Error('Banco de dados não inicializado');
        }

        try {
            const result = await this.db.runAsync(
                `INSERT INTO locations (latitude, longitude, timestamp, accuracy, synced) 
                 VALUES (?, ?, ?, ?, ?)`,
                [location.latitude, location.longitude, location.timestamp, location.accuracy || null, false]
            );

            return result.lastInsertRowId;
        } catch (error) {
            console.error('❌ Erro ao salvar localização:', error);
            throw error;
        }
    }

    async getUnsyncedLocations(): Promise<LocationRecord[]> {
        if (!this.db) {
            await this.initialize();
        }

        if (!this.db) return [];

        try {
            const result = await this.db.getAllAsync(
                'SELECT * FROM locations WHERE synced = FALSE ORDER BY timestamp ASC'
            );

            return result as LocationRecord[];
        } catch (error) {
            console.error('❌ Erro ao buscar localizações não sincronizadas:', error);
            return [];
        }
    }

    async markAsSynced(ids: number[]): Promise<void> {
        if (!this.db) {
            await this.initialize();
        }

        if (!this.db || ids.length === 0) return;

        try {
            const placeholders = ids.map(() => '?').join(',');
            await this.db.runAsync(
                `UPDATE locations SET synced = TRUE WHERE id IN (${placeholders})`,
                ids
            );
        } catch (error) {
            console.error('❌ Erro ao marcar como sincronizado:', error);
        }
    }

    async deleteSyncedLocations(): Promise<void> {
        if (!this.db) {
            await this.initialize();
        }

        if (!this.db) return;

        try {
            await this.db.runAsync('DELETE FROM locations WHERE synced = TRUE');
        } catch (error) {
            console.error('❌ Erro ao deletar localizações sincronizadas:', error);
        }
    }

    async getLocationCount(): Promise<{ total: number; unsynced: number }> {
        if (!this.db) {
            await this.initialize();
        }

        if (!this.db) return { total: 0, unsynced: 0 };

        try {
            const totalResult = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM locations');
            const unsyncedResult = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM locations WHERE synced = FALSE');

            return {
                total: (totalResult as any)?.count || 0,
                unsynced: (unsyncedResult as any)?.count || 0
            };
        } catch (error) {
            console.error('❌ Erro ao contar localizações:', error);
            return { total: 0, unsynced: 0 };
        }
    }

    async isOnline(): Promise<boolean> {
        try {
            const netInfo = await NetInfo.fetch();
            return netInfo.isConnected === true && netInfo.isInternetReachable === true;
        } catch (error) {
            console.error('❌ Erro ao verificar conexão:', error);
            return false;
        }
    }

    // Método para verificar se o banco está pronto
    isReady(): boolean {
        return this.db !== null;
    }

    // Método para resetar o banco em caso de erro crítico
    async reset(): Promise<void> {
        try {
            if (this.db) {
                await this.db.closeAsync();
            }
        } catch (error) {
            console.warn('⚠️ Erro ao fechar banco:', error);
        }
        
        this.db = null;
        this.isInitializing = false;
        this.initializationPromise = null;
        
        console.log('🔄 Banco de dados resetado');
    }
}

export const localDatabaseService = new LocalDatabaseService();
