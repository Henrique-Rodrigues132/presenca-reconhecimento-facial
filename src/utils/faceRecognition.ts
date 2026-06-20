import FaceDetection, { Face } from '@react-native-ml-kit/face-detection';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode as decodeJpeg } from 'jpeg-js';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

import { FacialRecord } from '../types';

/**
 * Reconhecimento facial REAL (caminho B — development build).
 *
 * Pipeline:
 *  1. Normaliza a imagem (orientação + escala) com expo-image-manipulator.
 *  2. Detecta rostos com ML Kit (react-native-ml-kit/face-detection).
 *  3. Recorta o rosto, redimensiona para 112x112 e normaliza os pixels.
 *  4. Gera o embedding de 192 dimensões com MobileFaceNet via react-native-fast-tflite.
 *  5. Compara embeddings por similaridade do cosseno.
 *
 * Observação: requer modelos nativos (TFLite + ML Kit) — NÃO roda no Expo Go,
 * apenas em development build. Ver README.
 */

// ───────────────────────── Configuração ─────────────────────────

// Dimensão de entrada do MobileFaceNet (112x112 RGB).
const INPUT_SIZE = 112;

// Largura para a qual a imagem é normalizada antes de detectar/recortar
// (orientação corrigida + decode mais rápido).
const NORMALIZED_WIDTH = 640;

/**
 * Limiar de similaridade do cosseno para considerar "mesma pessoa".
 * Embeddings são L2-normalizados, então a similaridade vai de -1 a 1.
 * Faixa razoável para protótipo: 0.45 (mais permissivo) a 0.65 (mais rígido).
 * Ajuste aqui conforme os testes.
 */
export const SIMILARITY_THRESHOLD = 0.5;

// ───────────────────────── Estado do modelo ─────────────────────────

let model: TensorflowModel | null = null;
let loadingPromise: Promise<void> | null = null;

/** Carrega o modelo MobileFaceNet (idempotente). */
export async function loadFaceModels(): Promise<void> {
  if (model) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    model = await loadTensorflowModel(
      require('../../assets/models/mobilefacenet.tflite'),
      [],
    );
  })();
  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

export function isModelLoaded(): boolean {
  return model !== null;
}

// ───────────────────────── Tipos de resultado ─────────────────────────

export type DescriptorResult =
  | { ok: true; descriptor: number[]; face: Face }
  | {
      ok: false;
      reason: 'model-not-loaded' | 'no-face' | 'multiple-faces' | 'decode-error';
    };

export interface FaceMatch {
  record: FacialRecord;
  similarity: number;
  matched: boolean;
}

/** Mensagem clara em português para cada motivo de falha ao gerar o descritor. */
export function describeDescriptorError(
  reason: Exclude<DescriptorResult, { ok: true }>['reason'],
): string {
  switch (reason) {
    case 'no-face':
      return 'Nenhum rosto detectado na imagem.';
    case 'multiple-faces':
      return 'Mais de um rosto detectado. Use uma foto com apenas uma pessoa.';
    case 'model-not-loaded':
      return 'O modelo de reconhecimento ainda não foi carregado. Aguarde e tente novamente.';
    case 'decode-error':
      return 'Não foi possível processar a imagem. Tente outra foto.';
    default:
      return 'Falha ao processar o rosto.';
  }
}

// ───────────────────────── Geração de descritor ─────────────────────────

/**
 * Detecta o rosto na imagem (URI) e retorna o embedding facial real.
 * Retorna motivo claro quando não há rosto ou há mais de um.
 */
export async function getFaceDescriptorFromImage(uri: string): Promise<DescriptorResult> {
  if (!model) return { ok: false, reason: 'model-not-loaded' };

  // 1. Normaliza orientação e escala; obtém também o base64 da MESMA imagem
  //    para garantir que ML Kit e jpeg-js usem exatamente os mesmos pixels.
  const normalized = await manipulateAsync(uri, [{ resize: { width: NORMALIZED_WIDTH } }], {
    base64: true,
    compress: 0.92,
    format: SaveFormat.JPEG,
  });

  // 2. Detecção de rosto (ML Kit).
  const faces = await FaceDetection.detect(normalized.uri, {
    performanceMode: 'accurate',
    landmarkMode: 'none',
  });
  if (faces.length === 0) return { ok: false, reason: 'no-face' };
  if (faces.length > 1) return { ok: false, reason: 'multiple-faces' };
  const face = faces[0];

  // 3. Decodifica os pixels da imagem normalizada.
  if (!normalized.base64) return { ok: false, reason: 'decode-error' };
  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    const bytes = base64ToUint8Array(normalized.base64);
    decoded = decodeJpeg(bytes, { useTArray: true }) as {
      width: number;
      height: number;
      data: Uint8Array;
    };
  } catch {
    return { ok: false, reason: 'decode-error' };
  }

  // 4. Recorta o rosto, redimensiona para 112x112 e normaliza.
  const input = buildInputTensor(decoded, face.frame);

  // 5. Inferência → embedding de 192 dimensões.
  const outputs = model.runSync([input.buffer as ArrayBuffer]);
  const embedding = Array.from(new Float32Array(outputs[0]));
  const descriptor = l2normalize(embedding);

  return { ok: true, descriptor, face };
}

// ───────────────────────── Comparação ─────────────────────────

/** Similaridade do cosseno entre dois embeddings L2-normalizados (-1..1). */
export function compareFaceDescriptors(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return -1;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/** Distância euclidiana (alternativa de comparação). */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Encontra o melhor match entre os cadastros. Retorna null se não houver
 * cadastros com descritor. `matched` indica se passou do limiar.
 */
export function findBestFaceMatch(
  descriptor: number[],
  records: FacialRecord[],
  threshold: number = SIMILARITY_THRESHOLD,
): FaceMatch | null {
  let best: FaceMatch | null = null;
  for (const record of records) {
    if (!record.faceDescriptor || record.faceDescriptor.length === 0) continue;
    const similarity = compareFaceDescriptors(descriptor, record.faceDescriptor);
    if (!best || similarity > best.similarity) {
      best = { record, similarity, matched: similarity >= threshold };
    }
  }
  return best;
}

// ───────────────────────── Helpers internos ─────────────────────────

/**
 * Recorta a região do rosto da imagem decodificada (RGBA), redimensiona para
 * INPUT_SIZE x INPUT_SIZE por amostragem bilinear e normaliza para [-1, 1]
 * (padrão do MobileFaceNet: (pixel - 127.5) / 128).
 */
function buildInputTensor(
  image: { width: number; height: number; data: Uint8Array },
  frame: { left: number; top: number; width: number; height: number },
): Float32Array {
  const { width: imgW, height: imgH, data } = image;

  // Clampa o bounding box aos limites da imagem.
  const left = Math.max(0, Math.floor(frame.left));
  const top = Math.max(0, Math.floor(frame.top));
  const right = Math.min(imgW, Math.ceil(frame.left + frame.width));
  const bottom = Math.min(imgH, Math.ceil(frame.top + frame.height));
  const cropW = Math.max(1, right - left);
  const cropH = Math.max(1, bottom - top);

  const out = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  let o = 0;
  for (let y = 0; y < INPUT_SIZE; y++) {
    // Coordenada de origem (bilinear) na altura.
    const srcY = top + ((y + 0.5) * cropH) / INPUT_SIZE - 0.5;
    const y0 = Math.max(top, Math.min(bottom - 1, Math.floor(srcY)));
    const y1 = Math.min(bottom - 1, y0 + 1);
    const wy = srcY - y0;
    for (let x = 0; x < INPUT_SIZE; x++) {
      const srcX = left + ((x + 0.5) * cropW) / INPUT_SIZE - 0.5;
      const x0 = Math.max(left, Math.min(right - 1, Math.floor(srcX)));
      const x1 = Math.min(right - 1, x0 + 1);
      const wx = srcX - x0;

      // Índices RGBA dos 4 vizinhos.
      const i00 = (y0 * imgW + x0) * 4;
      const i01 = (y0 * imgW + x1) * 4;
      const i10 = (y1 * imgW + x0) * 4;
      const i11 = (y1 * imgW + x1) * 4;

      for (let c = 0; c < 3; c++) {
        const top0 = data[i00 + c] * (1 - wx) + data[i01 + c] * wx;
        const bot0 = data[i10 + c] * (1 - wx) + data[i11 + c] * wx;
        const value = top0 * (1 - wy) + bot0 * wy;
        out[o++] = (value - 127.5) / 128;
      }
    }
  }
  return out;
}

/** L2-normaliza um vetor (para usar similaridade do cosseno como produto interno). */
function l2normalize(v: number[]): number[] {
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return v.map((x) => x / norm);
}

/** Decodifica base64 para Uint8Array (sem depender de atob/Buffer). */
function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  let bufferLength = (base64.length * 3) / 4;
  if (base64[base64.length - 1] === '=') bufferLength--;
  if (base64[base64.length - 2] === '=') bufferLength--;

  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const e1 = lookup[base64.charCodeAt(i)];
    const e2 = lookup[base64.charCodeAt(i + 1)];
    const e3 = lookup[base64.charCodeAt(i + 2)];
    const e4 = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (e1 << 2) | (e2 >> 4);
    if (p < bufferLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
    if (p < bufferLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
  }
  return bytes;
}
