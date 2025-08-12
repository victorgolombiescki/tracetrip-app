# TraceTrip - Corporate Travel Management App

TraceTrip é um aplicativo mobile para gestão de viagens corporativas com arquitetura offline-first, desenvolvido com Expo e React Native.

## 🚀 Funcionalidades

### Core Features
- **Arquitetura Offline-First**: Funciona completamente offline com sincronização inteligente
- **Gestão de Rotas**: Consulte e gerencie suas viagens corporativas
- **Agendas Inteligentes**: Compromissos com lembretes e sincronização
- **Despesas com OCR**: Capture comprovantes e extraia dados automaticamente
- **Registro de Ocorrências**: Reporte incidentes com foto e localização GPS
- **Sincronização Automática**: Background sync com resolução de conflitos
- **Autenticação Segura**: Tokens criptografados com expo-secure-store

### Technical Features
- SQLite local com sync queue
- Compressão automática de imagens
- Background tasks para sincronização
- Detecção de conectividade de rede
- Interface responsiva e acessível
- Suporte a tema claro/escuro

## 🛠 Tecnologias

- **Framework**: Expo SDK 53+ com TypeScript
- **Navegação**: Expo Router com tabs + stack navigation  
- **Database**: SQLite (expo-sqlite) para storage offline-first
- **Estado**: Zustand para gerenciamento de estado global
- **Forms**: React Hook Form + Zod para validação
- **UI**: Componentes customizados com design system
- **Câmera**: expo-camera + expo-image-picker
- **OCR**: Interface desacoplada com provider customizável
- **Localização**: expo-location para GPS
- **Segurança**: expo-secure-store para tokens

## 📱 Execução

### Pré-requisitos
- Node.js 18+
- Expo CLI
- Android Studio (para Android) ou Xcode (para iOS)

### Desenvolvimento
```bash
# Instalar dependências
npm install

# Executar no desenvolvimento
npm run dev

# Para dispositivo físico (instale Expo Go)
npx expo start

# Build para plataformas específicas
npx expo run:android
npx expo run:ios
```

## 🏗 Arquitetura

### Estrutura de Pastas
```
├── app/                    # Rotas do Expo Router
│   ├── (tabs)/            # Navegação por tabs
│   ├── login.tsx          # Tela de login
│   ├── nova-despesa.tsx   # Modal nova despesa
│   └── nova-ocorrencia.tsx # Modal nova ocorrência
├── src/
│   ├── components/        # Componentes reutilizáveis
│   ├── db/               # SQLite schema e database
│   ├── hooks/            # Custom React hooks
│   ├── repositories/     # Data access layer
│   ├── services/         # Business logic
│   │   ├── api/          # API client (mocks)
│   │   ├── auth/         # Autenticação
│   │   ├── ocr/          # OCR provider
│   │   └── sync/         # Sync service
│   ├── store/            # Zustand stores
│   ├── types/            # TypeScript types
│   └── utils/            # Utilities e constants
└── types/                # Global TypeScript types
```

### Offline-First Architecture

O app implementa uma arquitetura offline-first com:

1. **SQLite Local**: Todos os dados são armazenados localmente primeiro
2. **Sync Queue**: Fila de sincronização para operações pendentes
3. **Conflict Resolution**: "Last-write-wins" com timestamp de atualização
4. **Background Sync**: Sincronização automática em background
5. **Network Detection**: Monitora conectividade para ativar sync

### Sync Strategy

```typescript
// O SyncService implementa:
1. Pull: Baixa dados do servidor (rotas, agendas)
2. Push: Envia dados pendentes (despesas, ocorrências)  
3. Conflict Resolution: Resolve por updatedAt (last-write-wins)
4. Retry Logic: Política de retry para falhas de rede
```

## 🔌 Integrações

### OCR Provider

O sistema de OCR é desacoplado e pode ser facilmente trocado:

```typescript
// src/services/ocr/OCRProvider.ts
export interface OCRProvider {
  extractText(imageUri: string): Promise<OCRResult>;
  isAvailable(): boolean;
}

// Para trocar por um serviço real:
// 1. Implemente a interface OCRProvider
// 2. Modifique OCRProviderFactory.create()
// 3. Exemplos: Google Vision API, AWS Textract, Azure Computer Vision
```

### API Client

```typescript
// src/services/api/ApiClient.ts
// TODO: Trocar depois pela API real

// Para conectar sua API:
// 1. Altere baseURL no constructor
// 2. Implemente os métodos HTTP reais
// 3. Configure autenticação JWT
// 4. Teste endpoints antes de fazer deploy
```

## 🎨 Design System

### Cores
- **Primary**: #1E40AF (Azul corporativo)
- **Secondary**: #059669 (Verde aprovação)  
- **Accent**: #EA580C (Laranja alerta)
- **Gray Scale**: Completa para hierarquia visual

### Componentes
- Button: Variantes primary/secondary/danger
- Input: Com validação e estados de erro
- Card: Container base para conteúdo
- LoadingSpinner: Estados de carregamento

### Acessibilidade
- Contrast ratios WCAG AA compliant
- Focus management
- Screen reader support
- Haptic feedback (mobile only)

## 🔐 Segurança

### Autenticação
- Tokens JWT armazenados com expo-secure-store
- Auto-logout em caso de token inválido
- Criptografia de dados sensíveis

### Dados
- SQLite com validação de schema
- Sanitização de inputs
- Backup automático de dados críticos

## 📊 Dados de Demonstração

O app inclui dados de seed para demonstração:
- 2 rotas (planejada e concluída)
- 3 agendas com lembretes
- 4 despesas em diferentes status
- 2 ocorrências com localização

## 🚀 Deploy

### Preparação para Produção

1. **Configurar Environment**:
   ```bash
   # Copie e configure as variáveis
   cp .env.example .env
   ```

2. **Build EAS**:
   ```bash
   # Instalar EAS CLI
   npm install -g @expo/eas-cli
   
   # Configurar projeto
   eas build:configure
   
   # Build para desenvolvimento
   eas build --profile development --platform all
   ```

3. **Configurar API Real**:
   - Altere `src/services/api/ApiClient.ts`
   - Configure endpoints no baseURL
   - Implemente autenticação JWT
   - Teste sync endpoints

4. **Configurar OCR Real**:
   - Implemente provider personalizado
   - Configure API keys seguras
   - Teste extração de dados

## 🧪 Testes

### Cenários de Teste Manual

#### Offline/Online
- [ ] Criar despesa offline → voltar online → verificar sync
- [ ] Criar ocorrência offline → verificar fila de sync
- [ ] Alternar conectividade → verificar indicador de status
- [ ] Background sync → verificar sincronização automática

#### OCR
- [ ] Capturar foto de nota fiscal → verificar extração
- [ ] Editar dados extraídos → salvar despesa
- [ ] Testar com diferentes tipos de comprovante

#### UX/Acessibilidade  
- [ ] Navegação por teclado
- [ ] Leitores de tela
- [ ] Contrast ratios
- [ ] Haptic feedback

### Testes Unitários
```bash
# Executar testes (quando implementados)
npm test
```

## 📝 Próximos Passos

1. **Conectar API Real**: Substituir mocks por endpoints reais
2. **OCR Provider**: Integrar serviço externo (Google Vision, AWS Textract)
3. **Push Notifications**: Lembretes e notificações de sync
4. **Relatórios**: Dashboard de gastos e analytics
5. **Multi-usuário**: Suporte a times e aprovações
6. **Backup**: Cloud backup para dados críticos

## 📞 Suporte

- **Email**: suporte@tracetrip.com
- **Telefone**: +55 11 5000-1234
- **Documentação**: [Wiki do projeto]

---

**Versão**: 1.0.0  
**Licença**: Proprietary  
**Desenvolvido com**: Expo + React Native + TypeScript