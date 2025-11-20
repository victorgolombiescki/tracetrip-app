#!/bin/bash

echo "🔥 Rebuild Limpo com Firebase"
echo "================================"
echo ""

cd "$(dirname "$0")"

echo "1️⃣ Limpando build anterior..."
cd android
./gradlew clean
cd ..

echo ""
echo "2️⃣ Verificando arquivos do Firebase..."
if [ ! -f "android/app/google-services.json" ]; then
    echo "❌ ERRO: android/app/google-services.json não encontrado!"
    exit 1
fi

if [ ! -f "google-services.json" ]; then
    echo "❌ ERRO: google-services.json na raiz não encontrado!"
    exit 1
fi

echo "✅ Arquivos do Firebase encontrados"

echo ""
echo "3️⃣ Fazendo rebuild do app..."
echo "   Isso pode levar alguns minutos..."
echo ""

npx expo run:android

echo ""
echo "✅ Rebuild concluído!"
echo ""
echo "📱 Após instalar, verifique nos logs:"
echo "   ✅ Token de push notification obtido"
echo "   ✅ Token push registrado com sucesso no backend"
echo ""
echo "❌ Se ainda aparecer MISSING_INSTANCEID_SERVICE:"
echo "   1. Verifique se o package name está correto: com.tracetrip.app"
echo "   2. Verifique se o google-services.json está correto no Firebase Console"
echo "   3. Tente fazer um EAS Build: eas build --profile apk --platform android --clear-cache"








