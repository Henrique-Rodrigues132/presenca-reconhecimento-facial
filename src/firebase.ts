import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  // @ts-expect-error getReactNativePersistence existe em runtime no firebase/auth,
  // mas pode não estar tipado dependendo da versão instalada (ver README, seção Decisões técnicas).
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuração do projeto Firebase (Authentication + Cloud Firestore).
const firebaseConfig = {
  apiKey: 'AIzaSyBNCtFq5EaqsPbJPU0p1iUOTcVnc_8eTVw',
  authDomain: 'presenca-reconhecimento-facial.firebaseapp.com',
  projectId: 'presenca-reconhecimento-facial',
  storageBucket: 'presenca-reconhecimento-facial.firebasestorage.app',
  messagingSenderId: '318579328377',
  appId: '1:318579328377:web:5e8ecd528052cd1d401ba8',
};

// Evita reinicializar o app em hot-reload do Expo.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth com persistência via AsyncStorage mantém a sessão do usuário
// entre reinícios do app no React Native. Se já tiver sido inicializado
// (hot-reload), recai para getAuth(app).
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
