import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { MapPin, Navigation, ExternalLink } from 'lucide-react-native';
import { EnderecoRotaDetalhes } from '@/src/services/api/modules/rotas-detalhes';

interface RotaMapaProps {
    enderecos: EnderecoRotaDetalhes[];
    onMarkerPress?: (endereco: EnderecoRotaDetalhes) => void;
}

export default function RotaMapa({ enderecos, onMarkerPress }: RotaMapaProps) {
    const [selectedEndereco, setSelectedEndereco] = useState<EnderecoRotaDetalhes | null>(null);

    const getTipoIcon = (tipo: string) => {
        switch (tipo.toLowerCase()) {
            case 'inicio':
                return '🏁';
            case 'fim':
                return '🏁';
            case 'aeroporto':
                return '✈️';
            case 'intermediario':
                return '📍';
            default:
                return '📍';
        }
    };

    const getTipoColor = (tipo: string) => {
        switch (tipo.toLowerCase()) {
            case 'inicio':
                return '#2563EB';
            case 'fim':
                return '#DC2626';
            case 'aeroporto':
                return '#7C3AED';
            default:
                return '#F59E0B';
        }
    };

    const openInMaps = (endereco: EnderecoRotaDetalhes) => {
        const { latitude, longitude, endereco: enderecoTexto } = endereco;
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        
        Linking.openURL(url).catch(() => {
            Alert.alert('Erro', 'Não foi possível abrir o mapa');
        });
    };

    const openRouteInMaps = () => {
        if (enderecos.length < 2) return;
        
        const firstPoint = enderecos[0];
        const lastPoint = enderecos[enderecos.length - 1];
        
        const url = `https://www.google.com/maps/dir/${firstPoint.latitude},${firstPoint.longitude}/${lastPoint.latitude},${lastPoint.longitude}`;
        
        Linking.openURL(url).catch(() => {
            Alert.alert('Erro', 'Não foi possível abrir o mapa');
        });
    };

    return (
        <View style={styles.container}>
            {/* Header com botões de ação */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.routeButton}
                    onPress={openRouteInMaps}
                >
                    <Navigation size={20} color="white" />
                    <Text style={styles.routeButtonText}>Ver Rota Completa</Text>
                </TouchableOpacity>
            </View>

            {/* Lista de pontos da rota */}
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {enderecos
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((endereco, index) => (
                        <TouchableOpacity
                            key={endereco.id}
                            style={[
                                styles.pointItem,
                                selectedEndereco?.id === endereco.id && styles.selectedPointItem
                            ]}
                            onPress={() => {
                                setSelectedEndereco(endereco);
                                onMarkerPress?.(endereco);
                            }}
                        >
                            <View style={styles.pointLeft}>
                                <View style={[
                                    styles.orderBadge,
                                    { backgroundColor: getTipoColor(endereco.tipo) }
                                ]}>
                                    <Text style={styles.orderText}>{endereco.ordem}</Text>
                                </View>
                                
                                {index < enderecos.length - 1 && (
                                    <View style={styles.connectorLine} />
                                )}
                            </View>
                            
                            <View style={styles.pointContent}>
                                <View style={styles.pointHeader}>
                                    <Text style={styles.pointIcon}>{getTipoIcon(endereco.tipo)}</Text>
                                    <View style={styles.pointInfo}>
                                        <Text style={styles.pointAddress}>{endereco.endereco}</Text>
                                        <Text style={styles.pointType}>{endereco.tipo}</Text>
                                    </View>
                                    
                                    <TouchableOpacity
                                        style={styles.mapButton}
                                        onPress={() => openInMaps(endereco)}
                                    >
                                        <ExternalLink size={16} color="#2563EB" />
                                    </TouchableOpacity>
                                </View>
                                
                                {endereco.local && (
                                    <View style={styles.localInfo}>
                                        <Text style={styles.localName}>{endereco.local.nome}</Text>
                                        <Text style={styles.localContact}>
                                            {endereco.local.telefone && `${endereco.local.telefone}`}
                                            {endereco.local.email && ` • ${endereco.local.email}`}
                                        </Text>
                                    </View>
                                )}
                                
                                {(endereco.dataVisita || endereco.horarioChegada) && (
                                    <View style={styles.scheduleInfo}>
                                        {endereco.dataVisita && (
                                            <Text style={styles.scheduleText}>
                                                📅 {new Date(endereco.dataVisita).toLocaleDateString('pt-BR')}
                                            </Text>
                                        )}
                                        
                                        {endereco.horarioChegada && (
                                            <Text style={styles.scheduleText}>
                                                🕐 Chegada: {endereco.horarioChegada.substring(0, 5)}
                                            </Text>
                                        )}
                                        
                                        {endereco.horarioSaida && (
                                            <Text style={styles.scheduleText}>
                                                🕐 Saída: {endereco.horarioSaida.substring(0, 5)}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                
                                {endereco.checkinRealizado && (
                                    <View style={styles.checkinBadge}>
                                        <Text style={styles.checkinText}>✅ Check-in realizado</Text>
                                        {endereco.dataCheckin && (
                                            <Text style={styles.checkinDate}>
                                                em {new Date(endereco.dataCheckin).toLocaleDateString('pt-BR')}
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
            </ScrollView>

            {/* Informações do ponto selecionado */}
            {selectedEndereco && (
                <View style={styles.selectedInfo}>
                    <Text style={styles.selectedTitle}>
                        {selectedEndereco.ordem}. {selectedEndereco.endereco}
                    </Text>
                    <Text style={styles.selectedType}>{selectedEndereco.tipo}</Text>
                    <Text style={styles.selectedCoords}>
                        📍 {selectedEndereco.latitude.toFixed(6)}, {selectedEndereco.longitude.toFixed(6)}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    routeButton: {
        backgroundColor: '#2563EB',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    routeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
        padding: 16,
    },
    pointItem: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    selectedPointItem: {
        borderWidth: 2,
        borderColor: '#2563EB',
    },
    pointLeft: {
        alignItems: 'center',
        marginRight: 16,
    },
    orderBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    orderText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    connectorLine: {
        width: 2,
        height: 20,
        backgroundColor: '#E5E7EB',
        marginTop: 8,
    },
    pointContent: {
        flex: 1,
    },
    pointHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    pointIcon: {
        fontSize: 20,
    },
    pointInfo: {
        flex: 1,
    },
    pointAddress: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    pointType: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    mapButton: {
        padding: 8,
    },
    localInfo: {
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    localName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    localContact: {
        fontSize: 12,
        color: '#6B7280',
    },
    scheduleInfo: {
        marginBottom: 8,
    },
    scheduleText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    checkinBadge: {
        backgroundColor: '#ECFDF5',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
    },
    checkinText: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '600',
        marginBottom: 2,
    },
    checkinDate: {
        fontSize: 11,
        color: '#6B7280',
    },
    selectedInfo: {
        backgroundColor: 'white',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    selectedTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    selectedType: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    selectedCoords: {
        fontSize: 12,
        color: '#9CA3AF',
        fontFamily: 'monospace',
    },
});
