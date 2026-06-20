// Tipos compartilhados do aplicativo.

// Telas da área autenticada (navegação por estado local).
export type AppScreen = 'home' | 'profile' | 'facial' | 'recognition' | 'history';

// Perfil do usuário autenticado (coleção `profiles` no Firestore).
export interface Profile {
  id: string;
  userId: string;
  nome: string;
  curso: string;
  periodo: string;
  matricula: string;
  observacao: string;
  createdAt: number;
  updatedAt: number;
}

// Dados editáveis do perfil (sem campos de controle).
export interface ProfileForm {
  nome: string;
  curso: string;
  periodo: string;
  matricula: string;
  observacao: string;
}

// Cadastro facial (coleção `facialRecords` no Firestore).
export interface FacialRecord {
  id: string;
  userId: string;
  name: string;
  identifier: string;
  classGroup: string;
  observation: string;
  // Foto armazenada como string base64 (data URI) diretamente no Firestore.
  faceImageBase64: string;
  // Descritor/embedding facial real (MobileFaceNet → 192 dimensões), L2-normalizado.
  faceDescriptor: number[];
  createdAt: number;
  updatedAt: number;
}

// Dados editáveis do cadastro facial (formulário).
export interface FacialRecordForm {
  name: string;
  identifier: string;
  classGroup: string;
  observation: string;
  faceImageBase64: string;
  faceDescriptor: number[];
}

// Registro de presença/acesso (coleção `attendanceRecords` no Firestore).
export interface AttendanceRecord {
  id: string;
  userId: string;
  facialRecordId: string | null;
  facialRecordName: string | null;
  facialRecordIdentifier: string | null;
  classroomName?: string | null;
  discipline?: string | null;
  // "reconhecido" quando houve match acima do limiar; "nao_reconhecido" caso contrário.
  status: 'reconhecido' | 'nao_reconhecido';
  // Similaridade (cosseno, 0..1) do melhor match encontrado.
  similarity: number | null;
  checkedAt: number;
  verificationImageBase64?: string | null;
}
