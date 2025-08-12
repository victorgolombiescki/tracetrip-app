# TraceTrip - Plano de Testes Manuais

## 🔄 Cenários Offline/Online

### Conectividade
- [ ] **Startup Offline**: App inicia sem internet → mostra dados locais
- [ ] **Perda de Conexão**: Durante uso → indicador muda para offline
- [ ] **Recuperação de Conexão**: Volta online → sync automático inicia
- [ ] **Sync Manual**: Botão de sync → força sincronização imediata

### Criação de Dados Offline
- [ ] **Nova Despesa Offline**: 
  - Criar despesa sem internet
  - Verificar badge "pendente" 
  - Conectar internet → verificar sync automático
- [ ] **Nova Ocorrência Offline**:
  - Registrar ocorrência offline
  - Verificar status "pendingSync = true"
  - Sync automático ao voltar online
- [ ] **Captura de Imagens Offline**:
  - Foto de comprovante offline
  - OCR local funciona
  - Imagem salva localmente

### Sincronização
- [ ] **Background Sync**:
  - App em background → sync periódico ativo
  - Voltar ao app → dados atualizados
- [ ] **Conflict Resolution**:
  - Editar dado offline + servidor
  - Verificar "last-write-wins"
- [ ] **Retry Logic**:
  - Simular falha de rede durante sync
  - Verificar tentativas automáticas
- [ ] **Indicator States**:
  - Online: ícone verde + "Sincronizado"
  - Offline: ícone vermelho + "X pendentes"
  - Syncing: ícone animado + "Sincronizando"

## 📸 OCR e Mídia

### Captura de Imagens
- [ ] **Câmera**: Capturar foto → imagem salva
- [ ] **Galeria**: Selecionar da galeria → imagem importada
- [ ] **Compressão**: Verificar que imagens são redimensionadas
- [ ] **Permissões**: Solicitar permissões corretamente

### OCR Processing
- [ ] **Extração Básica**: 
  - Foto de nota fiscal → dados extraídos
  - Verificar campos pré-preenchidos (valor, data, categoria)
- [ ] **Confiabilidade**:
  - Mostrar % de confiança
  - Permitir edição dos dados extraídos
- [ ] **Fallback**: Erro no OCR → permitir preenchimento manual
- [ ] **Performance**: OCR não bloqueia UI

## 🗺 Localização e GPS

### Ocorrências com GPS
- [ ] **Permissão de Localização**: Solicitar ao registrar ocorrência
- [ ] **Captura de Coordenadas**: Lat/lng salvos corretamente
- [ ] **Accuracy**: Alta precisão quando possível
- [ ] **Offline GPS**: Funciona sem internet
- [ ] **Privacy**: Coordenadas só salvas quando autorizado

## 🔐 Autenticação e Segurança

### Login/Logout
- [ ] **Login Demo**: Credenciais pré-preenchidas funcionam
- [ ] **Token Storage**: Token salvo com expo-secure-store
- [ ] **Auto-login**: App lembra login entre sessões
- [ ] **Logout**: Limpa dados seguros completamente
- [ ] **Session Expiry**: Handle token expirado graciosamente

### Dados Sensíveis
- [ ] **Encryption**: Tokens criptografados em storage
- [ ] **Memory Cleanup**: Dados limpos ao fazer logout
- [ ] **Background Protection**: App protegido em background

## 📱 UX e Acessibilidade

### Navegação
- [ ] **Tab Navigation**: Todas as tabs funcionam
- [ ] **Stack Navigation**: Modal screens abrem/fecham
- [ ] **Back Button**: Navegação consistente
- [ ] **Deep Links**: URLs funcionam corretamente

### Interface
- [ ] **Loading States**: Spinners durante operações
- [ ] **Error States**: Mensagens de erro claras
- [ ] **Empty States**: Placeholders quando sem dados
- [ ] **Pull to Refresh**: Atualização manual das listas
- [ ] **Infinite Scroll**: Performance com muitos dados

### Responsividade
- [ ] **Phone Portrait**: Layout otimizado
- [ ] **Phone Landscape**: Adapta corretamente
- [ ] **Tablet**: Aproveita espaço extra
- [ ] **Text Scaling**: Funciona com tamanhos de fonte do sistema

### Acessibilidade
- [ ] **Screen Reader**: VoiceOver/TalkBack navegação
- [ ] **High Contrast**: Funciona com modo alto contraste
- [ ] **Touch Targets**: Mínimo 44x44px para botões
- [ ] **Focus Management**: Ordem lógica de foco
- [ ] **Labels**: Todos elementos têm labels descritivos

## 🔋 Performance

### Memory Management
- [ ] **Image Handling**: Imagens não causam memory leaks
- [ ] **Database**: Queries eficientes mesmo com muitos dados
- [ ] **Background**: App não consome recursos desnecessários
- [ ] **Cleanup**: Recursos liberados corretamente

### Battery Life
- [ ] **Location Usage**: GPS usado apenas quando necessário
- [ ] **Background Tasks**: Sync eficiente sem drenar bateria
- [ ] **Camera**: Libera recursos após uso

## 🐛 Edge Cases

### Dados
- [ ] **Database Corruption**: App se recupera graciosamente
- [ ] **Partial Sync**: Falha durante sync → estado consistente
- [ ] **Storage Full**: Handle espaço insuficiente
- [ ] **Large Images**: Compressão de imagens muito grandes

### Network
- [ ] **Slow Connection**: Timeouts apropriados
- [ ] **Intermittent Connection**: Reconecta automaticamente
- [ ] **No Internet**: Todas funções offline funcionam
- [ ] **Rate Limiting**: Handle API rate limits

### Permissions
- [ ] **Camera Denied**: Graceful fallback
- [ ] **Location Denied**: Ocorrências ainda funcionam
- [ ] **Storage Denied**: App ainda utilizável
- [ ] **Re-grant Permissions**: Funciona depois de conceder

## 📋 Checklist de Release

### Pre-Deploy
- [ ] Todos os testes manuais passaram
- [ ] Performance testada em dispositivos baixo-end
- [ ] Conectividade testada em diferentes redes
- [ ] Backup de dados testado
- [ ] Error handling validado

### Deploy
- [ ] Build EAS configurado
- [ ] Environment variables configuradas
- [ ] API endpoints apontam para produção
- [ ] OCR provider configurado
- [ ] Analytics configurado
- [ ] Error reporting ativo

### Post-Deploy
- [ ] Smoke tests em produção
- [ ] Monitoring ativo
- [ ] User feedback coletado
- [ ] Performance metrics Ok

---

## 🔧 Substituição de Mocks

### Para API Real:
1. Edite `src/services/api/ApiClient.ts`
2. Implemente métodos HTTP reais
3. Configure autenticação JWT
4. Teste endpoints

### Para OCR Real:
1. Crie novo provider implementando `OCRProvider`
2. Modifique `OCRProviderFactory.create()`
3. Configure API keys
4. Teste extração de dados

### Para Sync Real:
1. Configure endpoints de sync no servidor
2. Implemente conflict resolution no backend
3. Teste cenários de conflito
4. Configure webhooks se necessário