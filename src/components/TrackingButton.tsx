import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trackingService, openLocationSettings } from '../services/TrackingService';

interface TrackingButtonProps {
    style?: any;
}

export const TrackingButton: React.FC<TrackingButtonProps> = ({ style }) => {
    const [isTracking, setIsTracking] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [offlineStats, setOfflineStats] = useState({ total: 0, unsynced: 0 });

    useEffect(() => {
        checkTrackingStatus();
        loadOfflineStats();
        
        trackingService.restoreTrackingIfEnabled().then(() => {
            checkTrackingStatus();
        });
        
        const interval = setInterval(loadOfflineStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const checkTrackingStatus = async () => {
        const enabled = await trackingService.isTrackingEnabled();
        setIsTracking(enabled);
    };

    const loadOfflineStats = async () => {
        try {
            const stats = await trackingService.getOfflineStats();
            setOfflineStats(stats);
        } catch (error) { }
    };


    const handleToggleTracking = async () => {
        setIsLoading(true);
        
        try {
            if (isTracking) {
                await trackingService.stopTracking();
                setIsTracking(false);
                await loadOfflineStats();
                Alert.alert('Rastreamento', 'Rastreamento desabilitado com sucesso!');
            } else {
                await trackingService.startTracking();
                setIsTracking(true);
                await loadOfflineStats();
                
                const message = offlineStats.unsynced > 0 
                    ? `Rastreamento habilitado! Sua localização será enviada a cada 10 minutos.\n\nDados offline pendentes: ${offlineStats.unsynced} localizações serão sincronizadas quando houver conexão.\n\n⚠️ Certifique-se de que a localização está habilitada nas configurações do dispositivo.`
                    : 'Rastreamento habilitado! Sua localização será enviada a cada 10 minutos.\n\n⚠️ Certifique-se de que a localização está habilitada nas configurações do dispositivo.';
                Alert.alert('Rastreamento', message);
            }
        } catch (error) {
            Alert.alert(
                'Erro de Localização', 
                'Não foi possível iniciar o rastreamento.\n\nA localização precisa estar habilitada nas configurações do dispositivo.',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { 
                        text: 'Abrir Configurações', 
                        onPress: async () => {
                            try {
                                await openLocationSettings();
                            } catch (settingsError) { }
                        }
                    }
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                isTracking ? styles.buttonActive : styles.buttonInactive,
                style
            ]}
            onPress={handleToggleTracking}
            disabled={isLoading}
        >
            <Ionicons
                name={isTracking ? 'location' : 'location-outline'}
                size={20}
                color="white"
            />
            {offlineStats.unsynced > 0 && (
                <View style={styles.offlineBadge}>
                    <Text style={styles.offlineBadgeText}>{offlineStats.unsynced}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: 7,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonActive: {
        backgroundColor: 'rgba(0,122,255,0.8)',
    },
    buttonInactive: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    offlineBadge: {
        position: 'absolute',
        top: -3,
        right: -3,
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    offlineBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
