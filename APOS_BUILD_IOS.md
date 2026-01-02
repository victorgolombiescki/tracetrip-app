# 📱 O que fazer APÓS o build iOS estar pronto

## ✅ Quando o build terminar, você verá algo assim:

```
✅ Build finished successfully
Artifact URL: https://expo.dev/artifacts/...
```

---

## 🚀 OPÇÕES: O que fazer com o build

### **OPÇÃO 1: Enviar automaticamente para App Store Connect (RECOMENDADO)**

Execute no terminal:
```bash
eas submit --platform ios --profile production
```

**O que vai acontecer:**
- O EAS vai fazer upload do `.ipa` para App Store Connect automaticamente
- Você pode acompanhar o progresso no terminal

**💡 Vantagem:** Mais rápido e automatizado

---

### **OPÇÃO 2: Download manual e upload via Transporter/Xcode**

1. **Baixar o arquivo .ipa:**
   - Acesse o link do Artifact que aparece no final do build
   - Ou execute: `eas build:list --platform ios` para ver todos os builds
   - Baixe o arquivo `.ipa`

2. **Fazer upload para App Store Connect:**
   - Abra o app **Transporter** (disponível na Mac App Store)
   - Ou use o **Xcode** → Window → Organizer
   - Arraste o arquivo `.ipa` e faça upload

**💡 Vantagem:** Mais controle sobre o processo

---

### **OPÇÃO 3: Fazer upload depois via App Store Connect**

Você pode fazer o upload manualmente depois acessando:
- https://appstoreconnect.apple.com
- Meus Apps → TraceTrip → Versão → Adicionar Build

---

## 📋 IMPORTANTE: Antes de submeter para revisão da Apple

Você precisa preparar na App Store Connect:

### ✅ **Informações obrigatórias:**

1. **Screenshots (OBRIGATÓRIO):**
   - iPhone 6.7" (1290 x 2796 pixels): 3-10 imagens
   - iPhone 6.5" (1242 x 2688 pixels): 3-10 imagens  
   - iPhone 5.5" (1242 x 2208 pixels): 3-10 imagens
   - Pode tirar screenshots do seu app rodando no simulador

2. **Descrição do App:**
   - Nome do app
   - Subtítulo (até 30 caracteres)
   - Descrição completa (até 4000 caracteres)
   - Palavras-chave (até 100 caracteres)

3. **Categoria:**
   - Categoria primária
   - Categoria secundária (opcional)

4. **Informações de contato:**
   - Email de suporte
   - URL de suporte
   - Política de privacidade (URL obrigatória!)

5. **Classificação etária:**
   - Responda as perguntas sobre conteúdo

6. **Informações de preço:**
   - Preço (grátis ou pago)
   - Disponibilidade por país

---

## 🎯 PASSO A PASSO COMPLETO APÓS BUILD

### **Passo 1: Aguardar build finalizar**
⏱️ Tempo: 15-30 minutos
📊 Acompanhe em: https://expo.dev/accounts/victorgolombiescki/projects/trace-trip/builds

### **Passo 2: Enviar para App Store Connect**
```bash
eas submit --platform ios --profile production
```

### **Passo 3: Aguardar processamento na Apple**
⏱️ Tempo: 10-30 minutos
📊 Acompanhe em: https://appstoreconnect.apple.com

### **Passo 4: Adicionar informações no App Store Connect**
1. Acesse: https://appstoreconnect.apple.com
2. Vá em: **Meus Apps** → **TraceTrip**
3. Selecione a versão (ex: 1.0.3)
4. Adicione:
   - Screenshots
   - Descrição
   - Categoria
   - Política de privacidade
   - Etc.

### **Passo 5: Enviar para revisão**
1. Após preencher tudo, clique em **"Enviar para revisão"**
2. Aguarde a revisão da Apple
⏱️ Tempo médio: 1-3 dias (pode variar)

### **Passo 6: App publicado! 🎉**
Quando aprovado, seu app estará disponível na App Store!

---

## 🔍 COMANDOS ÚTEIS

### Ver status dos builds:
```bash
eas build:list --platform ios
```

### Ver detalhes de um build:
```bash
eas build:view [BUILD_ID]
```

### Ver status do submit:
```bash
eas submit:list --platform ios
```

---

## ⚠️ TROUBLESHOOTING

### Problema: "Build not found in App Store Connect"
**Solução:** Aguarde alguns minutos após o upload. Pode demorar até 30 minutos para processar.

### Problema: "Missing compliance information"
**Solução:** Na App Store Connect, responda as perguntas de export compliance.

### Problema: "Missing privacy policy"
**Solução:** Você DEVE adicionar uma URL de política de privacidade. Crie uma página web com sua política.

### Problema: "Missing screenshots"
**Solução:** Screenshots são OBRIGATÓRIOS. Tire screenshots do app e faça upload.

---

## 📝 CHECKLIST FINAL

Antes de enviar para revisão, confirme:
- [ ] Build gerado com sucesso
- [ ] Build enviado para App Store Connect
- [ ] Build processado e visível no App Store Connect
- [ ] Screenshots adicionados (todas as resoluções)
- [ ] Descrição do app completa
- [ ] Categoria selecionada
- [ ] Política de privacidade (URL) adicionada
- [ ] Classificação etária respondida
- [ ] Email de suporte configurado
- [ ] Todas as informações obrigatórias preenchidas
- [ ] App revisado e testado localmente
- [ ] Versão e buildNumber corretos

---

## 🎉 PRÓXIMAS VERSÕES

Quando precisar fazer um novo build (atualização):

1. **Atualizar versão no `app.json`:**
   ```json
   "version": "1.0.4"  // Incrementar
   ```

2. **Atualizar buildNumber no `app.json`:**
   ```json
   "ios": {
     "buildNumber": "2"  // Incrementar
   }
   ```

3. **Gerar novo build:**
   ```bash
   eas build --platform ios --profile production
   ```

4. **Enviar para App Store:**
   ```bash
   eas submit --platform ios --profile production
   ```

---

**✨ Parabéns! Seu app está quase na App Store!**

