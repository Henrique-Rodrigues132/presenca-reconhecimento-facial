import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth } from './src/firebase';
import FacialRecordsScreen from './src/screens/FacialRecordsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RecognitionScreen from './src/screens/RecognitionScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import { colors, styles } from './src/styles';
import { AppScreen } from './src/types';

export default function App() {
  // Usuário autenticado (null = deslogado).
  const [user, setUser] = useState<User | null>(null);
  // Carregando estado inicial de autenticação.
  const [initializing, setInitializing] = useState(true);
  // Alterna entre Login e Cadastro quando o usuário está deslogado.
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  // Tela ativa na área autenticada.
  const [screen, setScreen] = useState<AppScreen>('home');

  // Observa o estado de autenticação do Firebase (persistido via AsyncStorage).
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
      // Ao logar, sempre começa pela tela Início.
      if (currentUser) setScreen('home');
    });
    return unsubscribe;
  }, []);

  async function handleLogout() {
    await signOut(auth);
  }

  // Splash enquanto verifica a sessão persistida.
  if (initializing) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.subHeader, { textAlign: 'center', marginTop: 16 }]}>
          Carregando...
        </Text>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  // Fluxo não autenticado: Login ou Cadastro.
  if (!user) {
    return (
      <>
        {authMode === 'login' ? (
          <LoginScreen onGoToRegister={() => setAuthMode('register')} />
        ) : (
          <RegisterScreen onGoToLogin={() => setAuthMode('login')} />
        )}
        <StatusBar style="dark" />
      </>
    );
  }

  // Fluxo autenticado: telas + barra de navegação inferior.
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.flex}>
        {screen === 'home' && <HomeScreen user={user} />}
        {screen === 'profile' && <ProfileScreen user={user} />}
        {screen === 'facial' && <FacialRecordsScreen user={user} />}
        {screen === 'recognition' && <RecognitionScreen user={user} />}
        {screen === 'history' && <HistoryScreen user={user} />}
      </View>

      <View style={styles.tabBar}>
        <TabButton
          label="Início"
          icon="🏠"
          active={screen === 'home'}
          onPress={() => setScreen('home')}
        />
        <TabButton
          label="Perfil"
          icon="👤"
          active={screen === 'profile'}
          onPress={() => setScreen('profile')}
        />
        <TabButton
          label="Faciais"
          icon="🧑‍💻"
          active={screen === 'facial'}
          onPress={() => setScreen('facial')}
        />
        <TabButton
          label="Verificar"
          icon="📸"
          active={screen === 'recognition'}
          onPress={() => setScreen('recognition')}
        />
        <TabButton
          label="Histórico"
          icon="🗂️"
          active={screen === 'history'}
          onPress={() => setScreen('history')}
        />
        <TabButton label="Sair" icon="🚪" active={false} onPress={handleLogout} />
      </View>

      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

interface TabButtonProps {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, icon, active, onPress }: TabButtonProps) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
