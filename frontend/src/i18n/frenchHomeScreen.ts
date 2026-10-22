import type { MessageKey } from './catalog'

/**
 * 首页专用法语词典：只覆盖项目首页（`/chat` 新对话）上可见的文案。
 * 未列出的键回退到英文，其他页面保持原语言。
 * 法语为访问级选择，由首页顶栏的语言切换器开启，不写入长期存储。
 */
export const frenchHomeScreen = {
  // 顶栏语言切换器
  homeLanguage: 'Langue de la page d’accueil',
  homeLanguageFrench: 'Afficher la page d’accueil en français',
  homeLanguageOriginal: 'Revenir à la langue d’origine',

  // 左侧导航
  navigation: 'Navigation principale',
  home: 'Accueil',
  sidebarExample: 'Exemple de panneau latéral',
  agentRendering: 'Rendu de l’agent',
  usageTitle: 'Statistiques du site',
  myProfile: 'Mon profil',
  chats: 'Conversations',
  noChats: 'Aucune conversation',
  loadMore: 'Charger plus',
  loading: 'Chargement…',
  retry: 'Réessayer',
  chatActions: 'Gérer « {title} »',
  stopBeforeAction: 'Arrêtez d’abord la génération en cours.',
  waitBeforeAction: 'Attendez la fin de l’action en cours.',
  creatorCredit: 'Réalisé par xiaotongyu.com',
  creatorCelebration: 'Lancer les confettis',
  expandSidebar: 'Déplier la navigation',
  collapseSidebar: 'Replier la navigation',
  pinSidebar: 'Épingler la navigation ouverte',
  resizeSidebar: 'Ajuster la largeur de la navigation',
  openNavigation: 'Ouvrir la navigation',
  closeNavigation: 'Fermer la navigation',
  darkTheme: 'Passer au thème sombre',
  lightTheme: 'Passer au thème clair',

  // 首页顶栏与历史选择器
  newChat: 'Nouvelle conversation',
  openingChat: 'Ouverture de la conversation…',
  conversationHistory: 'Historique des conversations',
  searchHistory: 'Rechercher dans l’historique des conversations',
  searchHistoryPlaceholder: 'Rechercher dans l’historique…',
  noMatchingChats: 'Aucune conversation correspondante',
  loadMoreChats: 'Charger plus de conversations',
  historyRefreshFailed: 'Impossible d’actualiser l’historique des conversations.',

  // 新对话问候与输入区
  conversation: 'Conversation CornAgent',
  greetingMorning: 'Bonjour',
  greetingAfternoon: 'Bon après-midi',
  greetingEvening: 'Bonsoir',
  askAnything: 'Posez votre question…',
  promptInput: 'Message pour l’agent',
  inputOptions: 'Options du message',
  defaultModel: 'Modèle par défaut',
  configuredModel: 'Utilise le modèle configuré sur le serveur',
  chooseFiles: 'Choisir des fichiers',
  addFiles: 'Ajouter des fichiers',
  sendMessage: 'Envoyer le message',
  stopGeneration: 'Arrêter la génération',
  cancel: 'Annuler',

  // 首页可见的附件状态
  pendingFiles: 'Fichiers à envoyer',
  openFile: 'Ouvrir {name}',
  previewFile: 'Aperçu de {name}',
  removeFile: 'Retirer {name}',
  retryFile: 'Réessayer {name}',
  retryProcessing: 'Relancer le traitement',
  processingFailed: 'Échec du traitement',
  fileUploading: 'Envoi de {name}',
  fileProcessing: 'Traitement de {name}',
  fileFailed: 'Échec du traitement de {name}',
  fileReady: '{name} est prêt',
  closePreview: 'Fermer l’aperçu de l’image',
  downloadFile: 'Télécharger {name}',
  fileInputDisabled: 'L’envoi de fichiers est désactivé.',

  // 首页不可用状态
  unavailable: 'Agent indisponible',
  unavailableHelp:
    'Vérifiez les identifiants du modèle et la connexion Redis sur le serveur, puis actualisez la page.',
  modelNotConfigured:
    'Aucune clé d’API de modèle n’est configurée. Configurez la clé du modèle sur le serveur, puis redémarrez le service.',
  eventStreamNotConfigured:
    'Aucun flux d’événements n’est configuré. Configurez Redis, puis redémarrez le service.',

  // 首页项目介绍
  projectTitle: 'CornAgent — Agent IA full-stack open source',
  projectDescription:
    'Un agent IA intégrable, conçu avec React et FastAPI. Auto-hébergez-le avec diffusion en continu, pause et reprise, état durable et sous-tâches parallèles.',
  projectShortDescription: 'Conçu avec React et FastAPI. Intégrez-le à votre application.',
  projectLinks: 'Ressources du projet',
  projectQuickStart: 'Démarrage rapide',
  projectIntegration: 'Intégrer à votre application',
  projectListingBadge: 'Badge CornAgent',
} as const satisfies Partial<Record<MessageKey, string>>

export type FrenchHomeScreenKey = keyof typeof frenchHomeScreen
