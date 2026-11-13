import { AIProviderId, ProviderCapabilities } from '../../../types/index.js';

export interface ProviderEntryConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AdapterGenerationParams {
  title: string;
  lyrics: string;
  genre: string;
  promptStyle: string;
  vocalType: string;
  vocalLanguage?: string;
  duration?: number;
  bpm?: number;
  versionCount?: number;
  voiceModelId?: string;
  audioInputUrl?: string;
  similarity?: number;
  pitchShift?: number;
  volumeBalance?: number;
  keepOriginalInst?: boolean;
  separateVocals?: boolean;
  callbackUrl?: string;
}

export interface AdapterTestResult {
  success: boolean;
  provider: AIProviderId;
  statusCode?: number;
  latencyMs: number;
  message: string;
}

export interface AdapterSubmitResult {
  externalTaskId?: string;
  immediateTracks?: Array<{ audioUrl: string; coverUrl?: string; title?: string }>;
  immediateStems?: {
    vocals?: string;
    instrumental?: string;
    drums?: string;
    bass?: string;
  };
  progressLog: string;
}

export interface AdapterPollResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  log?: string;
  tracks?: Array<{ audioUrl: string; coverUrl?: string; title?: string }>;
  stems?: {
    vocals?: string;
    instrumental?: string;
    drums?: string;
    bass?: string;
  };
  error?: string;
}

export interface ProviderAdapter {
  id: AIProviderId;
  displayName: string;
  defaultBaseUrl: string;
  defaultModel: string;
  capabilities: ProviderCapabilities;
  testConnection(cfg: ProviderEntryConfig): Promise<AdapterTestResult>;
  submitMusic(cfg: ProviderEntryConfig, params: AdapterGenerationParams): Promise<AdapterSubmitResult>;
  submitCover?(cfg: ProviderEntryConfig, params: AdapterGenerationParams): Promise<AdapterSubmitResult>;
  submitStems?(cfg: ProviderEntryConfig, audioInputUrl: string): Promise<AdapterSubmitResult>;
  pollTask?(
    cfg: ProviderEntryConfig,
    externalTaskId: string,
    taskType: 'music' | 'cover' | 'stems'
  ): Promise<AdapterPollResult>;
}
