import { localDatabaseService } from './LocalDatabaseService';

class DatabaseInitializer {
    private static instance: DatabaseInitializer;
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    private constructor() {}

    static getInstance(): DatabaseInitializer {
        if (!DatabaseInitializer.instance) {
            DatabaseInitializer.instance = new DatabaseInitializer();
        }
        return DatabaseInitializer.instance;
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._doInitialize();
        
        try {
            await this.initializationPromise;
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ DatabaseInitializer: Erro na inicialização:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    private async _doInitialize(): Promise<void> {
        try {
            await localDatabaseService.initialize();
        } catch (error) {
            console.error('❌ DatabaseInitializer: Falha na inicialização:', error);
            throw error;
        }
    }

    isReady(): boolean {
        return this.isInitialized && localDatabaseService.isReady();
    }

    async reset(): Promise<void> {
        try {
            await localDatabaseService.reset();
            this.isInitialized = false;
            this.initializationPromise = null;
        } catch (error) {
            console.error('❌ DatabaseInitializer: Erro no reset:', error);
        }
    }
}

export const databaseInitializer = DatabaseInitializer.getInstance();


