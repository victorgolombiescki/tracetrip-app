import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Tabs, router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  House, 
  Receipt, 
  CalendarCheck, 
  MapPin, 
  Plus, 
  Microphone, 
  CaretRight,
  Car,
  Lock
} from 'phosphor-react-native';
import { useAppStore } from '@/src/store/useAppStore';
import { apiClient } from '@/src/services/api/ApiClient';

export default function TabLayout() {
  const [fabOpen, setFabOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { empresaPlano, setEmpresaPlano } = useAppStore();

  useFocusEffect(
    React.useCallback(() => {
      loadEmpresaPlano();
    }, [])
  );

  const loadEmpresaPlano = async () => {
    try {
      const resp = await apiClient.getEmpresa();
      if (resp.success && resp.data) {
        setEmpresaPlano(resp.data.plano || null);
      }
    } catch (error) {
    }
  };

  const moduloDisponivel = (modulo: string): boolean => {
    if (!empresaPlano) return true;
    if (empresaPlano === 'TRACETRIP') return true;
    if (empresaPlano === 'TRACEFROTAS') {
      return modulo === 'Frota';
    }
    return true;
  };

  const handleTabPress = (modulo: string, route: string) => {
    if (!moduloDisponivel(modulo)) {
      Alert.alert(
        'Módulo Indisponível',
        'Este módulo está disponível apenas para assinantes do plano TraceTrip. Atualmente você possui o plano TraceFrotas, que inclui apenas o módulo de Frota.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const icon = (Icon: any, weight: "regular" | "fill" | "duotone" = "regular") => ({ focused }: { focused: boolean }) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon 
        size={24} 
        color={focused ? '#254985' : '#6B7280'} 
        weight={focused ? "fill" : weight} 
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#254985',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 60 + Math.max(insets.bottom, 10),
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderBottomWidth: 0,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingHorizontal: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 6,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 8,
          },
          tabBarItemStyle: {
            paddingBottom: Math.max(insets.bottom / 2, 4),
            height: 60,
            paddingTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Início',
            tabBarIcon: ({ focused }) => icon(House)({ focused }),
          }}
        />
        <Tabs.Screen
          name="despesas"
          options={{
            title: 'Despesas',
            tabBarIcon: ({ focused }) => icon(Receipt)({ focused }),
          }}
        />
        <Tabs.Screen
          name="plus"
          options={{
            title: '',
            tabBarLabel: '',
            tabBarIcon: () => null,
            tabBarButton: () => (
              <View style={styles.centerButtonContainer}>
                <TouchableOpacity
                  style={styles.centerButton}
                  onPress={() => setFabOpen((open) => !open)}
                  activeOpacity={0.9}
                  accessibilityLabel="Abrir menu rápido"
                >
                  <View style={styles.centerButtonCircle}>
                    <Plus size={28} color="#fff" weight="bold" />
                  </View>
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="agendas"
          options={{
            title: 'Agendas',
            tabBarIcon: ({ focused }) => icon(CalendarCheck)({ focused }),
          }}
        />
        <Tabs.Screen
          name="agenda-frota"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="rotas"
          options={{
            title: 'Rotas',
            tabBarIcon: ({ focused }) => icon(MapPin)({ focused }),
          }}
        />
      </Tabs>

      {fabOpen && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setFabOpen(false)}>
          <View style={[
            styles.fabSheet,
            { bottom: 80 + insets.bottom }
          ]}>
            <TouchableOpacity
              style={[
                styles.actionRow, 
                styles.actionRowFirst,
                !moduloDisponivel('Viagens') && styles.actionRowDisabled
              ]}
              onPress={() => {
                if (!moduloDisponivel('Viagens')) {
                  setFabOpen(false);
                  Alert.alert(
                    'Módulo Indisponível',
                    'Este módulo está disponível apenas para assinantes do plano TraceTrip.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                setFabOpen(false);
                router.push('/nova-despesa');
              }}
              accessibilityLabel="Nova despesa"
              disabled={!moduloDisponivel('Viagens')}
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIconWrap}>
                  <Receipt size={20} color="#254985" weight="duotone" />
                </View>
                <View style={styles.actionTexts}>
                  <Text style={styles.actionTitle}>Nova despesa</Text>
                  <Text style={styles.actionSubtitle}>Registrar gasto</Text>
                </View>
              </View>
              <CaretRight size={18} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setFabOpen(false);
                router.push('/nova-ocorrencia');
              }}
              accessibilityLabel="Nova ocorrência"
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIconWrap}>
                  <Microphone size={20} color="#254985" weight="duotone" />
                </View>
                <View style={styles.actionTexts}>
                  <Text style={styles.actionTitle}>Ocorrência</Text>
                  <Text style={styles.actionSubtitle}>Registrar ocorrência</Text>
                </View>
              </View>
              <CaretRight size={18} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                setFabOpen(false);
                router.push('/nova-reserva');
              }}
              accessibilityLabel="Nova reserva"
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIconWrap}>
                  <Car size={20} color="#254985" weight="duotone" />
                </View>
                <View style={styles.actionTexts}>
                  <Text style={styles.actionTitle}>Nova Reserva</Text>
                  <Text style={styles.actionSubtitle}>Reservar veículo</Text>
                </View>
              </View>
              <CaretRight size={18} color="#9CA3AF" weight="bold" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    padding: 6,
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: '#EEF2FF',
  },
  centerButtonContainer: {
    position: 'relative',
    height: 60,
    width: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  centerButton: {
    position: 'absolute',
    top: -22,
    alignSelf: 'center',
    zIndex: 10,
  },
  centerButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#254985',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  fabSheet: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 220,
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionRowFirst: {
    borderTopWidth: 0,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTexts: {
    flexDirection: 'column',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionRowDisabled: {
    opacity: 0.5,
  },
});