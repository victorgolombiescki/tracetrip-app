import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Navigation } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { RotasDetalhesApi, DetalhesRotaResponse } from '@/src/services/api/modules/rotas-detalhes';

export default function RotaMapaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<DetalhesRotaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.action === 'openGoogleMaps') {
        openGoogleMaps(data.lat, data.lng, data.nome);
      }
    } catch (error) {
      console.error('Erro ao processar mensagem do WebView:', error);
    }
  };

  useEffect(() => {
    if (id) {
      loadRotaData();
    }
  }, [id]);

  const loadRotaData = async () => {
    try {
      setLoading(true);
      
      const response = await RotasDetalhesApi.getDetalhesRota(Number(id));
      
      if (response.success && response.data) {
        setDetalhe(response.data);
      } else {
        const errorMessage = response.message || 'Não foi possível carregar os dados da rota';
        console.error('❌ Erro ao carregar rota:', errorMessage);
        
        // Não mostra alerta se for timeout - o ApiClient já mostra toast
        if (!errorMessage.includes('demorou demais') && !errorMessage.includes('Tempo esgotado')) {
          Alert.alert('Erro', errorMessage, [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          // Se for timeout, apenas volta após um delay
          setTimeout(() => {
            router.back();
          }, 2000);
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar rota:', error);
      const errorMessage = error?.message || 'Não foi possível carregar os dados da rota';
      
      // Não mostra alerta duplicado se já foi mostrado pelo ApiClient
      if (!errorMessage.includes('demorou demais') && !errorMessage.includes('timeout')) {
        Alert.alert('Erro', errorMessage, [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        setTimeout(() => {
          router.back();
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = (lat: number, lng: number, nome: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o Google Maps');
    });
  };

  const openInGoogleMaps = () => {
    if (!detalhe?.enderecos || detalhe.enderecos.length < 2) {
      Alert.alert('Aviso', 'É necessário pelo menos 2 pontos para abrir no Google Maps');
      return;
    }

    const firstPoint = detalhe.enderecos[0];
    const lastPoint = detalhe.enderecos[detalhe.enderecos.length - 1];
    const url = `https://www.google.com/maps/dir/${firstPoint.latitude},${firstPoint.longitude}/${lastPoint.latitude},${lastPoint.longitude}`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o mapa');
    });
  };

  const generateMapHTML = () => {
    let enderecosParaUsar = detalhe?.enderecos || [];
    
    const sortedEnderecos = enderecosParaUsar.sort((a, b) => a.ordem - b.ordem);
    
    const coordinates = sortedEnderecos
      .filter(endereco => {
        const hasValidCoords = endereco.latitude && endereco.longitude && 
                              !isNaN(endereco.latitude) && !isNaN(endereco.longitude) &&
                              endereco.latitude !== 0 && endereco.longitude !== 0;
        return hasValidCoords;
      })
      .map(endereco => ({
        lat: Number(endereco.latitude),
        lng: Number(endereco.longitude),
        nome: (endereco.local?.nome || endereco.endereco || 'Ponto').replace(/'/g, "\\'").replace(/"/g, '\\"'),
        endereco: (endereco.local?.endereco || endereco.endereco || '').replace(/'/g, "\\'").replace(/"/g, '\\"'),
        ordem: endereco.ordem
      }));

    if (coordinates.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mapa da Rota</title>
          <style>
            body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .error { text-align: center; padding: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="error">
            <h3>Nenhum ponto de localização encontrado</h3>
            <p>Esta rota não possui endereços com coordenadas válidas.</p>
          </div>
        </body>
        </html>
      `;
    }

    const centerLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
    const centerLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length;

    // Otimização: preparar dados dos markers de forma eficiente
    const markersData = coordinates.map((coord, index) => {
      let adjustedLat = coord.lat;
      let adjustedLng = coord.lng;
      
      for (let i = 0; i < index; i++) {
        if (coordinates[i].lat === coord.lat && coordinates[i].lng === coord.lng) {
          const offsetDistance = 0.001;
          adjustedLat += (index % 2 === 0 ? offsetDistance : -offsetDistance);
          adjustedLng += (index % 2 === 0 ? offsetDistance : -offsetDistance);
          break;
        }
      }
      
      const endereco = sortedEnderecos[index];
      const dataVisita = endereco.dataVisita ? new Date(endereco.dataVisita).toLocaleDateString('pt-BR') : 'Data não informada';
      const horarioChegada = endereco.horarioChegada || 'Horário não informado';
      const horarioSaida = endereco.horarioSaida || 'Horário não informado';
      const color = index === 0 ? 'green' : index === coordinates.length - 1 ? 'red' : 'blue';
      
      return {
        lat: adjustedLat,
        lng: adjustedLng,
        nome: coord.nome,
        endereco: coord.endereco,
        dataVisita,
        horarioChegada,
        horarioSaida,
        color,
        index
      };
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mapa da Rota</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100%; }
          .custom-marker { background: transparent !important; border: none !important; }
          .leaflet-popup-content { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          /* Remover marca d'água do Leaflet */
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          try {
            const map = L.map('map', {
              zoomControl: true,
              attributionControl: false
            }).setView([${centerLat}, ${centerLng}], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              minZoom: 3
            }).addTo(map);
            
            // Dados dos markers
            const markersData = ${JSON.stringify(markersData)};
            
            // Criar markers de forma otimizada
            const markers = [];
            const group = new L.featureGroup();
            
            markersData.forEach(function(markerInfo) {
              const popupHTML = '<div style="min-width:250px;padding:8px;"><h4 style="margin:0 0 12px 0;color:' + markerInfo.color + ';font-size:16px;text-align:center;">📍 Ponto ' + (markerInfo.index + 1) + '</h4><div style="margin-bottom:12px;"><p style="margin:0 0 6px 0;font-size:13px;font-weight:bold;color:#333;">' + markerInfo.nome.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p><p style="margin:0 0 8px 0;font-size:12px;color:#666;line-height:1.4;">' + markerInfo.endereco.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></div><div style="background:#f8f9fa;padding:8px;border-radius:6px;margin-bottom:12px;"><p style="margin:0 0 4px 0;font-size:11px;color:#666;"><strong>📅 Data:</strong> ' + markerInfo.dataVisita.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p><p style="margin:0 0 4px 0;font-size:11px;color:#666;"><strong>🕐 Chegada:</strong> ' + markerInfo.horarioChegada.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p><p style="margin:0;font-size:11px;color:#666;"><strong>🕐 Saída:</strong> ' + markerInfo.horarioSaida.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p></div><button onclick="window.ReactNativeWebView.postMessage(JSON.stringify({action:\\'openGoogleMaps\\',lat:' + markerInfo.lat + ',lng:' + markerInfo.lng + ',nome:\\'' + markerInfo.nome.replace(/'/g, "\\'") + '\\'}))" style="width:100%;background:#4285f4;color:white;border:none;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:bold;cursor:pointer;">🗺️ Abrir no Google Maps</button></div>';
              
              const marker = L.marker([markerInfo.lat, markerInfo.lng], {
                icon: L.divIcon({
                  html: '<div style="background:' + markerInfo.color + ';border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;border:3px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.4);">' + (markerInfo.index + 1) + '</div>',
                  className: 'custom-marker',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })
              }).bindPopup(popupHTML);
              
              marker.addTo(map);
              markers.push(marker);
              group.addLayer(marker);
            });
            
            // Ajustar zoom para mostrar todos os markers
            if (group.getLayers().length > 0) {
              map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 16 });
            }
          } catch (error) {
            console.error('Erro ao carregar mapa:', error);
            document.body.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Erro ao carregar o mapa. Por favor, tente novamente.</div>';
          }
        </script>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mapa da Rota</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Carregando mapa...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detalhe) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mapa da Rota</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Nenhum dado encontrado.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header Compacto */}
        <LinearGradient colors={["#254985", "#254985"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{detalhe?.rota?.nome || 'Mapa da Rota'}</Text>
              {detalhe?.enderecos && detalhe.enderecos.length > 0 && (
                <Text style={styles.headerSubtitle}>
                  {detalhe.enderecos.length} ponto{detalhe.enderecos.length !== 1 ? 's' : ''} {detalhe?.estatisticas?.distanciaTotal ? `• ${detalhe.estatisticas.distanciaTotal.toFixed(1)} km` : ''}
                </Text>
              )}
            </View>
            {detalhe?.enderecos && detalhe.enderecos.length >= 2 && (
              <TouchableOpacity
                style={styles.googleMapsButton}
                onPress={openInGoogleMaps}
                activeOpacity={0.7}
              >
                <Navigation size={20} color="white" />
              </TouchableOpacity>
            )}
            {(!detalhe?.enderecos || detalhe.enderecos.length < 2) && (
              <View style={styles.placeholder} />
            )}
          </View>
        </LinearGradient>

      {/* Mapa Full Screen */}
      <View style={styles.mapContainer}>
        {mapError ? (
          <View style={styles.mapErrorContainer}>
            <Text style={styles.mapErrorTitle}>Erro ao carregar mapa</Text>
            <Text style={styles.mapErrorText}>{mapError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setMapError(null);
                setMapLoading(true);
              }}
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            style={styles.mapWebView}
            source={{ html: generateMapHTML() }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onLoadStart={() => {
              setMapLoading(true);
              setMapError(null);
            }}
            onLoadEnd={() => setMapLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ Erro no WebView:', nativeEvent);
              setMapError('Não foi possível carregar o mapa. Verifique sua conexão.');
              setMapLoading(false);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error('❌ Erro HTTP no WebView:', nativeEvent);
              setMapError('Erro ao carregar recursos do mapa.');
              setMapLoading(false);
            }}
            onMessage={handleWebViewMessage}
            renderLoading={() => (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color="#254985" />
                <Text style={styles.mapLoadingText}>Carregando mapa...</Text>
              </View>
            )}
          />
        )}
        
        {mapLoading && !mapError && (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#254985" />
            <Text style={styles.mapLoadingText}>Carregando mapa...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  googleMapsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mapWebView: {
    flex: 1,
  },
  mapLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  mapLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  backButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  mapErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  mapErrorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  mapErrorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#254985',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});