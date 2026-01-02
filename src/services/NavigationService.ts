import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { trackingService } from './TrackingService';

const NAVIGATION_TASK_NAME = 'background-navigation';
const GEOFENCING_TASK_NAME = 'background-geofencing';

export interface RouteDestination {
    id: string;
    latitude: number;
    longitude: number;
    name: string;
    address: string;
    order: number;
}

export interface NavigationData {
    currentLocation: Location.LocationObject;
    destination: RouteDestination;
    distance: number;
    bearing: number;
    estimatedTime: number;
    instruction: string;
}

class NavigationService {
    activeRoute: RouteDestination[] | null = null;
    currentDestinationIndex: number = 0;
    navigationCallback: ((data: NavigationData) => void) | null = null;
    private geofenceRegions: Map<string, { latitude: number; longitude: number; radius: number; name: string }> = new Map();

    /**
     * Inicia navegação para uma rota com múltiplos destinos
     * Fornece orientação turn-by-turn e alertas de chegada
     */
    async startNavigation(route: RouteDestination[], onUpdate?: (data: NavigationData) => void): Promise<boolean> {
        try {
            const { status } = await Location.requestBackgroundPermissionsAsync();
            if (status !== 'granted') {
                return false;
            }

            this.activeRoute = route;
            this.currentDestinationIndex = 0;
            this.navigationCallback = onUpdate || null;

            // Registra geofences para cada destino
            for (const dest of route) {
                this.registerGeofence(dest.id, dest.latitude, dest.longitude, 100, dest.name);
            }

            // Inicia monitoramento de localização para navegação
            try {
                const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(NAVIGATION_TASK_NAME);
                if (!isTaskRegistered) {
                    await Location.startLocationUpdatesAsync(NAVIGATION_TASK_NAME, {
                        accuracy: Location.Accuracy.Highest,
                        timeInterval: 5000,
                        distanceInterval: 10,
                        foregroundService: {
                            notificationTitle: 'TraceTrip Navegação',
                            notificationBody: 'Navegação ativa para o destino',
                            notificationColor: '#1E40AF',
                        },
                        showsBackgroundLocationIndicator: true,
                    });
                }
            } catch (error) {
                console.error('Erro ao iniciar navegação:', error);
            }

            return true;
        } catch (error) {
            console.error('Erro ao iniciar navegação:', error);
            return false;
        }
    }

    /**
     * Para a navegação ativa
     */
    async stopNavigation(): Promise<void> {
        try {
            this.activeRoute = null;
            this.currentDestinationIndex = 0;
            this.navigationCallback = null;
            this.geofenceRegions.clear();

            const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(NAVIGATION_TASK_NAME);
            if (isTaskRegistered) {
                await Location.stopLocationUpdatesAsync(NAVIGATION_TASK_NAME);
            }
        } catch (error) {
            console.error('Erro ao parar navegação:', error);
        }
    }

    /**
     * Calcula distância e direção para o próximo destino
     * Método público para uso em tasks de background
     */
    calculateNavigationData(
        currentLocation: Location.LocationObject,
        destination: RouteDestination
    ): NavigationData {
        const lat1 = currentLocation.coords.latitude;
        const lon1 = currentLocation.coords.longitude;
        const lat2 = destination.latitude;
        const lon2 = destination.longitude;

        const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
        const bearing = this.calculateBearing(lat1, lon1, lat2, lon2);
        const estimatedTime = this.estimateTime(distance, currentLocation.coords.speed || 0);
        const instruction = this.getInstruction(bearing, distance);

        return {
            currentLocation,
            destination,
            distance,
            bearing,
            estimatedTime,
            instruction,
        };
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
     * Calcula direção (bearing) entre duas coordenadas
     */
    private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x =
            Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

        const bearing = Math.atan2(y, x);
        return ((bearing * 180) / Math.PI + 360) % 360;
    }

    /**
     * Estima tempo de chegada baseado na distância e velocidade
     */
    private estimateTime(distance: number, speed: number): number {
        if (speed <= 0) {
            // Assume velocidade média de 50 km/h se não houver velocidade
            speed = 50 * 1000 / 3600; // m/s
        }
        return distance / speed; // segundos
    }

    /**
     * Gera instrução de navegação baseada na direção
     */
    private getInstruction(bearing: number, distance: number): string {
        if (distance < 50) {
            return 'Você chegou ao destino';
        } else if (distance < 200) {
            return 'Aproximando-se do destino';
        }

        const directions = [
            'Norte',
            'Nordeste',
            'Leste',
            'Sudeste',
            'Sul',
            'Sudoeste',
            'Oeste',
            'Noroeste',
        ];

        const index = Math.round(bearing / 45) % 8;
        const direction = directions[index];

        const distanceKm = (distance / 1000).toFixed(1);
        return `Siga na direção ${direction} por ${distanceKm} km`;
    }

    /**
     * Registra uma região de geofence para alertas de chegada
     */
    private registerGeofence(id: string, latitude: number, longitude: number, radius: number, name: string): void {
        this.geofenceRegions.set(id, { latitude, longitude, radius, name });
    }

    /**
     * Verifica se a localização atual está dentro de alguma região de geofence
     * Método público para uso em tasks de background
     */
    checkGeofences(location: Location.LocationObject): string | null {
        for (const [id, region] of this.geofenceRegions.entries()) {
            const distance = this.calculateDistance(
                location.coords.latitude,
                location.coords.longitude,
                region.latitude,
                region.longitude
            );

            if (distance <= region.radius) {
                return id;
            }
        }
        return null;
    }

    /**
     * Obtém o próximo destino da rota
     */
    getCurrentDestination(): RouteDestination | null {
        if (!this.activeRoute || this.currentDestinationIndex >= this.activeRoute.length) {
            return null;
        }
        return this.activeRoute[this.currentDestinationIndex];
    }

    /**
     * Avança para o próximo destino
     */
    advanceToNextDestination(): boolean {
        if (!this.activeRoute) {
            return false;
        }

        if (this.currentDestinationIndex < this.activeRoute.length - 1) {
            this.currentDestinationIndex++;
            return true;
        }

        return false;
    }
}

// Task para navegação em background
TaskManager.defineTask(NAVIGATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Erro na task de navegação:', error);
        return;
    }

    try {
        if (data && typeof data === 'object' && 'locations' in data) {
            const locations = (data as any).locations as Location.LocationObject[];
            const latestLocation = locations[locations.length - 1];

            if (latestLocation) {
                const navService = navigationService;
                const destination = navService.getCurrentDestination();

                if (destination) {
                    const navData = navService.calculateNavigationData(latestLocation, destination);
                    
                    // Verifica geofences
                    const geofenceId = navService.checkGeofences(latestLocation);
                    if (geofenceId) {
                        // Usuário chegou em um destino
                        // Aqui você pode enviar uma notificação ou callback
                        console.log('Chegou ao destino:', geofenceId);
                    }

                    // Chama callback se disponível
                    if (navService.navigationCallback) {
                        navService.navigationCallback(navData);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erro ao processar navegação:', error);
    }
});

export const navigationService = new NavigationService();

