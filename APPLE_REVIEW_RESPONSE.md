# Resposta para Revisão da Apple - Guideline 2.5.4

## Funcionalidade: Navegação Turn-by-Turn com Alertas de Chegada

Nosso aplicativo implementa funcionalidade de **navegação turn-by-turn com alertas de chegada** que requer uso de localização em background, além do rastreamento de funcionários.

### Onde encontrar a funcionalidade:

1. **Abra o aplicativo e faça login**
2. **Vá para a aba "Rotas"** (ícone de mapa na barra de navegação inferior)
3. **Selecione qualquer rota** da lista
4. **Na tela de detalhes da rota, logo no topo** (primeiro card após o header), você verá um **card destacado com borda azul** chamado **"Navegação Turn-by-Turn"**
5. **Clique no botão azul "Iniciar Navegação"** dentro deste card

### Descrição da funcionalidade:

Este recurso combina duas funcionalidades que requerem background location:

**1. Navegação Turn-by-Turn:**
- Fornece orientações de navegação em tempo real durante o trajeto
- Calcula distância, direção (bearing) e tempo estimado para cada destino da rota
- Atualiza a localização continuamente (a cada 5 segundos ou 10 metros) para navegação precisa
- Funciona em background para continuar fornecendo instruções mesmo quando o app está em segundo plano
- Exibe notificação persistente: "TraceTrip Navegação - Navegação ativa para o destino"

**2. Alertas de Chegada (Geofencing):**
- Monitora quando o usuário chega aos destinos da rota usando geofencing
- Define regiões virtuais (geofences) de 100 metros ao redor de cada destino
- Envia notificações quando o usuário entra em uma região de destino
- Funciona em background para detectar chegadas mesmo quando o app não está em uso ativo
- Atualiza a localização a cada 10 segundos ou 50 metros para detecção eficiente
- Exibe notificação persistente: "TraceTrip Monitoramento - Monitorando chegadas aos destinos"

### Como testar:

1. **Encontre o card**: Na tela de detalhes de qualquer rota, o card "Navegação Turn-by-Turn" é o primeiro elemento visível após o header azul
2. **Clique em "Iniciar Navegação"**: O sistema solicitará permissão de localização em background (se ainda não foi concedida)
3. **Após conceder a permissão**: Você verá um alerta de "Sucesso" confirmando que a navegação foi iniciada
4. **O botão mudará para vermelho** com texto "Parar Navegação" e o texto de ajuda será atualizado
5. **Minimize o aplicativo** ou coloque-o em background
6. **A navegação continuará funcionando** e você verá a notificação de localização em background no iOS
7. **Os dados de navegação e geofencing são atualizados continuamente** mesmo com o app em background
8. **Quando você se aproximar de um destino** (dentro de 100 metros), receberá uma notificação de chegada

### Justificativa Técnica:

Esta funcionalidade requer **UIBackgroundModes** com `location` porque:

1. **Navegação Turn-by-Turn**: Precisa de atualizações contínuas de localização para fornecer instruções precisas em tempo real, especialmente durante viagens longas onde o usuário pode alternar entre aplicativos ou colocar o dispositivo no bolso/bolsa.

2. **Geofencing**: Precisa monitorar a localização em background para detectar quando o usuário entra nas regiões de destino, mesmo quando o app não está em primeiro plano. Isso é essencial para alertas de chegada que funcionam quando o usuário está dirigindo.

### Diferenças do Rastreamento de Funcionários:

- **Rastreamento de funcionários**: Rastreia localização para fins administrativos/gerenciais (gerenciamento de equipe)
- **Navegação com Alertas**: Fornece assistência ativa e benefícios diretos ao usuário durante viagens:
  - Orientações de navegação para chegar aos destinos
  - Alertas quando o usuário chega aos locais programados
  - Melhora a experiência do usuário durante viagens de trabalho

### Informações Adicionais:

- **Permissões**: A permissão de localização é solicitada apenas quando o usuário ativa explicitamente a navegação através do botão
- **Controle do usuário**: O usuário pode iniciar/parar a funcionalidade a qualquer momento através do botão no card
- **Feedback visual**: O botão muda de cor (azul para vermelho) e texto quando ativo, indicando claramente o estado
- **Notificações**: Exibe notificações persistentes quando ativa, indicando claramente o uso de localização em background
- **Alerta de sucesso**: Ao ativar, mostra um alerta confirmando que a funcionalidade foi iniciada
- **Funciona mesmo sem API**: Se a conexão com a API falhar, a funcionalidade ainda funciona usando dados de exemplo, permitindo demonstração mesmo sem conexão

### Localização Visual:

O card de navegação é **impossível de perder** pois:
- É o **primeiro elemento** visível na tela após o header
- Tem **borda azul destacada** (2px, cor #254985)
- Tem **ícone grande** de navegação (24px)
- Tem **título em negrito**: "Navegação Turn-by-Turn"
- Tem **botão grande e azul** com texto claro: "Iniciar Navegação"

## Versão Testada

Versão: 1.0
Data: Novembro de 2025
