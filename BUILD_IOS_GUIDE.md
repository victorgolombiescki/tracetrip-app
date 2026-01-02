# 📱 Guia de Build iOS para App Store

## ✅ Configurações já realizadas:
- ✅ app.json atualizado com permissões iOS necessárias
- ✅ buildNumber configurado
- ✅ eas.json com perfil de production
- ✅ Versões sincronizadas (1.0.3)

## 🚀 Passos para Build e Publicação:

### 1. Atualizar Credenciais do iOS (Primeira vez ou quando necessário)
```bash
eas credentials
# Selecione: iOS > production > Setup everything automatically
```

### 2. Gerar Build de Produção para iOS
```bash
eas build --platform ios --profile production
```

Este comando irá:
- Criar o build na nuvem do EAS
- Gerar automaticamente certificados e perfis de provisionamento
- Compilar o app para iOS
- Demora aproximadamente 15-30 minutos

### 3. Após o Build Completar

Você receberá:
- ✅ Link para download do `.ipa`
- ✅ Ou build automaticamente enviado para App Store Connect (se configurado)

### 4. Submeter para App Store

#### Opção A: Automática (Recomendado)
```bash
eas submit --platform ios --profile production
```

#### Opção B: Manual via App Store Connect
1. Acesse: https://appstoreconnect.apple.com
2. Vá em "Meus Apps" > TraceTrip
3. Selecione a versão
4. Adicione informações necessárias (screenshots, descrição, etc)
5. Envie para revisão

### 5. Informações Importantes para App Store Connect

Antes de submeter, você precisa ter:
- ✅ Descrição do app
- ✅ Screenshots (requeridos):
  - iPhone 6.7" (1290 x 2796 pixels) - 3-10 imagens
  - iPhone 6.5" (1242 x 2688 pixels) - 3-10 imagens
  - iPhone 5.5" (1242 x 2208 pixels) - 3-10 imagens
- ✅ Ícone do app (já configurado: ./assets/icone_t.png)
- ✅ Categoria
- ✅ Classificação etária
- ✅ Política de Privacidade (URL)
- ✅ Termos de Uso (opcional)

### 6. Verificar Status do Build
```bash
eas build:list --platform ios
```

### 7. Próximos Builds (Versões Futuras)

Sempre que precisar fazer um novo build:
1. Atualizar versão no `app.json` (ex: "1.0.4")
2. Atualizar `buildNumber` no `app.json` iOS (ex: "2")
3. Executar: `eas build --platform ios --profile production`

## 📋 Checklist Pré-Build:
- [ ] Versão atualizada no app.json
- [ ] buildNumber incrementado
- [ ] Todas as funcionalidades testadas
- [ ] Screenshots prontos
- [ ] Descrição do app preparada
- [ ] Conta Apple Developer ativa

## ⚠️ Observações:
- O build pode falhar se não tiver Apple Developer Account configurada
- Certifique-se de ter créditos no EAS (primeiros builds são gratuitos)
- O processo pode levar até 30 minutos

## 🔗 Links Úteis:
- App Store Connect: https://appstoreconnect.apple.com
- EAS Build Status: https://expo.dev/accounts/victorgolombiescki/projects/trace-trip/builds
- Documentação EAS: https://docs.expo.dev/build/introduction/
