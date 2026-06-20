import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
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
  Image,
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
import { FacialRecord, FacialRecordForm } from '../types';
import {
  describeDescriptorError,
  getFaceDescriptorFromImage,
  isModelLoaded,
  loadFaceModels,
} from '../utils/faceRecognition';

interface Props {
  user: User;
}

const EMPTY_FORM: FacialRecordForm = {
  name: '',
  identifier: '',
  classGroup: '',
  observation: '',
  faceImageBase64: '',
  faceDescriptor: [],
};

export default function FacialRecordsScreen({ user }: Props) {
  const [records, setRecords] = useState<FacialRecord[]>([]);
  const [form, setForm] = useState<FacialRecordForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [modelReady, setModelReady] = useState(isModelLoaded());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Carrega o modelo de reconhecimento ao abrir a tela.
  useEffect(() => {
    let active = true;
    loadFaceModels()
      .then(() => active && setModelReady(true))
      .catch(() =>
        active &&
        setError(
          'Não foi possível carregar o modelo de reconhecimento. Este recurso exige um development build (não funciona no Expo Go).',
        ),
      );
    return () => {
      active = false;
    };
  }, []);

  const loadRecords = useCallback(async () => {
    setLoadingList(true);
    try {
      const q = query(collection(db, 'facialRecords'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list: FacialRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FacialRecord, 'id'>),
      }));
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      setRecords(list);
    } catch {
      setError('Não foi possível carregar os cadastros faciais.');
    } finally {
      setLoadingList(false);
    }
  }, [user.uid]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  function updateField(field: keyof FacialRecordForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(record: FacialRecord) {
    setForm({
      name: record.name,
      identifier: record.identifier,
      classGroup: record.classGroup,
      observation: record.observation,
      faceImageBase64: record.faceImageBase64,
      faceDescriptor: record.faceDescriptor ?? [],
    });
    setEditingId(record.id);
    setError('');
    setSuccess('');
  }

  // Processa a imagem escolhida: gera descritor facial real + miniatura base64.
  async function processPickedImage(uri: string) {
    setError('');
    setSuccess('');
    setProcessingImage(true);
    try {
      const result = await getFaceDescriptorFromImage(uri);
      if (!result.ok) {
        setError(describeDescriptorError(result.reason));
        return;
      }
      // Miniatura para armazenar no Firestore (base64 pequeno).
      const thumb = await manipulateAsync(uri, [{ resize: { width: 400 } }], {
        base64: true,
        compress: 0.6,
        format: SaveFormat.JPEG,
      });
      setForm((prev) => ({
        ...prev,
        faceImageBase64: thumb.base64 ? `data:image/jpeg;base64,${thumb.base64}` : '',
        faceDescriptor: result.descriptor,
      }));
      setSuccess('Rosto detectado e descritor gerado com sucesso.');
    } catch {
      setError('Falha ao processar a imagem. Tente novamente.');
    } finally {
      setProcessingImage(false);
    }
  }

  async function pickFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão de acesso à galeria negada.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      await processPickedImage(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão de câmera negada.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      await processPickedImage(result.assets[0].uri);
    }
  }

  async function handleSave() {
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('O nome da pessoa é obrigatório.');
      return;
    }
    if (!form.identifier.trim()) {
      setError('O identificador / matrícula é obrigatório.');
      return;
    }
    if (!form.faceDescriptor || form.faceDescriptor.length === 0) {
      setError('Selecione uma foto com um rosto válido para gerar o descritor facial.');
      return;
    }

    setSaving(true);
    try {
      const now = Date.now();
      if (editingId) {
        await updateDoc(doc(db, 'facialRecords', editingId), {
          name: form.name.trim(),
          identifier: form.identifier.trim(),
          classGroup: form.classGroup.trim(),
          observation: form.observation.trim(),
          faceImageBase64: form.faceImageBase64,
          faceDescriptor: form.faceDescriptor,
          updatedAt: now,
        });
        setSuccess('Cadastro facial atualizado com sucesso.');
      } else {
        await addDoc(collection(db, 'facialRecords'), {
          userId: user.uid,
          name: form.name.trim(),
          identifier: form.identifier.trim(),
          classGroup: form.classGroup.trim(),
          observation: form.observation.trim(),
          faceImageBase64: form.faceImageBase64,
          faceDescriptor: form.faceDescriptor,
          createdAt: now,
          updatedAt: now,
        });
        setSuccess('Cadastro facial criado com sucesso.');
      }
      resetForm();
      await loadRecords();
    } catch {
      setError('Não foi possível salvar o cadastro facial.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(record: FacialRecord) {
    Alert.alert('Excluir cadastro', `Deseja excluir o cadastro de "${record.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => handleDelete(record.id) },
    ]);
  }

  async function handleDelete(id: string) {
    setError('');
    setSuccess('');
    try {
      await deleteDoc(doc(db, 'facialRecords', id));
      if (editingId === id) resetForm();
      setSuccess('Cadastro facial excluído.');
      await loadRecords();
    } catch {
      setError('Não foi possível excluir o cadastro facial.');
    }
  }

  const busy = saving || processingImage;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Cadastros Faciais</Text>
        <Text style={styles.subHeader}>
          Cadastre as pessoas autorizadas. O app detecta o rosto e gera um descritor facial real.
        </Text>

        {!modelReady ? (
          <View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.cardLine, { marginLeft: 12, flex: 1 }]}>
              Carregando modelo de reconhecimento facial...
            </Text>
          </View>
        ) : null}

        {/* Formulário */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {editingId ? 'Editar cadastro facial' : 'Novo cadastro facial'}
          </Text>

          <Text style={styles.label}>Nome da pessoa *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            placeholderTextColor={colors.textMuted}
            value={form.name}
            onChangeText={(v) => updateField('name', v)}
            editable={!busy}
          />

          <Text style={styles.label}>Identificador / Matrícula / RA *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: 2023001234"
            placeholderTextColor={colors.textMuted}
            value={form.identifier}
            onChangeText={(v) => updateField('identifier', v)}
            editable={!busy}
          />

          <Text style={styles.label}>Curso / Turma</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Ciência da Computação - 5º"
            placeholderTextColor={colors.textMuted}
            value={form.classGroup}
            onChangeText={(v) => updateField('classGroup', v)}
            editable={!busy}
          />

          <Text style={styles.label}>Observação</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Observações adicionais"
            placeholderTextColor={colors.textMuted}
            value={form.observation}
            onChangeText={(v) => updateField('observation', v)}
            multiline
            editable={!busy}
          />

          <Text style={styles.label}>Foto facial *</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSecondary,
                styles.rowItem,
                { marginTop: 8 },
                (busy || !modelReady) && styles.buttonDisabled,
              ]}
              onPress={takePhoto}
              disabled={busy || !modelReady}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.buttonSecondaryText]}>📷 Câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSecondary,
                styles.rowItem,
                { marginTop: 8 },
                (busy || !modelReady) && styles.buttonDisabled,
              ]}
              onPress={pickFromGallery}
              disabled={busy || !modelReady}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.buttonSecondaryText]}>🖼️ Galeria</Text>
            </TouchableOpacity>
          </View>

          {processingImage ? (
            <View style={[styles.card, { marginTop: 12, flexDirection: 'row', alignItems: 'center' }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.cardLine, { marginLeft: 12 }]}>Detectando rosto...</Text>
            </View>
          ) : null}

          {form.faceImageBase64 ? (
            <Image
              source={{ uri: form.faceImageBase64 }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
          ) : null}

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
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={busy}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>
                {editingId ? 'Salvar alterações' : 'Criar cadastro'}
              </Text>
            )}
          </TouchableOpacity>

          {editingId ? (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={resetForm}
              disabled={busy}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Cancelar edição</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Lista */}
        <Text style={styles.sectionTitle}>Pessoas cadastradas</Text>

        {loadingList ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : records.length === 0 ? (
          <View style={[styles.card, styles.emptyBox]}>
            <Text style={styles.emptyText}>
              Nenhuma pessoa cadastrada ainda.{'\n'}Use o formulário acima para registrar a
              primeira.
            </Text>
          </View>
        ) : (
          records.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardRow}>
                {r.faceImageBase64 ? (
                  <Image
                    source={{ uri: r.faceImageBase64 }}
                    style={styles.photoThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photoThumb} />
                )}
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{r.name}</Text>
                  <Text style={styles.cardLine}>
                    <Text style={styles.cardLabel}>ID: </Text>
                    {r.identifier}
                  </Text>
                  {r.classGroup ? (
                    <Text style={styles.cardLine}>
                      <Text style={styles.cardLabel}>Turma: </Text>
                      {r.classGroup}
                    </Text>
                  ) : null}
                </View>
              </View>

              {r.observation ? (
                <Text style={[styles.cardLine, { marginTop: 8 }]}>
                  <Text style={styles.cardLabel}>Obs.: </Text>
                  {r.observation}
                </Text>
              ) : null}

              <View style={[styles.row, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, styles.rowItem, { marginTop: 0 }]}
                  onPress={() => startEdit(r)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.buttonDanger, styles.rowItem, { marginTop: 0 }]}
                  onPress={() => confirmDelete(r)}
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
