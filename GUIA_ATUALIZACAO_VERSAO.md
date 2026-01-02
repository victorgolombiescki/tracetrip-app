# Guia de Atualização de Versão

Este documento lista **todos os arquivos** onde a versão do aplicativo precisa ser atualizada quando você precisar gerar uma nova build.

## 📋 Versão Atual
**Versão**: `1.0.6`  
**Build Number iOS**: `4`  
**Version Code Android**: `5`

---

## 📁 Arquivos que Precisam ser Atualizados

### 1. **package.json**
**Caminho**: `/package.json`  
**Linha**: ~4  
**Campo**: `"version"`  
**Valor atual**: `"1.0.6"`

```json
{
  "version": "1.0.6",
  ...
}
```

---

### 2. **app.json** (Expo Config)
**Caminho**: `/app.json`  
**Múltiplos campos para atualizar**:

#### 2.1. Versão Principal
**Linha**: ~5  
**Campo**: `expo.version`  
**Valor atual**: `"1.0.6"`

```json
{
  "expo": {
    "version": "1.0.6",
    ...
  }
}
```

#### 2.2. Android Version Code
**Linha**: ~23  
**Campo**: `expo.android.versionCode`  
**Valor atual**: `5`  
**Nota**: Este número deve ser **incrementado** a cada nova versão na Play Store.

```json
{
  "android": {
    "versionCode": 5,
    ...
  }
}
```

#### 2.3. iOS Build Number
**Linha**: ~51  
**Campo**: `expo.ios.buildNumber`  
**Valor atual**: `"4"`  
**Nota**: Este número deve ser **incrementado** a cada nova build no App Store.

```json
{
  "ios": {
    "buildNumber": "4",
    ...
  }
}
```

---

### 3. **ios/TraceTrip/Info.plist**
**Caminho**: `/ios/TraceTrip/Info.plist`  
**Múltiplos campos para atualizar**:

#### 3.1. CFBundleShortVersionString
**Linha**: ~22  
**Campo**: `CFBundleShortVersionString`  
**Valor atual**: `1.0.6`  
**Nota**: Versão visível ao usuário (deve corresponder a `expo.version`)

```xml
<key>CFBundleShortVersionString</key>
<string>1.0.6</string>
```

#### 3.2. CFBundleVersion
**Linha**: ~36  
**Campo**: `CFBundleVersion`  
**Valor atual**: `4`  
**Nota**: Build number interno (deve corresponder a `expo.ios.buildNumber`)

```xml
<key>CFBundleVersion</key>
<string>4</string>
```

---

### 4. **android/app/build.gradle**
**Caminho**: `/android/app/build.gradle`  
**Linha**: ~95-96  
**Múltiplos campos para atualizar**:

#### 4.1. versionCode
**Valor atual**: `5`  
**Nota**: Deve corresponder a `expo.android.versionCode`

#### 4.2. versionName
**Valor atual**: `"1.0.6"`  
**Nota**: Deve corresponder a `expo.version`

```gradle
defaultConfig {
    ...
    versionCode 5
    versionName "1.0.6"
}
```

---

### 5. **ios/TraceTrip.xcodeproj/project.pbxproj**
**Caminho**: `/ios/TraceTrip.xcodeproj/project.pbxproj`  
**Múltiplos campos para atualizar** (Debug e Release):

#### 5.1. MARKETING_VERSION
**Linhas**: ~354 (Debug) e ~385 (Release)  
**Campo**: `MARKETING_VERSION`  
**Valor atual**: `1.0.6`  
**Nota**: Versão de marketing (deve corresponder a `expo.version`)

```pbxproj
MARKETING_VERSION = 1.0.6;
```

#### 5.2. CURRENT_PROJECT_VERSION
**Linhas**: ~342 (Debug) e ~378 (Release)  
**Campo**: `CURRENT_PROJECT_VERSION`  
**Valor atual**: `4`  
**Nota**: Build number (deve corresponder a `expo.ios.buildNumber`)

```pbxproj
CURRENT_PROJECT_VERSION = 4;
```

---

## 🔄 Checklist de Atualização

Ao atualizar a versão, certifique-se de atualizar:

- [ ] `package.json` → `version`
- [ ] `app.json` → `expo.version`
- [ ] `app.json` → `expo.android.versionCode` (incrementar)
- [ ] `app.json` → `expo.ios.buildNumber` (incrementar)
- [ ] `ios/TraceTrip/Info.plist` → `CFBundleShortVersionString`
- [ ] `ios/TraceTrip/Info.plist` → `CFBundleVersion`
- [ ] `android/app/build.gradle` → `versionCode` (incrementar)
- [ ] `android/app/build.gradle` → `versionName`
- [ ] `ios/TraceTrip.xcodeproj/project.pbxproj` → `MARKETING_VERSION` (2 lugares: Debug e Release)
- [ ] `ios/TraceTrip.xcodeproj/project.pbxproj` → `CURRENT_PROJECT_VERSION` (2 lugares: Debug e Release)

---

## 📝 Notas Importantes

### Versão vs Build Number
- **Versão** (`1.0.6`): Versão visível ao usuário. Segue semântica (major.minor.patch).
- **Build Number / Version Code** (`4` / `5`): Número interno que deve ser **sempre incrementado** a cada nova build.

### Sincronização
- **iOS**: `CFBundleVersion` e `CURRENT_PROJECT_VERSION` devem corresponder a `expo.ios.buildNumber`
- **Android**: `versionCode` deve corresponder a `expo.android.versionCode`
- **Ambos**: `versionName` / `CFBundleShortVersionString` / `MARKETING_VERSION` devem corresponder a `expo.version`

### Convenção de Versionamento
Este projeto usa **Semantic Versioning** (SemVer):
- **MAJOR** (1.0.6): Mudanças incompatíveis
- **MINOR** (1.0.6): Novas funcionalidades compatíveis
- **PATCH** (1.0.6): Correções de bugs

---

## 🚀 Exemplo de Atualização

Se você quiser atualizar para a versão `1.0.7`:

1. Atualize `"version": "1.0.7"` em:
   - `package.json`
   - `app.json` → `expo.version`
   - `android/app/build.gradle` → `versionName`
   - `ios/TraceTrip/Info.plist` → `CFBundleShortVersionString`
   - `ios/TraceTrip.xcodeproj/project.pbxproj` → `MARKETING_VERSION` (2x)

2. Incremente os build numbers:
   - `app.json` → `expo.android.versionCode`: `5` → `6`
   - `app.json` → `expo.ios.buildNumber`: `"4"` → `"5"`
   - `android/app/build.gradle` → `versionCode`: `5` → `6`
   - `ios/TraceTrip/Info.plist` → `CFBundleVersion`: `"4"` → `"5"`
   - `ios/TraceTrip.xcodeproj/project.pbxproj` → `CURRENT_PROJECT_VERSION`: `4` → `5` (2x)

---

## 📌 Última Atualização
**Data**: 2025-11-05  
**Versão**: 1.0.6  
**Build iOS**: 4  
**Version Code Android**: 5



