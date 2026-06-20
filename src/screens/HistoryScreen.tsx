import { User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { db } from '../firebase';
import { colors, styles } from '../styles';
import { AttendanceRecord } from '../types';

interface Props {
  user: User;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('pt-BR');
}

export default function HistoryScreen({ user }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadRecords = useCallback(async () => {
    setError('');
    try {
      const q = query(collection(db, 'attendanceRecords'), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      const list: AttendanceRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AttendanceRecord, 'id'>),
      }));
      list.sort((a, b) => b.checkedAt - a.checkedAt);
      setRecords(list);
    } catch {
      setError('Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.uid]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  function onRefresh() {
    setRefreshing(true);
    loadRecords();
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.header}>Histórico</Text>
      <Text style={styles.subHeader}>Registros de presença/acesso (puxe para atualizar).</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : records.length === 0 ? (
        <View style={[styles.card, styles.emptyBox]}>
          <Text style={styles.emptyText}>
            Nenhum registro ainda.{'\n'}Use a tela de Reconhecimento Facial para registrar
            presenças.
          </Text>
        </View>
      ) : (
        records.map((r) => {
          const recognized = r.status === 'reconhecido';
          return (
            <View
              key={r.id}
              style={[styles.card, { borderLeftWidth: 5, borderLeftColor: recognized ? colors.success : colors.danger }]}
            >
              <View style={styles.cardRow}>
                {r.verificationImageBase64 ? (
                  <Image
                    source={{ uri: r.verificationImageBase64 }}
                    style={styles.photoThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photoThumb} />
                )}
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, { color: recognized ? colors.success : colors.danger }]}>
                    {recognized ? 'Reconhecido' : 'Não reconhecido'}
                  </Text>
                  {recognized ? (
                    <>
                      <Text style={styles.cardLine}>
                        <Text style={styles.cardLabel}>Nome: </Text>
                        {r.facialRecordName}
                      </Text>
                      <Text style={styles.cardLine}>
                        <Text style={styles.cardLabel}>ID: </Text>
                        {r.facialRecordIdentifier}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>

              {r.classroomName ? (
                <Text style={[styles.cardLine, { marginTop: 8 }]}>
                  <Text style={styles.cardLabel}>Sala: </Text>
                  {r.classroomName}
                </Text>
              ) : null}
              {r.discipline ? (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>Disciplina: </Text>
                  {r.discipline}
                </Text>
              ) : null}
              {r.similarity !== null && r.similarity !== undefined ? (
                <Text style={styles.cardLine}>
                  <Text style={styles.cardLabel}>Similaridade: </Text>
                  {(r.similarity * 100).toFixed(1)}%
                </Text>
              ) : null}
              <Text style={[styles.cardLine, { color: colors.textMuted, marginTop: 4 }]}>
                {formatDate(r.checkedAt)}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
