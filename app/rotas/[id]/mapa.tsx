import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Navigation, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { RotasDetalhesApi, DetalhesRotaResponse } from '@/src/services/api/modules/rotas-detalhes';

export default function RotaMapaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detalhe, setDetalhe] = useState<DetalhesRotaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(false);

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
    console.log('[Mapa] Componente montado');
    console.log('[Mapa] id recebido:', id);
    console.log('[Mapa] Tipo do id:', typeof id);
    
    if (id) {
      console.log('[Mapa] Iniciando carregamento dos dados da rota...');
      loadRotaData();
    } else {
      console.warn('[Mapa] Nenhum id fornecido!');
    }
  }, [id]);

  const loadRotaData = async () => {
    try {
      console.log('[Mapa] loadRotaData iniciado');
      console.log('[Mapa] id recebido (não será usado na API):', id);
      setLoading(true);
      
      console.log('[Mapa] Chamando API getDetalhesRota (sem id - API usa viagem atual)');
      const response = await RotasDetalhesApi.getDetalhesRota();
      
      console.log('[Mapa] Resposta completa da API:', JSON.stringify(response, null, 2));
      console.log('[Mapa] response.success:', response.success);
      console.log('[Mapa] response.data:', response.data);
      console.log('[Mapa] response.message:', response.message);
      
      if (response.success && response.data) {
        // A API pode retornar {success: true, data: {data: {...}}} ou {success: true, data: {...}}
        const detalhesData = (response.data as any).data || response.data;
        console.log('[Mapa] Dados extraídos:', JSON.stringify(detalhesData, null, 2));
        console.log('[Mapa] detalhesData.rota:', detalhesData?.rota);
        console.log('[Mapa] detalhesData.enderecos:', detalhesData?.enderecos);
        console.log('[Mapa] Quantidade de endereços:', detalhesData?.enderecos?.length || 0);
        
        setDetalhe(detalhesData);
        console.log('[Mapa] Estado detalhe atualizado com sucesso');
      } else {
        console.error('[Mapa] Resposta da API não foi bem-sucedida');
        console.error('[Mapa] Mensagem de erro:', response.message);
        Alert.alert('Erro', response.message || 'Não foi possível carregar os dados da rota');
      }
    } catch (error) {
      console.error('[Mapa] ❌ Erro ao carregar rota:', error);
      console.error('[Mapa] Tipo do erro:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[Mapa] Mensagem do erro:', error instanceof Error ? error.message : String(error));
      console.error('[Mapa] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      Alert.alert('Erro', 'Não foi possível carregar os dados da rota');
    } finally {
      console.log('[Mapa] Finalizando loadRotaData');
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
    console.log('[Mapa] generateMapHTML chamado');
    console.log('[Mapa] detalhe:', detalhe);
    console.log('[Mapa] detalhe?.enderecos:', detalhe?.enderecos);
    
    let enderecosParaUsar = detalhe?.enderecos || [];
    console.log('[Mapa] enderecosParaUsar (antes do sort):', enderecosParaUsar.length, 'endereços');
    
    const sortedEnderecos = enderecosParaUsar.sort((a, b) => a.ordem - b.ordem);
    console.log('[Mapa] sortedEnderecos:', sortedEnderecos.length, 'endereços ordenados');
    
    const coordinates = sortedEnderecos
      .filter(endereco => {
        const hasValidCoords = endereco.latitude && endereco.longitude && 
                              !isNaN(endereco.latitude) && !isNaN(endereco.longitude);
        if (!hasValidCoords) {
          console.warn('[Mapa] Endereço sem coordenadas válidas:', endereco);
        }
        return hasValidCoords;
      })
      .map(endereco => ({
        lat: endereco.latitude,
        lng: endereco.longitude,
        nome: endereco.local?.nome || endereco.endereco,
        endereco: endereco.local?.endereco || endereco.endereco,
        ordem: endereco.ordem
      }));
    
    console.log('[Mapa] coordinates filtradas:', coordinates.length, 'coordenadas válidas');
    console.log('[Mapa] coordinates:', coordinates);

    if (coordinates.length === 0) {
      console.error('[Mapa] Nenhuma coordenada válida encontrada!');
      console.error('[Mapa] Retornando HTML com mensagem estilizada');
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mapa da Rota</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              height: 100vh; 
              width: 100%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .empty-state {
              text-align: center;
              padding: 40px 20px;
              color: white;
            }
            .empty-icon {
              font-size: 80px;
              margin-bottom: 20px;
              opacity: 0.9;
            }
            .empty-title {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 12px;
              color: white;
            }
            .empty-message {
              font-size: 16px;
              opacity: 0.9;
              line-height: 1.5;
              max-width: 300px;
              margin: 0 auto;
              color: rgba(255, 255, 255, 0.95);
            }
          </style>
        </head>
        <body>
          <div class="empty-state">
            <div class="empty-icon">📍</div>
            <h1 class="empty-title">Nenhum Local Vinculado</h1>
            <p class="empty-message">Esta rota ainda não possui locais cadastrados. Adicione locais para visualizar no mapa.</p>
          </div>
        </body>
        </html>
      `;
    }
    
    const centerLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length;
    const centerLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length;
    console.log('[Mapa] Centro do mapa calculado:', { centerLat, centerLng });

    const markers = coordinates.map((coord, index) => {
      const color = index === 0 ? 'green' : index === coordinates.length - 1 ? 'red' : 'blue';
      
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
        
        const popupHTML = `
          <div style="min-width: 250px; padding: 8px;">
            <h4 style="margin: 0 0 12px 0; color: ${color}; font-size: 16px; text-align: center;">📍 Ponto ${index + 1}</h4>
            
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #333;">${coord.nome}</p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; line-height: 1.4;">${coord.endereco}</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 8px; border-radius: 6px; margin-bottom: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #666;"><strong>📅 Data:</strong> ${dataVisita}</p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #666;"><strong>🕐 Chegada:</strong> ${horarioChegada}</p>
              <p style="margin: 0; font-size: 11px; color: #666;"><strong>🕐 Saída:</strong> ${horarioSaida}</p>
            </div>
            
            <button onclick="window.ReactNativeWebView.postMessage(JSON.stringify({action: 'openGoogleMaps', lat: ${adjustedLat}, lng: ${adjustedLng}, nome: '${coord.nome}'}))" 
                    style="width: 100%; background: #4285f4; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer;">
              🗺️ Abrir no Google Maps
            </button>
          </div>
        `;
      
      return `
        L.marker([${adjustedLat}, ${adjustedLng}], {
          icon: L.divIcon({
            html: '<div style="background: ${color}; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4);">${index + 1}</div>',
            className: 'custom-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })
        }).addTo(map).bindPopup(\`${popupHTML}\`);
      `;
    }).join('\n');

    const htmlTemplate = `
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
          /* Esconder atribuição do Leaflet */
          .leaflet-control-attribution { display: none !important; }
          a[href*="leaflet"] { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          const map = L.map('map').setView([${centerLat}, ${centerLng}], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ''
          }).addTo(map);
          
          ${markers}
          
          const group = new L.featureGroup();
          ${coordinates.map((coord, index) => {
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
            
            return `group.addLayer(L.marker([${adjustedLat}, ${adjustedLng}]));`;
          }).join('\n')}
          
          map.fitBounds(group.getBounds(), { padding: [30, 30] });
        </script>
      </body>
      </html>
    `;
    
    console.log('[Mapa] HTML gerado com sucesso, tamanho:', htmlTemplate.length, 'caracteres');
    return htmlTemplate;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#2563EB", "#1D4ED8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
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
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyStateIcon}>
            <MapPin size={64} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyStateTitle}>Nenhum Dado Encontrado</Text>
          <Text style={styles.emptyStateMessage}>
            Não foi possível carregar os dados da rota. Verifique sua conexão e tente novamente.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.emptyStateButton}>
            <Text style={styles.emptyStateButtonText}>Voltar</Text>
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
            <Text style={styles.headerSubtitle}>
              {detalhe?.enderecos?.length || 3} pontos • {detalhe?.estatisticas?.distanciaTotal?.toFixed(1) || '15.2'} km
            </Text>
          </View>
          <TouchableOpacity
            style={styles.googleMapsButton}
            onPress={openInGoogleMaps}
            activeOpacity={0.7}
          >
            <Navigation size={20} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Mapa Full Screen */}
      <View style={styles.mapContainer}>
        <WebView
          style={styles.mapWebView}
          source={{ html: generateMapHTML() }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onLoadStart={() => {
            console.log('[Mapa] WebView onLoadStart');
            setMapLoading(true);
          }}
          onLoadEnd={() => {
            console.log('[Mapa] WebView onLoadEnd');
            setMapLoading(false);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[Mapa] WebView erro:', nativeEvent);
            console.error('[Mapa] Código do erro:', nativeEvent.code);
            console.error('[Mapa] Descrição do erro:', nativeEvent.description);
          }}
          onMessage={handleWebViewMessage}
          renderLoading={() => (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.mapLoadingText}>Carregando mapa...</Text>
            </View>
          )}
        />
        
        {mapLoading && (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#2563EB" />
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F9FAFB',
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyStateButton: {
    backgroundColor: '#254985',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});