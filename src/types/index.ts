export type Language = 'vi' | 'en';
export type ThemeMode = 'dark' | 'light';

export type MusicGenre =
  | 'Nhạc trẻ'
  | 'EDM'
  | 'Remix'
  | 'Dance'
  | 'Pop'
  | 'Ballad'
  | 'Bolero'
  | 'Rap'
  | 'Rock'
  | 'Nhạc dân tộc Việt Nam'
  | 'Nhạc trữ tình'
  | 'Nhạc thiếu nhi'
  | 'Vinahouse'
  | 'Dân ca Việt Nam'
  | 'Nhạc Tây Bắc'
  | 'Nhạc dân tộc Lào Cai'
  | 'Acoustic'
  | 'Lofi';

export type VocalType = 'male' | 'female' | 'duet' | 'instrumental';

export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: MusicGenre;
  vocalType: VocalType;
  vocalLanguage?: Language | 'auto';
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string;
  lyrics?: string;
  promptStyle?: string;
  bpm?: number;
  mood?: string;
  createdAt: string;
  isFavorite?: boolean;
  playsCount: number;
  likesCount: number;
  downloadsCount?: number;
  userId?: string;
  userName?: string;
  isAiCover?: boolean;
  originalArtist?: string;
  voiceModelId?: string;
  provider?: string;
  taskId?: string;
  isRealAiGenerated?: boolean;
  stems?: {
    vocals: string;
    drums?: string;
    bass?: string;
    other?: string;
    instrumental?: string;
  };
}

export interface VoiceModel {
  id: string;
  name: string;
  gender: 'male' | 'female';
  category: 'Popular' | 'V-Pop' | 'K-Pop' | 'Folk' | 'US-UK' | 'Anime';
  avatarUrl: string;
  sampleAudioUrl: string;
  description: string;
  isLicensed: boolean;
  rvcModelId?: string;
}

export interface DownloadRecord {
  id: string;
  songId: string;
  title: string;
  audioUrl: string;
  format: string;
  downloadedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar: string;
  createdAt: string;
  savedSongsCount: number;
  coversCount: number;
  isBanned?: boolean;
  downloadsHistory?: DownloadRecord[];
}

export type AIProviderId = 'suno' | 'minimax' | 'replicate' | 'fal' | 'custom';

export interface ProviderCapabilities {
  supportsMusicGeneration: boolean;
  supportsVocals: boolean;
  supportsLyrics: boolean;
  supportsTwoVersions: boolean;
  supportsCover: boolean;
  supportsStemSeparation: boolean;
  supportsInstrumental: boolean;
  maxDurationSec: number;
  notes: string;
}

export interface ProviderItemStatus {
  id: AIProviderId;
  name: string;
  enabled: boolean;
  isConfigured: boolean;
  apiKeyMasked: string;
  baseUrl: string;
  model: string;
  capabilities: ProviderCapabilities;
}

export interface ProviderConfig {
  provider: AIProviderId;
  apiKeyMasked: string;
  baseUrl: string;
  model: string;
  isConfigured: boolean;
  enabled: boolean;
  status: 'connected' | 'unconfigured' | 'disabled' | 'error' | 'checking';
  lastChecked?: string;
  statusMessage?: string;
  isServerless?: boolean;
  capabilities: ProviderCapabilities;
  providers: Record<AIProviderId, ProviderItemStatus>;
}

export interface TaskLog {
  id: string;
  taskId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  provider: string;
}

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MusicGenerationTask {
  id: string;
  provider: AIProviderId;
  type: 'music' | 'cover' | 'stems';
  status: TaskStatus;
  progress: number;
  title: string;
  promptStyle: string;
  lyrics?: string;
  genre: MusicGenre;
  vocalType: VocalType;
  vocalLanguage?: Language | 'auto';
  bpm?: number;
  externalTaskId?: string;
  resultAudioUrl?: string;
  resultCoverUrl?: string;
  resultStems?: {
    vocals?: string;
    instrumental?: string;
    drums?: string;
    bass?: string;
  };
  error?: string;
  logs: string[];
  createdAt: string;
  updatedAt: string;
  voiceModelId?: string;
  userId?: string;
  songData?: Song;
  songsData?: Song[];
}

export interface AdBanner {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  targetUrl: string;
  placement: 'home_top' | 'home_mid' | 'sidebar' | 'player';
  isActive: boolean;
  clicksCount: number;
  createdAt: string;
}

export interface WebsiteConfig {
  siteName: string;
  siteTagline: string;
  announcementText: string;
  showAnnouncement: boolean;
  adsEnabled: boolean;
  adsenseClientId: string;
  adsenseSlotId: string;
  maxUploadMb: number;
  rateLimitPerHour: number;
  maintenanceMode: boolean;
}

export interface ApiUsageSummary {
  totalRequests: number;
  successfulGenerations: number;
  failedRequests: number;
  estimatedCostUsd: number;
}

export interface StemTrack {
  name: string;
  type: 'vocals' | 'drums' | 'bass' | 'melody';
  url: string;
  volume: number;
  isMuted: boolean;
  color: string;
}
