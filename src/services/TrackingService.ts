import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { authService } from './auth/AuthService';
import { localDatabaseService } from './LocalDatabaseService';

const TRACKING_INTERVAL = 10 * 60 * 1000;
const BACKGROUND_TASK_NAME = 'background-location-tracking';

export interface LocationData {
    latitude: number;
    longitude: number;
    timestamp: number;
    accuracy?: number;
    altitude?: number;
    speed?: number;
    heading?: number;
}

async function sendOrStoreLocation(locationData: LocationData): Promise<void> {
    const sent = await sendLocationToAPI(locationData);
    if (!sent) {
        try {
            await localDatabaseService.saveLocation({
                latitude: locationData.latitude,
                longitude: locationData.longitude,
                timestamp: locationData.timestamp,
                accuracy: locationData.accuracy,
            });
        } catch (error) {
            console.error('❌ Erro ao salvar localização offline:', error);
        }
    }
}

async function getAuthToken(): Promise<string | null> {
    try {
        const storedAuth = await authService.getStoredAuth();
        return storedAuth?.token || null;
    } catch (error) {
        console.error('Erro ao obter token:', error);
        return null;
    }
}


async function sendLocationToAPI(locationData: LocationData): Promise<boolean> {
    try {
        const apiUrl = String(process.env.EXPO_PUBLIC_API_BASE_URL);
        if (!apiUrl || apiUrl === 'undefined') {
            return false;
        }

        const token = await getAuthToken();
        if (!token) {
            return false;
        }

        const payload = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: locationData.timestamp,
            accuracy: locationData.accuracy,
            altitude: locationData.altitude,
            speed: locationData.speed,
            heading: locationData.heading,
        };

        const response = await fetch(`${apiUrl}/rastreamento/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload)
        });

        return response.ok;
    } catch (error) {
        return false;
    }
}

TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ data, error }) => {
    if (error) {
        return;
    }

    try {
        const trackingEnabled = await SecureStore.getItemAsync('tracking_enabled');
        if (trackingEnabled !== 'true') {
            return;
        }

        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        if (!isLocationEnabled) {
            return;
        }

        let location;
        try {
            location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });
        } catch (firstError) {
            try {
                location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Lowest
                });
            } catch (secondError) {
                const lastKnownLocation = await Location.getLastKnownPositionAsync();
                if (lastKnownLocation) {
                    location = lastKnownLocation;
                } else {
                    return;
                }
            }
        }

        const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: Date.now(),
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude || undefined,
            speed: location.coords.speed || undefined,
            heading: location.coords.heading || undefined,
        };

        await sendOrStoreLocation(locationData);
    } catch (error) { }
});

class TrackingService {
    private isTracking = false;
    private intervalId: NodeJS.Timeout | null = null;

    async initializeTracking(): Promise<boolean> {
        try {
            await localDatabaseService.initialize();
            const isLocationEnabled = await Location.hasServicesEnabledAsync();
            if (!isLocationEnabled) {
                return false;
            }

            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return false;
            }

            try {
                const backgroundStatus = await Location.getBackgroundPermissionsAsync();
                if (backgroundStatus.status !== 'granted') {
                    await Location.requestBackgroundPermissionsAsync();
                }
            } catch (bgError) { }

            return true;
        } catch (error) {
            return false;
        }
    }

    async startTracking(): Promise<void> {
        if (this.isTracking) {
            return;
        }

        const hasPermission = await this.initializeTracking();
        if (!hasPermission) {
            throw new Error('Permissões de localização necessárias');
        }

        this.isTracking = true;
        await SecureStore.setItemAsync('tracking_enabled', 'true');

        await this.syncPendingLocations();
        await this.sendLocationUpdate();

        this.intervalId = setInterval(async () => {
            await this.syncPendingLocations();
            await this.sendLocationUpdate();
        }, TRACKING_INTERVAL);

        try {
            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
            if (!isTaskRegistered) {
                await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: TRACKING_INTERVAL,
                    distanceInterval: 0,
                    foregroundService: {
                        notificationTitle: 'TraceTrip Rastreamento',
                        notificationBody: 'Rastreamento ativo quando minimizado',
                        notificationColor: '#1E40AF',
                        killServiceOnDestroy: false,
                    },
                    deferredUpdatesInterval: TRACKING_INTERVAL,
                    deferredUpdatesDistance: 0,
                });
            }
        } catch (error) {
        }
    }

    async stopTracking(): Promise<void> {
        if (!this.isTracking) {
            return;
        }

        this.isTracking = false;
        await SecureStore.setItemAsync('tracking_enabled', 'false');

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        try {
            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
            if (isTaskRegistered) {
                await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME);
            }
        } catch (error) {}
    }

    async isTrackingEnabled(): Promise<boolean> {
        try {
            const enabled = await SecureStore.getItemAsync('tracking_enabled');
            return enabled === 'true';
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            return false;
        }
    }

    async restoreTrackingIfEnabled(): Promise<void> {
        try {
            const wasEnabled = await this.isTrackingEnabled();
            if (wasEnabled && !this.isTracking) {
                const hasPermission = await this.initializeTracking();
                if (hasPermission) {
                    this.isTracking = true;

                    await this.syncPendingLocations();
                    await this.sendLocationUpdate();

                    this.intervalId = setInterval(async () => {
                        await this.syncPendingLocations();
                        await this.sendLocationUpdate();
                    }, TRACKING_INTERVAL);

                    try {
                        const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
                        if (!isTaskRegistered) {
                            await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
                                accuracy: Location.Accuracy.Balanced,
                                timeInterval: TRACKING_INTERVAL,
                                distanceInterval: 0,
                                foregroundService: {
                                    notificationTitle: 'TraceTrip Rastreamento',
                                    notificationBody: 'Rastreamento ativo quando minimizado',
                                    notificationColor: '#1E40AF',
                                    killServiceOnDestroy: false,
                                },
                                deferredUpdatesInterval: TRACKING_INTERVAL,
                                deferredUpdatesDistance: 0,
                            });
                        }
                    } catch (error) {  }
                } else {
                    await SecureStore.setItemAsync('tracking_enabled', 'false');
                }
            }
        } catch (error) {}
    }

    private async sendLocationUpdate(): Promise<void> {
        try {
            const isLocationEnabled = await Location.hasServicesEnabledAsync();
            if (!isLocationEnabled) {
                return;
            }

            const { status } = await Location.getForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }

            let location;
            try {
                location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced
                });
            } catch (firstError) {
                try {
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Lowest
                    });
                } catch (secondError) {
                    const lastKnownLocation = await Location.getLastKnownPositionAsync();
                    if (lastKnownLocation) {
                        location = lastKnownLocation;
                    } else {
                        return;
                    }
                }
            }

            const locationData: LocationData = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                timestamp: Date.now(),
                accuracy: location.coords.accuracy,
                altitude: location.coords.altitude || undefined,
                speed: location.coords.speed || undefined,
                heading: location.coords.heading || undefined,
            };

            await sendOrStoreLocation(locationData);
        } catch (error) { }
    }

    async getOfflineStats(): Promise<{ total: number; unsynced: number }> {
        try {
            return await localDatabaseService.getLocationCount();
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas offline:', error);
            return { total: 0, unsynced: 0 };
        }
    }

    async openLocationSettings(): Promise<void> {
        try {
            await Location.requestForegroundPermissionsAsync();
        } catch (error) {
            console.error('Erro ao abrir configurações:', error);
        }
    }
}

export const trackingService = new TrackingService();

async function trySyncBatch(): Promise<void> {
    try {
        const online = await localDatabaseService.isOnline();
        if (!online) return;

        const unsynced = await localDatabaseService.getUnsyncedLocations();
        if (!unsynced || unsynced.length === 0) return;

        const successIds: number[] = [];
        for (const rec of unsynced) {
            const ok = await sendLocationToAPI({
                latitude: rec.latitude,
                longitude: rec.longitude,
                timestamp: rec.timestamp,
                accuracy: rec.accuracy,
            });
            if (ok && rec.id) successIds.push(rec.id);
        }

        if (successIds.length > 0) {
            await localDatabaseService.markAsSynced(successIds);
            await localDatabaseService.deleteSyncedLocations();
        }
    } catch (error) {
        console.error('❌ Erro ao sincronizar lote:', error);
    }
}

// Add as method on prototype without changing class shape significantly
(TrackingService.prototype as any).syncPendingLocations = async function(): Promise<void> {
    await trySyncBatch();
};