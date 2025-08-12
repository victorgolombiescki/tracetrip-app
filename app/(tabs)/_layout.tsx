import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  House, 
  Receipt, 
  CalendarCheck, 
  MapPin, 
  Plus, 
  Microphone, 
  CaretRight 
} from 'phosphor-react-native';

export default function TabLayout() {
  const [fabOpen, setFabOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const icon = (Icon: any, weight: "regular" | "fill" | "duotone" = "regular") => ({ focused }: { focused: boolean }) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon 
        size={24} 
        color={focused ? '#1E40AF' : '#6B7280'} 
        weight={focused ? "fill" : weight} 
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#1E40AF',
          tabBarInactiveTintColor: '#6B7280',
          tabBarStyle: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 60 + insets.bottom,
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            paddingTop: 8,
            paddingBottom: insets.bottom,
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
            paddingBottom: insets.bottom > 0 ? 0 : 8,
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
              style={[styles.actionRow, styles.actionRowFirst]}
              onPress={() => {
                setFabOpen(false);
                router.push('/nova-despesa');
              }}
              accessibilityLabel="Nova despesa"
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIconWrap}>
                  <Receipt size={20} color="#1E40AF" weight="duotone" />
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
                  <Microphone size={20} color="#1E40AF" weight="duotone" />
                </View>
                <View style={styles.actionTexts}>
                  <Text style={styles.actionTitle}>Ocorrência</Text>
                  <Text style={styles.actionSubtitle}>Registrar ocorrência</Text>
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
  },
  centerButton: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    zIndex: 10,
  },
  centerButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E40AF',
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
});