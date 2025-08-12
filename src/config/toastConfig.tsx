import React from 'react';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';

export const toastConfig: ToastConfig = {
  success: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#10B981',
        backgroundColor: '#F0FDF4',
        borderLeftWidth: 6,
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 8,
      }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#065F46',
      }}
      text2Style={{
        fontSize: 14,
        color: '#047857',
        marginTop: 2,
      }}
    />
  ),
  error: (props) => (
    <ErrorToast
      {...props}
      style={{
        borderLeftColor: '#EF4444',
        backgroundColor: '#FEF2F2',
        borderLeftWidth: 6,
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 8,
      }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#991B1B',
      }}
      text2Style={{
        fontSize: 14,
        color: '#B91C1C',
        marginTop: 2,
      }}
    />
  ),
  info: (props) => (
    <BaseToast
      {...props}
      style={{
        borderLeftColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
        borderLeftWidth: 6,
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 8,
      }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#1E40AF',
      }}
      text2Style={{
        fontSize: 14,
        color: '#2563EB',
        marginTop: 2,
      }}
    />
  ),
}; 