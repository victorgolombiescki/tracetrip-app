import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';

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

    async initialize(): Promise<void> {
        try {
            this.db = await SQLite.openDatabaseAsync('tracking.db');
            
            if (!this.db) {
                throw new Error('Falha ao abrir banco de dados');
            }
            
            await this.createTables();
        } catch (error) {
            console.error('❌ Erro ao inicializar banco local:', error);
            setTimeout(() => {
                this.initialize().catch(console.error);
            }, 1000);
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
            throw new Error('Banco de dados não inicializado');
        }

        const result = await this.db.runAsync(
            `INSERT INTO locations (latitude, longitude, timestamp, accuracy, synced) 
             VALUES (?, ?, ?, ?, ?)`,
            [location.latitude, location.longitude, location.timestamp, location.accuracy || null, false]
        );

        return result.lastInsertRowId;
    }

    async getUnsyncedLocations(): Promise<LocationRecord[]> {
        if (!this.db) return [];

        const result = await this.db.getAllAsync(
            'SELECT * FROM locations WHERE synced = FALSE ORDER BY timestamp ASC'
        );

        return result as LocationRecord[];
    }

    async markAsSynced(ids: number[]): Promise<void> {
        if (!this.db || ids.length === 0) return;

        const placeholders = ids.map(() => '?').join(',');
        await this.db.runAsync(
            `UPDATE locations SET synced = TRUE WHERE id IN (${placeholders})`,
            ids
        );
    }

    async deleteSyncedLocations(): Promise<void> {
        if (!this.db) return;

        const result = await this.db.runAsync('DELETE FROM locations WHERE synced = TRUE');
    }

    async getLocationCount(): Promise<{ total: number; unsynced: number }> {
        if (!this.db) return { total: 0, unsynced: 0 };

        const totalResult = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM locations');
        const unsyncedResult = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM locations WHERE synced = FALSE');

        return {
            total: (totalResult as any)?.count || 0,
            unsynced: (unsyncedResult as any)?.count || 0
        };
    }

    async isOnline(): Promise<boolean> {
        const netInfo = await NetInfo.fetch();
        return netInfo.isConnected === true && netInfo.isInternetReachable === true;
    }
}

export const localDatabaseService = new LocalDatabaseService();
