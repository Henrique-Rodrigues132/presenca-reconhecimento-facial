import { StyleSheet } from 'react-native';

// Paleta central do aplicativo.
export const colors = {
  primary: '#0B5FFF',
  primaryDark: '#0843B8',
  danger: '#E03131',
  success: '#2F9E44',
  warning: '#F08C00',
  background: '#F2F4F8',
  card: '#FFFFFF',
  text: '#1A1D23',
  textMuted: '#6B7280',
  border: '#D7DCE3',
  inputBg: '#FFFFFF',
  disabled: '#A9B4C2',
};

// Estilos reutilizados em todas as telas.
export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  // Cabeçalho
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subHeader: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },

  // Cartões
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardLine: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  cardLabel: {
    fontWeight: '700',
    color: colors.textMuted,
  },

  // Inputs
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Botões
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonSecondaryText: {
    color: colors.primary,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },

  // Linha de botões
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowItem: {
    flex: 1,
  },

  // Mensagens
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#EBFBEE',
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
  },

  // Estado vazio
  emptyBox: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
  },

  // Links / texto auxiliar
  linkText: {
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 18,
    fontSize: 15,
  },

  // Navegação inferior
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },

  // Avatar / foto
  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: colors.background,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: colors.background,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Câmera (tela de reconhecimento)
  cameraWrapper: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  camera: {
    flex: 1,
  },
  cameraHint: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cameraHintText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // Cards de resultado
  resultSuccess: {
    backgroundColor: '#EBFBEE',
    borderColor: colors.success,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },
  resultTitleSuccess: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.success,
    marginBottom: 10,
  },
  resultDanger: {
    backgroundColor: '#FFF0F0',
    borderColor: colors.danger,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
  },
  resultTitleDanger: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.danger,
    marginBottom: 10,
  },
});
