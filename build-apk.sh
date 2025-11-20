#!/bin/bash

# Script para gerar APK localmente (muito mais rápido que EAS)

set -e

echo "🚀 Iniciando build local do APK..."

cd "$(dirname "$0")"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -d "android" ]; then
    echo "❌ Diretório android não encontrado. Execute este script na raiz do projeto."
    exit 1
fi

# Verificar se existe keystore
KEYSTORE_PATH="android/app/debug.keystore"
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo -e "${YELLOW}⚠️  Keystore não encontrado. Criando keystore de debug...${NC}"
    keytool -genkeypair -v -storetype PKCS12 -keystore "$KEYSTORE_PATH" -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android -dname "CN=Android Debug,O=Android,C=US"
fi

# 1. Limpar builds anteriores (opcional, mas recomendado)
echo -e "${YELLOW}🧹 Limpando builds anteriores...${NC}"
cd android
./gradlew clean

# 2. Gerar APK de release (gera bundle automaticamente, como o EAS faz)
echo -e "${YELLOW}📦 Gerando APK de release (gera bundle automaticamente)...${NC}"
./gradlew assembleRelease

# 3. Localizar o APK gerado
APK_PATH="app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    echo -e "${GREEN}✅ APK gerado com sucesso!${NC}"
    echo -e "${GREEN}📱 Localização: $(pwd)/$APK_PATH${NC}"
    echo ""
    echo "Para instalar no dispositivo conectado:"
    echo "  adb install -r $APK_PATH"
    echo ""
    echo "Ou copie o arquivo para o dispositivo e instale manualmente."
else
    echo "❌ Erro: APK não encontrado em $APK_PATH"
    exit 1
fi


