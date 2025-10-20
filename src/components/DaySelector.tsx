import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_WIDTH = (SCREEN_WIDTH - 40) / 7;

interface DaySelectorProps {
  visibleDays: string[];
  filterDate: string | null;
  setFilterDate: (date: string) => void;
  countsByDate: Record<string, number>;
  onVisibleDaysChange: (first: number, last: number) => void;
}

export const DaySelector = ({ 
  visibleDays, 
  filterDate, 
  setFilterDate, 
  countsByDate, 
  onVisibleDaysChange 
}: DaySelectorProps) => {
  const scrollViewRef = useRef<ScrollView>(null);
  
  useEffect(() => {
    if (!filterDate || !scrollViewRef.current) return;
    
    const dayIndex = visibleDays.findIndex(day => day === filterDate);
    if (dayIndex < 0) return;
    
    const itemWidth = DAY_WIDTH + 8;
    
    const leftOffset = SCREEN_WIDTH * 0.01;
    const scrollPosition = Math.max(0, dayIndex * itemWidth - leftOffset);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: scrollPosition,
        animated: true
      });
    }, 300);
  }, [filterDate, visibleDays]);
  
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const itemWidth = DAY_WIDTH + 8;
    const firstVisibleIndex = Math.floor(offsetX / itemWidth);
    const visibleCount = Math.ceil(SCREEN_WIDTH / itemWidth);
    const lastVisibleIndex = Math.min(firstVisibleIndex + visibleCount, visibleDays.length - 1);
    
    onVisibleDaysChange(firstVisibleIndex, lastVisibleIndex);
  };
  
  const formatDayName = (isoDate: string) => {
    try {
      const date = new Date(isoDate);
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
      const dayNum = date.getDate();
      return { dayName, dayNum };
    } catch (e) {
      return { dayName: '', dayNum: 0 };
    }
  };
  
  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingLeft: SCREEN_WIDTH * 0.2, 
          paddingRight: SCREEN_WIDTH * 0.5, 
          gap: 8
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
      >
        {visibleDays.map(day => {
          const { dayName, dayNum } = formatDayName(day);
          const isSelected = day === filterDate;
          const hasEvents = countsByDate[day] && countsByDate[day] > 0;
          const isToday = day === new Date().toISOString().slice(0, 10);
          const isFirstDayOfMonth = day.endsWith('-01');
          const monthName = isFirstDayOfMonth ? 
            new Date(day).toLocaleDateString('pt-BR', { month: 'short' }) : '';
          
          return (
            <TouchableOpacity 
              key={day} 
              style={[
                styles.dayItem, 
                isSelected && styles.dayItemSelected,
                isToday && styles.dayItemToday,
                isFirstDayOfMonth && styles.dayItemMonthStart
              ]}
              onPress={() => setFilterDate(day)}
            >
              {isFirstDayOfMonth && (
                <Text style={styles.monthIndicator}>{monthName}</Text>
              )}
              <Text style={[styles.dayName, isSelected && styles.dayTextSelected]}>{dayName}</Text>
              <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected]}>{dayNum}</Text>
              {hasEvents && <View style={[styles.dayEventIndicator, isSelected && styles.dayEventIndicatorSelected]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contentContainer: {
    paddingHorizontal: SCREEN_WIDTH / 2 - DAY_WIDTH / 2,
    gap: 8,
  },
  dayItem: {
    width: DAY_WIDTH,
    height: DAY_WIDTH * 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },
  dayItemSelected: {
    backgroundColor: '#254985',
  },
  dayItemToday: {
    backgroundColor: '#E0E7FF',
    borderWidth: 1,
    borderColor: '#254985',
  },
  dayItemMonthStart: {
    marginTop: 10,
  },
  monthIndicator: {
    position: 'absolute',
    top: -12,
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dayName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  dayTextSelected: {
    color: 'white',
  },
  dayEventIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#254985',
    position: 'absolute',
    bottom: 8,
  },
  dayEventIndicatorSelected: {
    backgroundColor: 'white',
  },
}); 