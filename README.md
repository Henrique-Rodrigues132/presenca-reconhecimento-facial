# Presença Facial — App com Reconhecimento Facial Real (Expo + Firebase + TFLite)

Aplicativo móvel (Expo + React Native + TypeScript) do projeto **Controle de Presença em
laboratórios por Reconhecimento Facial**. Esta versão implementa **reconhecimento facial real**
no dispositivo: o cadastro detecta o rosto e gera um **descritor facial (embedding)**, e a tela
de verificação abre a câmera, captura um rosto, gera o descritor e o **compara** com os
cadastrados para informar se a pessoa é **cadastrada** ou **não cadastrada**. Toda a persistência
é remota no **Firebase** (Authentication + Cloud Firestore).

## Autores

- **Henrique Rodrigues**
- **Kaio Ramos**

## Objetivo acadêmico

Entregar um protótipo funcional de presença por reconhecimento facial, atendendo aos requisitos
da disciplina: autenticação, cadastro de usuário, perfil com CRUD, a tela específica da dupla
(**Cadastros Faciais**) com CRUD, **reconhecimento facial real**, histórico de presenças e
persistência remota no Firebase.

---

## ⚠️ Importante: este app exige um *development build* (não roda no Expo Go)

O reconhecimento facial real depende de **módulos nativos** (TensorFlow Lite via
`react-native-fast-tflite` e detecção de rosto via ML Kit). Esses módulos **não existem no app
Expo Go**, portanto o app precisa ser executado em um **development build** (um app próprio
gerado com EAS Build). O fluxo de QR Code continua existindo, mas o QR abre no **dev client**
(o app buildado), e não no Expo Go. Veja a seção "Como rodar".

> **Por que não Expo Go?** Tentamos primeiro o caminho 100% Expo Go com
> `@tensorflow/tfjs-react-native`, mas essa biblioteca está desatualizada e exige
> `expo-camera@13` (o SDK 52 usa a `expo-camera@16`), além de depender de uma API de câmera já
> removida. Não há biblioteca de reconhecimento facial *drop-in* compatível com Expo Go
> (`face-api.js` é feita para navegador/DOM). Por isso adotamos o caminho de **development build
> + TFLite nativo**, que entrega reconhecimento real e robusto.

---

## Tecnologias usadas

- **Expo** (managed + development build via EAS)
- **React Native** + **TypeScript**
- **Firebase JS SDK (modular)** — Authentication (e-mail/senha) + Cloud Firestore
- **expo-camera** — preview da câmera ao vivo e captura
- **expo-image-picker** — foto por galeria ou câmera no cadastro
- **expo-image-manipulator** — normaliza orientação/escala da imagem
- **@react-native-ml-kit/face-detection** — detecção de rosto (bounding box, contagem de rostos)
- **react-native-fast-tflite** — executa o modelo **MobileFaceNet** (`.tflite`) nativamente
- **jpeg-js** — decodifica os pixels da imagem para recortar/redimensionar o rosto
- **@react-native-async-storage/async-storage** — persistência da sessão do Firebase Auth

---

## Método antigo encontrado no ZIP (protótipo / referência histórica)

O repositório original continha um protótipo de reconhecimento facial em **Python/Google Colab**:
captura de webcam via JavaScript no Colab, conversão do frame para base64, detecção com
**MediaPipe FaceDetection**, identificação com **face_recognition** (`face_encodings`),
comparação com `compare_faces`/`face_distance` e tolerância ~0.6. Esse protótipo **não** é usado
no app final (permanece em `codigo-fonte/` apenas como referência). O app final **não** usa
Python, OpenCV, MediaPipe, face_recognition, Colab, Vite ou React DOM.

---

## Como o cadastro facial funciona

1. O operador escolhe uma foto por **câmera** (frontal) ou **galeria**.
2. A imagem é normalizada (orientação + escala) com `expo-image-manipulator`.
3. O **ML Kit** detecta o rosto. Se não houver rosto → erro "Nenhum rosto detectado"; se houver
   mais de um → erro "Mais de um rosto detectado".
4. O rosto é recortado, redimensionado para **112×112** e normalizado.
5. O **MobileFaceNet** (TFLite) gera um **embedding de 192 dimensões**, que é **L2-normalizado**.
6. São salvos no Firestore (coleção `facialRecords`): `userId`, `name`, `identifier`,
   `classGroup`, `observation`, `faceImageBase64` (miniatura) e **`faceDescriptor`** (o vetor de
   192 números), além de `createdAt`/`updatedAt`.

## Como o reconhecimento facial funciona

1. A tela **Verificar** abre a **câmera frontal** ao vivo (`expo-camera`).
2. "Capturar e verificar" tira a foto e gera o descritor pelo mesmo pipeline acima.
3. O descritor capturado é comparado com **todos os `facialRecords` do usuário logado** por
   **similaridade do cosseno** (produto interno de vetores L2-normalizados).
4. Resultado:
   - **Usuário cadastrado** (card verde) se a maior similaridade ≥ limiar — mostra nome,
     identificador, turma e a % de similaridade;
   - **Usuário não cadastrado** (card vermelho) caso contrário;
   - **Nenhum rosto detectado** / **Mais de um rosto detectado** quando aplicável.
5. Reconhecido → "Registrar presença" salva em `attendanceRecords` (`status: "reconhecido"`).
   Não reconhecido → opção de registrar tentativa (`status: "nao_reconhecido"`).

### Biblioteca / modelo usado
- **Modelo:** MobileFaceNet (`assets/models/mobilefacenet.tflite`), entrada **112×112×3**, saída
  **192 dimensões**, treinado com loss do InsightFace.
- **Runtime:** `react-native-fast-tflite` (TFLite nativo).
- **Detecção:** ML Kit Face Detection (`@react-native-ml-kit/face-detection`).

### Como os descritores são salvos
Como um **array numérico** (`number[]`, 192 valores L2-normalizados) no campo `faceDescriptor`
do documento em `facialRecords`. A miniatura da foto é salva em `faceImageBase64` (data URI).

### Como a comparação é feita e qual threshold
- **Métrica:** similaridade do cosseno (também há `euclideanDistance` disponível como
  alternativa em `src/utils/faceRecognition.ts`).
- **Threshold:** constante `SIMILARITY_THRESHOLD = 0.5` em `src/utils/faceRecognition.ts`
  (faixa sugerida 0.45–0.65; ajuste conforme os testes no seu device/iluminação).

### Limitações do protótipo (honestidade técnica)
- Não há **alinhamento facial** por landmarks; usa o recorte do bounding box do ML Kit. Isso
  reduz a precisão sob ângulos/iluminação ruins. Para um protótipo é suficiente, mas não é
  produção.
- O threshold é fixo e pode precisar de ajuste por ambiente.
- Não há *liveness detection* (anti-spoofing): uma foto de foto pode enganar o sistema.
- A precisão depende da qualidade da câmera frontal e da luz.

---

## Estrutura de pastas

```
projeto-front-end-integrado/
├── App.tsx                       # Auth + navegação por estado local (abas)
├── index.ts                      # Registro do componente raiz (Expo)
├── app.json                      # Config Expo + plugins nativos (camera, fast-tflite, ...)
├── eas.json                      # Perfis de build do EAS (development/preview/production)
├── metro.config.js               # Inclui .tflite como asset
├── package.json
├── tsconfig.json
├── assets/
│   └── models/
│       └── mobilefacenet.tflite  # Modelo de embedding facial (112x112 -> 192)
└── src/
    ├── firebase.ts               # initializeApp + initializeAuth(AsyncStorage) + Firestore
    ├── types.ts                  # Profile, FacialRecord, AttendanceRecord, ...
    ├── styles.ts                 # Estilos e paleta
    ├── utils/
    │   ├── authErrors.ts         # Tradução de erros do Firebase Auth
    │   └── faceRecognition.ts    # loadFaceModels / getFaceDescriptorFromImage /
    │                             # compareFaceDescriptors / findBestFaceMatch
    └── screens/
        ├── LoginScreen.tsx
        ├── RegisterScreen.tsx
        ├── HomeScreen.tsx
        ├── ProfileScreen.tsx         # CRUD de profiles
        ├── FacialRecordsScreen.tsx   # CRUD de facialRecords + câmera/galeria + descritor
        ├── RecognitionScreen.tsx     # Câmera ao vivo + verificação + registro de presença
        └── HistoryScreen.tsx         # Lista de attendanceRecords
```

---

## Funcionalidades entregues

- **Autenticação**: login, cadastro de usuário, logout, sessão persistida, validações e loading.
- **Perfil** (coleção `profiles`): CRUD completo, filtrado por `user.uid`.
- **Cadastros Faciais** (coleção `facialRecords`): CRUD completo, foto por **câmera ou galeria**,
  **descritor facial real** gerado e salvo, filtrado por `user.uid`.
- **Reconhecimento Facial**: câmera ao vivo, captura, comparação real por embeddings, resultado
  "cadastrado/não cadastrado", registro de presença.
- **Histórico** (coleção `attendanceRecords`): lista os registros, filtrado por `user.uid`.

---

## Como instalar

> Pré-requisitos: **Node.js LTS** e uma **conta Expo** gratuita (para o EAS Build).

```bash
cd codigo-fonte/projeto-front-end-integrado
npm install
```

## Como rodar (gerar o development build e o QR Code)

Como o app usa módulos nativos, é preciso gerar um **development build** uma vez. A forma mais
simples no Windows é via **EAS Build (nuvem)** — não precisa de Android Studio.

```bash
# 1. Instale a CLI e faça login na sua conta Expo
npm install -g eas-cli
eas login

# 2. (uma vez) configure o projeto para EAS
eas build:configure

# 3. Gere um APK de desenvolvimento (ou use o perfil "preview" para um APK standalone)
eas build --profile development --platform android
#   -> ao final, baixe e instale o APK no celular Android

# 4. Inicie o servidor de desenvolvimento e gere o QR Code
npx expo start --dev-client
```

- O **QR Code** aparece no terminal. Abra o **app buildado (dev client)** no celular e escaneie
  (ou use a câmera). O app carrega o JavaScript do seu computador.
- Para uma demo mais simples (sem servidor), gere um APK standalone:
  `eas build --profile preview --platform android` e instale no celular — ele roda sozinho.

> **Build local (alternativa):** com Android Studio + JDK instalados, é possível
> `npx expo run:android` (gera as pastas nativas e compila localmente). No Windows, o EAS Build
> costuma ser mais simples.

> **iOS:** exige conta Apple Developer e, em geral, macOS/EAS. O foco do protótipo é Android.

## Como configurar Firebase Authentication e Firestore

No [Console do Firebase](https://console.firebase.google.com/) do projeto
`presenca-reconhecimento-facial`:

1. **Authentication → Sign-in method →** habilite **E-mail/senha**.
2. **Firestore Database →** crie o banco.
3. **Regras do Firestore** (recomendado) — cada usuário só acessa os próprios documentos:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{col}/{docId} {
         allow read, write: if request.auth != null
           && request.auth.uid == resource.data.userId;
         allow create: if request.auth != null
           && request.auth.uid == request.resource.data.userId;
       }
     }
   }
   ```

As coleções `profiles`, `facialRecords` e `attendanceRecords` são criadas automaticamente no
primeiro registro.

### Decisão técnica — persistência do Firebase Auth no React Native
Usamos `initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })` para
manter a sessão entre reinícios. Há um `@ts-expect-error` documentado em `src/firebase.ts` caso a
tipagem de `getReactNativePersistence` varie por versão, com fallback para `getAuth(app)`.

---

## O que demonstrar no vídeo (roteiro, ~6 min)

1. **Apresentação (30s)**: projeto, autores (Henrique Rodrigues e Kaio Ramos) e que é um
   reconhecimento facial real em development build.
2. **Código (1m30s)**: `src/utils/faceRecognition.ts` (modelo TFLite, geração e comparação de
   embeddings, threshold), `RecognitionScreen.tsx` (câmera) e `src/firebase.ts`.
3. **Login/Cadastro (45s)**: criar conta, sair, logar de novo (sessão persistida).
4. **Cadastros Faciais (1m30s)**: cadastrar uma pessoa **tirando foto com a câmera**, mostrar a
   detecção do rosto e o descritor gerado, salvar; mostrar a coleção `facialRecords` no Firestore
   (com o array `faceDescriptor`). Mostrar também o erro "Nenhum rosto detectado".
5. **Reconhecimento (1m30s)**: abrir a câmera, verificar uma pessoa **cadastrada** (card verde +
   similaridade) e uma **não cadastrada** (card vermelho). Registrar presença.
6. **Histórico (30s)**: mostrar os registros em `attendanceRecords`.
7. **Encerramento (15s)**: reforçar persistência remota no Firebase e mostrar o QR Code do dev
   client.

---

## Comandos Git (executar manualmente)

> Devem ser executados **manualmente** por Henrique Rodrigues e Kaio Ramos. Não foram executados
> pela automação.

```bash
git add .
git commit -m "feat: reconhecimento facial real (dev build, MobileFaceNet/TFLite) + presença e histórico"
git push origin main
```

---

## Observação sobre persistência

Todos os dados são **persistidos remotamente no Firebase**: contas no **Firebase Authentication**
e perfis, cadastros faciais (incluindo os descritores) e presenças no **Cloud Firestore**. Tudo é
filtrado por `user.uid`.

## Crédito do modelo
`mobilefacenet.tflite` obtido do repositório público
[MCarlomagno/FaceRecognitionAuth](https://github.com/MCarlomagno/FaceRecognitionAuth)
(MobileFaceNet, entrada 112×112, saída 192).
