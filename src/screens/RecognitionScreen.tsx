import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { User } from 'firebase/auth';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { db } from '../firebase';
import { colors, styles } from '../styles';
import { AttendanceRecord, FacialRecord } from '../types';
import {
  describeDescriptorError,
  findBestFaceMatch,
  getFaceDescriptorFromImage,
  isModelLoaded,
  loadFaceModels,
  SIMILARITY_THRESHOLD,
} from '../utils/faceRecognition';

interface Props {
  user: User;
}

// Resultado da verificação exibido na tela.
type VerifyResult =
  | { kind: 'idle' }
  | { kind: 'message'; text: string }
  | {
      kind: 'matched';
      record: FacialRecord;
      similarity: number;
      verificationImageBase64: string;
    }
  | {
      kind: 'not-matched';
      similarity: number | null;
      verificationImageBase64: string;
    };

export default function RecognitionScreen({ user }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const [records, setRecords] = useState<FacialRecord[]>([]);
  const [modelReady, setModelReady] = useState(isModelLoaded());
  const [modelError, setModelError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult>({ kind: 'idle' });

  // Campos opcionais para o registro de presença.
  const [classroomName, setClassroomName] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerMsg, setRegisterMsg] = useState('');

  // Carrega o modelo de reconhecimento.
  useEffect(() => {
    let active = true;
    loadFaceModels()
      .then(() => active && setModelReady(true))
      .catch(
        () =>
          active &&
          setModelError(
            'Não foi possível carregar o modelo de reconhecimento. Este recurso exige um development build (não funciona no Expo Go).',
          ),
      );
    return () => {
      active = false;
    };
  }, []);

  // Carrega os cadastros faciais do usuário logado.
  const loadRecords = useCallback(async () => {
    try {
      const q = query(collection(db, 'facialRecords'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      setRecords(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FacialRecord, 'id'>) })),
      );
    } catch {
      setModelError('Não foi possível carregar os cadastros faciais.');
    }
  }, [user.uid]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  async function handleVerify() {
    if (!cameraRef.current || verifying) return;
    setVerifying(true);
    setResult({ kind: 'idle' });
    setRegisterMsg('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) {
        setResult({ kind: 'message', text: 'Não foi possível capturar a imagem.' });
        return;
      }

      const descResult = await getFaceDescriptorFromImage(photo.uri);
      if (!descResult.ok) {
        setResult({ kind: 'message', text: describeDescriptorError(descResult.reason) });
        return;
      }

      // Miniatura da captura para guardar no histórico.
      const thumb = await manipulateAsync(photo.uri, [{ resize: { width: 300 } }], {
        base64: true,
        compress: 0.5,
        format: SaveFormat.JPEG,
      });
      const verificationImageBase64 = thumb.base64
        ? `data:image/jpeg;base64,${thumb.base64}`
        : '';

      const best = findBestFaceMatch(descResult.descriptor, records);
      if (best && best.matched) {
        setResult({
          kind: 'matched',
          record: best.record,
          similarity: best.similarity,
          verificationImageBase64,
        });
      } else {
        setResult({
          kind: 'not-matched',
          similarity: best ? best.similarity : null,
          verificationImageBase64,
        });
      }
    } catch {
      setResult({ kind: 'message', text: 'Erro ao processar o reconhecimento. Tente novamente.' });
    } finally {
      setVerifying(false);
    }
  }

  async function registerAttendance(
    status: 'reconhecido' | 'nao_reconhecido',
    record: FacialRecord | null,
    similarity: number | null,
    verificationImageBase64: string,
  ) {
    setRegistering(true);
    setRegisterMsg('');
    try {
      const payload: Omit<AttendanceRecord, 'id'> = {
        userId: user.uid,
        facialRecordId: record ? record.id : null,
        facialRecordName: record ? record.name : null,
        facialRecordIdentifier: record ? record.identifier : null,
        classroomName: classroomName.trim() || null,
        discipline: discipline.trim() || null,
        status,
        similarity,
        checkedAt: Date.now(),
        verificationImageBase64: verificationImageBase64 || null,
      };
      await addDoc(collection(db, 'attendanceRecords'), payload);
      setRegisterMsg(
        status === 'reconhecido'
          ? 'Presença registrada com sucesso.'
          : 'Tentativa não reconhecida registrada.',
      );
    } catch {
      setRegisterMsg('Não foi possível registrar. Tente novamente.');
    } finally {
      setRegistering(false);
    }
  }

  // ── Permissão de câmera ──
  if (!permission) {
    return (
      <View style={[styles.flex, styles.centerContent]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Reconhecimento Facial</Text>
        <View style={[styles.card, styles.emptyBox]}>
          <Text style={styles.emptyText}>
            Precisamos da sua permissão para usar a câmera.
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Permitir câmera</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.header}>Reconhecimento Facial</Text>
      <Text style={styles.subHeader}>
        Posicione o rosto no centro da câmera e toque em “Capturar e verificar”.
      </Text>

      {modelError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{modelError}</Text>
        </View>
      ) : null}

      {/* Preview da câmera frontal */}
      <View style={styles.cameraWrapper}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.cameraHint}>
          <Text style={styles.cameraHintText}>Posicione o rosto no centro</Text>
        </View>
      </View>

      {!modelReady && !modelError ? (
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center' }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.cardLine, { marginLeft: 12, flex: 1 }]}>
            Carregando modelo de reconhecimento...
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, (verifying || !modelReady) && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={verifying || !modelReady}
        activeOpacity={0.8}
      >
        {verifying ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Capturar e verificar</Text>
        )}
      </TouchableOpacity>

      {/* Resultado */}
      {result.kind === 'message' ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{result.text}</Text>
        </View>
      ) : null}

      {result.kind === 'matched' ? (
        <View style={styles.resultSuccess}>
          <Text style={styles.resultTitleSuccess}>✅ Usuário cadastrado</Text>
          <Text style={styles.cardLine}>
            <Text style={styles.cardLabel}>Nome: </Text>
            {result.record.name}
          </Text>
          <Text style={styles.cardLine}>
            <Text style={styles.cardLabel}>Identificador: </Text>
            {result.record.identifier}
          </Text>
          {result.record.classGroup ? (
            <Text style={styles.cardLine}>
              <Text style={styles.cardLabel}>Turma: </Text>
              {result.record.classGroup}
            </Text>
          ) : null}
          <Text style={styles.cardLine}>
            <Text style={styles.cardLabel}>Similaridade: </Text>
            {(result.similarity * 100).toFixed(1)}% (limiar {(SIMILARITY_THRESHOLD * 100).toFixed(0)}%)
          </Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Sala / Aula (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Laboratório 3"
            placeholderTextColor={colors.textMuted}
            value={classroomName}
            onChangeText={setClassroomName}
            editable={!registering}
          />
          <Text style={styles.label}>Disciplina (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Trabalho Acadêmico Integrado II"
            placeholderTextColor={colors.textMuted}
            value={discipline}
            onChangeText={setDiscipline}
            editable={!registering}
          />

          <TouchableOpacity
            style={[styles.button, registering && styles.buttonDisabled]}
            onPress={() =>
              registerAttendance(
                'reconhecido',
                result.record,
                result.similarity,
                result.verificationImageBase64,
              )
            }
            disabled={registering}
            activeOpacity={0.8}
          >
            {registering ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Registrar presença</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {result.kind === 'not-matched' ? (
        <View style={styles.resultDanger}>
          <Text style={styles.resultTitleDanger}>⛔ Usuário não cadastrado</Text>
          <Text style={styles.cardLine}>
            Nenhuma pessoa cadastrada corresponde a este rosto.
          </Text>
          {result.similarity !== null ? (
            <Text style={styles.cardLine}>
              <Text style={styles.cardLabel}>Maior similaridade: </Text>
              {(result.similarity * 100).toFixed(1)}% (abaixo do limiar de{' '}
              {(SIMILARITY_THRESHOLD * 100).toFixed(0)}%)
            </Text>
          ) : (
            <Text style={styles.cardLine}>Não há cadastros faciais para comparar.</Text>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, registering && styles.buttonDisabled]}
            onPress={() =>
              registerAttendance('nao_reconhecido', null, result.similarity, result.verificationImageBase64)
            }
            disabled={registering}
            activeOpacity={0.8}
          >
            {registering ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={[styles.buttonText, styles.buttonSecondaryText]}>
                Registrar tentativa não reconhecida
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {registerMsg ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{registerMsg}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
