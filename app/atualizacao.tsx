import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpCircle, X } from 'lucide-react-native';
import { versionCheckService, VersaoInfo } from '@/src/services/VersionCheckService';

interface AtualizacaoScreenProps {
    versaoInfo: VersaoInfo;
    onClose?: () => void;
}

export default function AtualizacaoScreen({ versaoInfo, onClose }: AtualizacaoScreenProps) {
    const handleAtualizar = async () => {
        await versionCheckService.abrirLoja(versaoInfo.urlAtualizacao);
    };

    const isObrigatoria = versaoInfo.atualizacaoObrigatoria;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                {!isObrigatoria && onClose && (
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={20} color="#6B7280" />
                    </TouchableOpacity>
                )}

                <View style={styles.iconWrapper}>
                    <View style={styles.iconCircle}>
                        <ArrowUpCircle size={48} color="#1E40AF" strokeWidth={1.5} />
                    </View>
                </View>

                <Text style={styles.title}>
                    Nova versão disponível
                </Text>

                <Text style={styles.subtitle}>
                    Versão {versaoInfo.versaoAtual}
                </Text>

                <View style={styles.versionBadge}>
                    <Text style={styles.versionBadgeText}>
                        v{versionCheckService.getCurrentVersion()} → v{versaoInfo.versaoAtual}
                    </Text>
                </View>

                <Text style={styles.description}>
                    {versaoInfo.mensagem || 'Atualize para a versão mais recente e aproveite as melhorias e novos recursos.'}
                </Text>

                <TouchableOpacity
                    style={styles.updateButton}
                    onPress={handleAtualizar}
                    activeOpacity={0.8}
                >
                    <Text style={styles.updateButtonText}>
                        Atualizar agora
                    </Text>
                </TouchableOpacity>

                {isObrigatoria && (
                    <Text style={styles.requiredText}>
                        Esta atualização é obrigatória
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    iconWrapper: {
        marginBottom: 32,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#EFF6FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    versionBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 24,
    },
    versionBadgeText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#374151',
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    updateButton: {
        backgroundColor: '#1E40AF',
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 12,
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        shadowColor: '#1E40AF',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    updateButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    requiredText: {
        fontSize: 13,
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 20,
        fontWeight: '500',
    },
});

