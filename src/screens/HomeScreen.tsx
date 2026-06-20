import { User } from 'firebase/auth';
import { ScrollView, Text, View } from 'react-native';

import { styles } from '../styles';

interface Props {
  user: User;
}

export default function HomeScreen({ user }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.header}>Início</Text>
      <Text style={styles.subHeader}>Sistema de Presença por Reconhecimento Facial</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Usuário autenticado</Text>
        <Text style={styles.cardLine}>{user.email}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Autores</Text>
        <Text style={styles.cardLine}>• Henrique Rodrigues</Text>
        <Text style={styles.cardLine}>• Kaio Ramos</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sobre o sistema</Text>
        <Text style={styles.cardLine}>
          Este aplicativo faz parte do projeto de Controle de Presença em laboratórios por
          reconhecimento facial. A responsabilidade desta dupla é a tela de{' '}
          <Text style={styles.cardLabel}>Cadastros Faciais</Text>, onde são registradas as pessoas
          e suas fotos de referência usadas pelo sistema de presença.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Persistência dos dados</Text>
        <Text style={styles.cardLine}>
          Os dados são persistidos remotamente no <Text style={styles.cardLabel}>Firebase</Text>:
          a autenticação usa o <Text style={styles.cardLabel}>Firebase Authentication</Text> e os
          cadastros são armazenados no <Text style={styles.cardLabel}>Cloud Firestore</Text>. Cada
          usuário vê apenas os próprios registros.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Como funciona o reconhecimento</Text>
        <Text style={styles.cardLine}>
          No cadastro, o app detecta o rosto na foto e gera um{' '}
          <Text style={styles.cardLabel}>descritor facial real</Text> (embedding de 192 dimensões,
          MobileFaceNet). Na verificação, a câmera captura um rosto, gera o descritor e o{' '}
          <Text style={styles.cardLabel}>compara</Text> com os cadastrados por similaridade do
          cosseno para informar se a pessoa é cadastrada ou não.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Como navegar</Text>
        <Text style={styles.cardLine}>
          • <Text style={styles.cardLabel}>Perfil</Text>: seus dados acadêmicos (CRUD completo).
        </Text>
        <Text style={styles.cardLine}>
          • <Text style={styles.cardLabel}>Faciais</Text>: cadastre pessoas com foto (câmera ou
          galeria) e descritor facial (CRUD completo).
        </Text>
        <Text style={styles.cardLine}>
          • <Text style={styles.cardLabel}>Verificar</Text>: abre a câmera, reconhece o rosto e
          registra presença.
        </Text>
        <Text style={styles.cardLine}>
          • <Text style={styles.cardLabel}>Histórico</Text>: lista os registros de presença/acesso.
        </Text>
        <Text style={styles.cardLine}>
          • <Text style={styles.cardLabel}>Sair</Text>: encerra a sessão.
        </Text>
      </View>
    </ScrollView>
  );
}
