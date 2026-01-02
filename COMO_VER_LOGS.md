# Como Ver os Logs das Rotas

## 📱 Visualizando Logs no App

Quando você clicar no filtro "Em Andamento", os logs serão exibidos no console. Aqui está o que você verá:

### 1. **No Simulador iOS (Xcode)**
- Abra o Xcode
- Execute o app no simulador
- Abra a aba "Console" na parte inferior do Xcode
- Os logs aparecerão com o prefixo `[ROTAS]`

### 2. **No Expo/React Native**
- Execute o app com `npm run dev` ou `npx expo start`
- Os logs aparecerão no terminal onde você executou o comando
- Procure por mensagens com emojis 🔵, 📦, 🔍, ✅, ❌, 📊, 📋

### 3. **No React Native Debugger**
- Conecte o React Native Debugger
- Abra o Console no DevTools
- Os logs aparecerão lá

## 📋 O que os Logs Mostram

Quando você clica em "Em Andamento", você verá:

### Etapa 1: Início da Busca
```
🔵 [ROTAS] Filtro: em_andamento - Buscando todas as rotas da API
```

### Etapa 2: Dados Recebidos
```
📦 [ROTAS] Recebidos da API: X rotas
```

### Etapa 3: Lista Completa Antes do Filtro
```
📋 [ROTAS] Rotas recebidas antes do filtro:
   1. ID: xxx, Nome: Nome da Rota, Status: em_andamento, FinalizarViagem: null
   2. ID: yyy, Nome: Outra Rota, Status: passadas, FinalizarViagem: false
   ...
```

### Etapa 4: Processo de Filtragem
```
🔍 [ROTAS] Filtrando rotas em andamento...
   ✅ Incluída: Nome da Rota (status: em_andamento)
   ✅ Incluída: Outra Rota (status: passadas, finalizarViagem: false)
   ❌ Excluída: Rota Passada (status: passadas, finalizarViagem: true)
```

### Etapa 5: Resultado Final
```
📊 [ROTAS] Resultado do filtro: 5 → 3 rotas
📋 [ROTAS] Rotas filtradas (em andamento):
   1. Nome da Rota (ID: xxx, Status: em_andamento, FinalizarViagem: null)
   2. Outra Rota (ID: yyy, Status: passadas, FinalizarViagem: false)
```

### Etapa 6: Estado Atualizado
```
✅ [ROTAS] Rotas definidas no estado: 3 rotas
📄 [ROTAS] Paginação - Página atual: 1, Total de páginas: 1, Tem mais: false
```

## 🔍 O que Procurar nos Logs

1. **Quantidade de rotas recebidas**: Verifique se a API está retornando as rotas esperadas
2. **Status das rotas**: Verifique o `status` de cada rota
3. **FinalizarViagem**: Verifique se `finalizarViagem` está `null`, `false` ou `true`
4. **Rotas incluídas/excluídas**: Entenda por que cada rota foi incluída ou excluída
5. **Resultado final**: Veja quantas rotas aparecerão na tela

## 🐛 Debugging

Se você não está vendo as rotas esperadas:

1. Verifique se a API está retornando dados (`📦 [ROTAS] Recebidos da API`)
2. Veja quais rotas estão sendo recebidas (`📋 [ROTAS] Rotas recebidas antes do filtro`)
3. Verifique por que rotas específicas estão sendo excluídas (`❌ Excluída`)
4. Confirme o resultado final (`📊 [ROTAS] Resultado do filtro`)

## 📝 Exemplo de Saída Completa

```
👆 [ROTAS] Usuário clicou no filtro: em_andamento
🔵 [ROTAS] Filtro: em_andamento - Buscando todas as rotas da API
📦 [ROTAS] Recebidos da API: 5 rotas
🔍 [ROTAS] Filtrando rotas em andamento...
📋 [ROTAS] Rotas recebidas antes do filtro:
   1. ID: 123, Nome: Viagem São Paulo, Status: em_andamento, FinalizarViagem: null
   2. ID: 124, Nome: Viagem Rio, Status: passadas, FinalizarViagem: false
   3. ID: 125, Nome: Viagem BH, Status: passadas, FinalizarViagem: true
   4. ID: 126, Nome: Viagem Curitiba, Status: futuras, FinalizarViagem: null
   5. ID: 127, Nome: Viagem Porto Alegre, Status: em_andamento, FinalizarViagem: null
   ✅ Incluída: Viagem São Paulo (status: em_andamento)
   ✅ Incluída: Viagem Rio (status: passadas, finalizarViagem: false)
   ❌ Excluída: Viagem BH (status: passadas, finalizarViagem: true)
   ❌ Excluída: Viagem Curitiba (status: futuras, finalizarViagem: null)
   ✅ Incluída: Viagem Porto Alegre (status: em_andamento)
📊 [ROTAS] Resultado do filtro: 5 → 3 rotas
📋 [ROTAS] Rotas filtradas (em andamento):
   1. Viagem São Paulo (ID: 123, Status: em_andamento, FinalizarViagem: null)
   2. Viagem Rio (ID: 124, Status: passadas, FinalizarViagem: false)
   3. Viagem Porto Alegre (ID: 127, Status: em_andamento, FinalizarViagem: null)
✅ [ROTAS] Rotas definidas no estado: 3 rotas
📄 [ROTAS] Paginação - Página atual: 1, Total de páginas: 1, Tem mais: false
```



