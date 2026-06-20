import { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { db } from '../firebase';
import { colors, styles } from '../styles';
import { Profile, ProfileForm } from '../types';

interface Props {
  user: User;
}

const EMPTY_FORM: ProfileForm = {
  nome: '',
  curso: '',
  periodo: '',
  matricula: '',
  observacao: '',
};

export default function ProfileScreen({ user }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carrega os perfis do usuário autenticado (filtrados por userId).
  const loadProfiles = useCallback(async () => {
    setLoadingList(true);
    setError('');
    try {
      const q = query(collection(db, 'profiles'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list: Profile[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Profile, 'id'>),
      }));
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      setProfiles(list);
    } catch {
      setError('Não foi possível carregar os perfis.');
    } finally {
      setLoadingList(false);
    }
  }, [user.uid]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(profile: Profile) {
    setForm({
      nome: profile.nome,
      curso: profile.curso,
      periodo: profile.periodo,
      matricula: profile.matricula,
      observacao: profile.observacao,
    });
    setEditingId(profile.id);
    setError('');
    setSuccess('');
  }

  async function handleSave() {
    setError('');
    setSuccess('');

    if (!form.nome.trim()) {
      setError('O nome é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      if (editingId) {
        // Atualiza perfil existente.
        await updateDoc(doc(db, 'profiles', editingId), {
          nome: form.nome.trim(),
          curso: form.curso.trim(),
          periodo: form.periodo.trim(),
          matricula: form.matricula.trim(),
          observacao: form.observacao.trim(),
          updatedAt: now,
        });
        setSuccess('Perfil atualizado com sucesso.');
      } else {
        // Cria novo perfil.
        await addDoc(collection(db, 'profiles'), {
          userId: user.uid,
          nome: form.nome.trim(),
          curso: form.curso.trim(),
          periodo: form.periodo.trim(),
          matricula: form.matricula.trim(),
          observacao: form.observacao.trim(),
          createdAt: now,
          updatedAt: now,
        });
        setSuccess('Perfil criado com sucesso.');
      }
      resetForm();
      await loadProfiles();
    } catch {
      setError('Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(profile: Profile) {
    Alert.alert('Excluir perfil', `Deseja excluir o perfil "${profile.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => handleDelete(profile.id),
      },
    ]);
  }

  async function handleDelete(id: string) {
    setError('');
    setSuccess('');
    try {
      await deleteDoc(doc(db, 'profiles', id));
      if (editingId === id) resetForm();
      setSuccess('Perfil excluído.');
      await loadProfiles();
    } catch {
      setError('Não foi possível excluir o perfil.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Perfil</Text>
        <Text style={styles.subHeader}>Gerencie seus dados acadêmicos (CRUD no Firestore).</Text>

        {/* Formulário de criação/edição */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {editingId ? 'Editar perfil' : 'Novo perfil'}
          </Text>

          <Text style={styles.label}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            placeholderTextColor={colors.textMuted}
            value={form.nome}
            onChangeText={(v) => updateField('nome', v)}
            editable={!saving}
          />

          <Text style={styles.label}>Curso</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Ciência da Computação"
            placeholderTextColor={colors.textMuted}
            value={form.curso}
            onChangeText={(v) => updateField('curso', v)}
            editable={!saving}
          />

          <Text style={styles.label}>Período</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 5º período"
            placeholderTextColor={colors.textMuted}
            value={form.periodo}
            onChangeText={(v) => updateField('periodo', v)}
            editable={!saving}
          />

          <Text style={styles.label}>Matrícula / RA</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 123456"
            placeholderTextColor={colors.textMuted}
            value={form.matricula}
            onChangeText={(v) => updateField('matricula', v)}
            editable={!saving}
          />

          <Text style={styles.label}>Observação</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Observações adicionais"
            placeholderTextColor={colors.textMuted}
            value={form.observacao}
            onChangeText={(v) => updateField('observacao', v)}
            multiline
            editable={!saving}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{success}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>
                {editingId ? 'Salvar alterações' : 'Criar perfil'}
              </Text>
            )}
          </TouchableOpacity>

          {editingId ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={resetForm}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Cancelar edição</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Lista de perfis */}
        <Text style={styles.sectionTitle}>Seus perfis</Text>

        {loadingList ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : profiles.length === 0 ? (
          <View style={[styles.card, styles.emptyBox]}>
            <Text style={styles.emptyText}>
              Nenhum perfil cadastrado ainda.{'\n'}Preencha o formulário acima para criar o
              primeiro.
            </Text>
          </View>
        ) : (
          profiles.map((p) => (
            <View key={p.id} style={styles.card}>
              <Text style={styles.cardTitle}>{p.nome}</Text>
              {p.curso ? (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>Curso: </Text>
                  {p.curso}
                </Text>
              ) : null}
              {p.periodo ? (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>Período: </Text>
                  {p.periodo}
                </Text>
              ) : null}
              {p.matricula ? (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>Matrícula/RA: </Text>
                  {p.matricula}
                </Text>
              ) : null}
              {p.observacao ? (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>Obs.: </Text>
                  {p.observacao}
                </Text>
              ) : null}

              <View style={[styles.row, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, styles.rowItem, { marginTop: 0 }]}
                  onPress={() => startEdit(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonDanger, styles.rowItem, { marginTop: 0 }]}
                  onPress={() => confirmDelete(p)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
