import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { localDatabaseService } from './LocalDatabaseService';

const GEOFENCING_TASK_NAME = 'geofencing-monitoring';

export interface GeofenceRegion {
    id: string;
    latitude: number;
    longitude: number;
    radius: number; 
    name: string;
    routeId?: string;
    addressId?: string;
}

class GeofencingService {
    regions: Map<string, GeofenceRegion> = new Map();
    enteredRegions: Set<string> = new Set();
    onRegionEnter?: (region: GeofenceRegion) => void;
    onRegionExit?: (region: GeofenceRegion) => void;

    /**
     * Inicializa o serviço de geofencing
     */
    async initialize(): Promise<boolean> {
        try {
            const { status } = await Location.requestBackgroundPermissionsAsync();
            if (status !== 'granted') {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erro ao inicializar geofencing:', error);
            return false;
        }
    }

    /**
     * Adiciona uma região de geofence para monitoramento
     */
    addRegion(region: GeofenceRegion): void {
        this.regions.set(region.id, region);
    }

    /**
     * Remove uma região de geofence
     */
    removeRegion(regionId: string): void {
        this.regions.delete(regionId);
        this.enteredRegions.delete(regionId);
    }

    /**
     * Adiciona múltiplas regiões (útil para uma rota completa)
     */
    addRegions(regions: GeofenceRegion[]): void {
        regions.forEach(region => this.addRegion(region));
    }

    /**
     * Remove todas as regiões
     */
    clearRegions(): void {
        this.regions.clear();
        this.enteredRegions.clear();
    }

    /**
     * Inicia o monitoramento de geofences
     */
    async startMonitoring(
        onRegionEnter?: (region: GeofenceRegion) => void,
        onRegionExit?: (region: GeofenceRegion) => void
    ): Promise<boolean> {
        try {
            this.onRegionEnter = onRegionEnter;
            this.onRegionExit = onRegionExit;

            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK_NAME);
            if (!isTaskRegistered) {
                await Location.startLocationUpdatesAsync(GEOFENCING_TASK_NAME, {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 10000,
                    distanceInterval: 50,
                    foregroundService: {
                        notificationTitle: 'TraceTrip Monitoramento',
                        notificationBody: 'Monitorando chegadas aos destinos',
                        notificationColor: '#1E40AF',
                    },
                    showsBackgroundLocationIndicator: true,
                });
            }

            return true;
        } catch (error) {
            console.error('Erro ao iniciar monitoramento:', error);
            return false;
        }
    }

    /**
     * Para o monitoramento de geofences
     */
    async stopMonitoring(): Promise<void> {
        try {
            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCING_TASK_NAME);
            if (isTaskRegistered) {
                await Location.stopLocationUpdatesAsync(GEOFENCING_TASK_NAME);
            }
        } catch (error) {
            console.error('Erro ao parar monitoramento:', error);
        }
    }

    /**
     * Verifica se uma localização está dentro de uma região
     * Método público para uso em tasks de background
     */
    isLocationInRegion(
        latitude: number,
        longitude: number,
        region: GeofenceRegion
    ): boolean {
        const distance = this.calculateDistance(
            latitude,
            longitude,
            region.latitude,
            region.longitude
        );
        return distance <= region.radius;
    }

    /**
     * Calcula distância entre duas coordenadas (Haversine)
     */
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Raio da Terra em metros
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Registra chegada ao destino no banco de dados local
     * A notificação será enviada pelo sistema quando o app estiver em foreground
     * Método público para uso em tasks de background
     */
    async recordArrival(region: GeofenceRegion): Promise<void> {
        try {
            // Registra a chegada no banco local para sincronização posterior
            // Isso também pode ser usado para notificações quando o app estiver ativo
            console.log('📍 Chegada ao destino:', region.name);
            
            // Aqui você pode adicionar lógica para salvar no banco de dados
            // ou enviar para a API quando disponível
        } catch (error) {
            console.error('Erro ao registrar chegada:', error);
        }
    }
}

// Task para monitoramento de geofences em background
TaskManager.defineTask(GEOFENCING_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Erro na task de geofencing:', error);
        return;
    }

    try {
        if (data && typeof data === 'object' && 'locations' in data) {
            const locations = (data as any).locations as Location.LocationObject[];
            const latestLocation = locations[locations.length - 1];

            if (latestLocation) {
                const geofenceService = geofencingService;

                // Verifica cada região
                for (const [regionId, region] of geofenceService.regions.entries()) {
                    const isInside = geofenceService.isLocationInRegion(
                        latestLocation.coords.latitude,
                        latestLocation.coords.longitude,
                        region
                    );

                    const wasInside = geofenceService.enteredRegions.has(regionId);

                    if (isInside && !wasInside) {
                        // Entrou na região
                        geofenceService.enteredRegions.add(regionId);
                        await geofenceService.recordArrival(region);

                        if (geofenceService.onRegionEnter) {
                            geofenceService.onRegionEnter(region);
                        }
                    } else if (!isInside && wasInside) {
                        // Saiu da região
                        geofenceService.enteredRegions.delete(regionId);

                        if (geofenceService.onRegionExit) {
                            geofenceService.onRegionExit(region);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erro ao processar geofencing:', error);
    }
});

export const geofencingService = new GeofencingService();
