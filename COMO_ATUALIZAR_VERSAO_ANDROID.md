# 📱 Como Atualizar a Versão do App Android

## 📋 Arquivos que Precisam ser Atualizados

### 1. **`app.json`** ⭐ (PRINCIPAL - Obrigatório)

Este é o arquivo principal usado pelo Expo. Sempre atualize aqui primeiro:

```json
{
  "expo": {
    "version": "1.0.6",  // ← Versão legível (ex: "1.0.6")
    "android": {
      "versionCode": 5  // ← Versão numérica (sempre incremente: 5, 6, 7...)
    }
  }
}
```

**Importante:**
- `version`: Versão legível que aparece para o usuário (ex: "1.0.6")
- `versionCode`: Número inteiro que deve ser **sempre incrementado** a cada build
  - Se a versão anterior era `5`, a nova deve ser `6`
  - A Play Store usa isso para identificar qual versão é mais recente

### 2. **`package.json`** (Opcional, mas recomendado)

Mantenha sincronizado com `app.json`:

```json
{
  "version": "1.0.6"  // ← Mesma versão do app.json
}
```

### 3. **`android/app/build.gradle`** (Apenas se usar build nativo)

Se você fizer build nativo (não pelo EAS), atualize também:

```gradle
android {
    defaultConfig {
        versionCode 5        // ← Mesmo número do app.json
        versionName "1.0.6"  // ← Mesma versão do app.json
    }
}
```

**⚠️ ATENÇÃO:** No seu projeto, o `build.gradle` está com versão diferente:
- `build.gradle` tem: `versionName "1.0.3"` e `versionCode 5`
- `app.json` tem: `version "1.0.6"` e `versionCode 5`

**Isso pode causar problemas!** Atualize o `build.gradle` para corresponder ao `app.json`.

## 🔄 Processo de Atualização

### Passo a Passo:

1. **Atualize `app.json`:**
   ```json
   {
     "expo": {
       "version": "1.0.7",  // Nova versão
       "android": {
         "versionCode": 6   // Incrementar sempre
       }
     }
   }
   ```

2. **Atualize `package.json` (opcional):**
   ```json
   {
     "version": "1.0.7"
   }
   ```

3. **Se usar build nativo, atualize `android/app/build.gradle`:**
   ```gradle
   defaultConfig {
       versionCode 6
       versionName "1.0.7"
   }
   ```

4. **Se usar EAS Build (recomendado):**
   - O EAS lê automaticamente do `app.json`
   - Não precisa atualizar `build.gradle` manualmente
   - Execute: `eas build --platform android`

## 📊 Resumo dos Arquivos

| Arquivo | Quando Atualizar | Obrigatório? |
|---------|------------------|--------------|
| `app.json` | Sempre | ✅ **SIM** |
| `package.json` | Sempre (manter sincronizado) | ⚠️ Recomendado |
| `android/app/build.gradle` | Apenas build nativo | ⚠️ Se usar build nativo |

## 🎯 Exemplo Prático

### Versão Atual: 1.0.6 → Nova Versão: 1.0.7

**1. `app.json`:**
```json
{
  "expo": {
    "version": "1.0.7",
    "android": {
      "versionCode": 6
    }
  }
}
```

**2. `package.json`:**
```json
{
  "version": "1.0.7"
}
```

**3. `android/app/build.gradle` (se usar build nativo):**
```gradle
defaultConfig {
    versionCode 6
    versionName "1.0.7"
}
```

## ⚠️ Problemas Comuns

### ❌ Erro: "Version code already used"
- **Causa:** `versionCode` já foi usado na Play Store
- **Solução:** Incremente o `versionCode` (ex: de 5 para 6)

### ❌ Versão diferente no app vs build
- **Causa:** `app.json` e `build.gradle` desincronizados
- **Solução:** Mantenha ambos com a mesma versão

### ❌ App não detecta nova versão
- **Causa:** `versionCode` não foi incrementado
- **Solução:** Sempre incremente o `versionCode`, mesmo para patches

## 💡 Dicas

1. **Use EAS Build:** Ele gerencia automaticamente as versões do `app.json`
2. **Sempre incremente `versionCode`:** Mesmo para pequenas atualizações
3. **Mantenha sincronizado:** `app.json`, `package.json` e `build.gradle` devem ter a mesma versão
4. **Versionamento semântico:** Use formato `MAJOR.MINOR.PATCH` (ex: 1.0.7)



