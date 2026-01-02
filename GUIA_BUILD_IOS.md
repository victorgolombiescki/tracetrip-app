# 📱 Guia Completo: Build iOS para App Store

## ✅ Pré-requisitos (você já tem):
- ✅ Conta Apple Developer ativa
- ✅ Projeto configurado
- ✅ EAS CLI instalado
- ✅ Logado no EAS (victorgolombiescki)

---

## 🚀 PASSO A PASSO COMPLETO

### **PASSO 1: Navegar para o diretório do projeto**
```bash
cd /Users/diego/Documents/projetos/tracetrip-app
```

### **PASSO 2: Verificar se está tudo certo**
```bash
eas whoami
```
**Resultado esperado:** `victorgolombiescki` ✅

### **PASSO 3: Configurar credenciais do iOS (PRIMEIRA VEZ)**

Execute o comando:
```bash
eas credentials
```

**O que vai acontecer:**
1. Vai perguntar a plataforma → Digite: **`ios`** (ou pressione Enter se iOS estiver selecionado)
2. Vai perguntar o profile → Digite: **`production`** (ou pressione Enter)
3. Vai perguntar o que fazer → Selecione: **`Setup everything automatically`**
4. Vai perguntar se quer fazer login na Apple → Digite: **`yes`**
5. Vai pedir seu **Apple ID** (email da conta Apple Developer)
6. Vai pedir sua **senha** da Apple (pode pedir código de verificação 2FA)
7. Vai pedir o **App-Specific Password** se tiver 2FA ativado

**💡 Dica:** Se pedir App-Specific Password:
- Acesse: https://appleid.apple.com/account/manage
- Em "Segurança" → "App-Specific Passwords"
- Crie uma nova senha e use ela

**✅ Quando terminar:** Você verá "Credentials configured successfully"

---

### **PASSO 4: Gerar o Build de Produção**

Execute o comando:
```bash
eas build --platform ios --profile production
```

**O que vai acontecer:**
1. Vai perguntar se quer fazer login na Apple (se ainda não estiver logado) → Digite: **`yes`**
2. Vai iniciar o processo de build na nuvem
3. Você verá uma mensagem como: "Build started, it may take a few minutes..."
4. Você receberá um **link para acompanhar o progresso**

**⏱️ Tempo estimado:** 15-30 minutos

**📊 Durante o build, você pode:**
- Ver o progresso no link fornecido
- Ou executar: `eas build:list --platform ios` para ver o status

**✅ Quando terminar:** Você verá algo como:
```
✅ Build finished successfully
Download: https://expo.dev/artifacts/...
```

---

### **PASSO 5: Submeter para App Store (OPCIONAL - pode fazer depois)**

Se quiser enviar automaticamente para App Store Connect:
```bash
eas submit --platform ios --profile production
```

**Ou pode fazer manualmente depois via:**
https://appstoreconnect.apple.com

---

## 📋 CHECKLIST ANTES DE COMEÇAR

Antes de executar os comandos, confirme:
- [ ] Está no diretório correto: `/Users/diego/Documents/projetos/tracetrip-app`
- [ ] Tem acesso à conta Apple Developer
- [ ] Sabe suas credenciais da Apple (email e senha)
- [ ] Tem App-Specific Password (se tiver 2FA ativado)

---

## 🔍 COMANDOS ÚTEIS DURANTE O PROCESSO

### Ver lista de builds:
```bash
eas build:list --platform ios
```

### Ver detalhes de um build específico:
```bash
eas build:view [BUILD_ID]
```

### Ver status em tempo real:
Acesse o link que aparece após iniciar o build, ou:
https://expo.dev/accounts/victorgolombiescki/projects/trace-trip/builds

---

## ⚠️ TROUBLESHOOTING

### Problema: "Credentials not found"
**Solução:** Execute `eas credentials` novamente (PASSO 3)

### Problema: "Apple login failed"
**Solução:** 
- Verifique se está usando App-Specific Password (se tem 2FA)
- Tente fazer login manualmente em https://appleid.apple.com primeiro

### Problema: "Build failed"
**Solução:**
- Execute `eas build:view [BUILD_ID]` para ver os logs
- Verifique se todas as configurações no `app.json` estão corretas

### Problema: "Bundle identifier already exists"
**Solução:** O bundle identifier já está em uso. Você precisa:
- Usar outro bundle identifier no `app.json`, OU
- Acessar App Store Connect e criar o app lá primeiro

---

## 📝 NOTAS IMPORTANTES

1. **Primeira vez:** O PASSO 3 (credentials) pode demorar alguns minutos
2. **Builds subsequentes:** Só precisa executar o PASSO 4
3. **Custos:** Os primeiros builds do EAS são gratuitos, depois há um plano pago
4. **Versão:** Sempre que fizer novo build, atualize a versão no `app.json` antes

---

## 🎯 RESUMO DOS COMANDOS PRINCIPAIS

```bash
# 1. Ir para o diretório
cd /Users/diego/Documents/projetos/tracetrip-app

# 2. Configurar credenciais (PRIMEIRA VEZ)
eas credentials

# 3. Gerar build
eas build --platform ios --profile production

# 4. (Opcional) Submeter para App Store
eas submit --platform ios --profile production
```

---

## 📞 PRECISA DE AJUDA?

- Documentação EAS: https://docs.expo.dev/build/introduction/
- Status dos builds: https://expo.dev/accounts/victorgolombiescki/projects/trace-trip/builds
- Suporte Expo: https://forums.expo.dev/

---

**✨ Bom trabalho! Siga os passos acima e seu app estará pronto para a App Store!**

