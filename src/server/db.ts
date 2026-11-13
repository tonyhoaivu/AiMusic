import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Song,
  User,
  AdBanner,
  WebsiteConfig,
  TaskLog,
  MusicGenerationTask,
  AIProviderId,
  ApiUsageSummary,
} from '../types/index.js';
import { ProviderEntryConfig } from './providers/adapters/types.js';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface StoredProviderConfig {
  provider: AIProviderId;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  songs: Song[];
  ads: AdBanner[];
  websiteConfig: WebsiteConfig;
  activeProvider: AIProviderId;
  providers: Record<AIProviderId, ProviderEntryConfig>;
  providerConfig: StoredProviderConfig;
  tasks: Record<string, MusicGenerationTask>;
  logs: TaskLog[];
  apiUsage: ApiUsageSummary;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function getStorageDir(): string {
  if (process.env.DATA_DIR) {
    return path.resolve(process.env.DATA_DIR);
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/aimusic-data';
  }
  return path.resolve('./data');
}

export function getUploadsDir(): string {
  const base =
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      ? '/tmp/aimusic-uploads'
      : path.resolve('./uploads');
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}

const ADMIN_DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || '0927099940@Phv';
const ADMIN_DEFAULT_EMAIL = process.env.ADMIN_EMAIL || 'admin@aimusicstudio.com';

function createDefaultProviders(): Record<AIProviderId, ProviderEntryConfig> {
  return {
    suno: {
      enabled: true,
      apiKey: process.env.SUNO_API_KEY || '',
      baseUrl: process.env.AI_MUSIC_BASE_URL || 'https://api.sunoapi.org',
      model: process.env.AI_MUSIC_MODEL || 'V3_5',
    },
    replicate: {
      enabled: true,
      apiKey: process.env.REPLICATE_API_TOKEN || '',
      baseUrl: 'https://api.replicate.com/v1',
      model: 'meta/musicgen',
    },
    minimax: {
      enabled: true,
      apiKey: process.env.MINIMAX_API_KEY || '',
      baseUrl: 'https://api.minimax.chat/v1',
      model: 'music-01',
    },
    fal: {
      enabled: true,
      apiKey: process.env.FAL_KEY || '',
      baseUrl: 'https://queue.fal.run',
      model: 'fal-ai/stable-audio',
    },
    custom: {
      enabled: false,
      apiKey: '',
      baseUrl: process.env.AI_MUSIC_CUSTOM_URL || '',
      model: 'custom-v1',
    },
  };
}

function createInitialData(): DatabaseSchema {
  const initialProvider: AIProviderId =
    (process.env.AI_MUSIC_PROVIDER as AIProviderId) || 'suno';
  const providers = createDefaultProviders();
  const activeCfg = providers[initialProvider] || providers.suno;

  return {
    users: [
      {
        id: 'admin-master',
        name: 'Quản Trị Viên (Admin)',
        email: ADMIN_DEFAULT_EMAIL,
        role: 'admin',
        avatar: '/images/album_cover_ai_cover_1794018468271.jpg',
        createdAt: '2026-01-01T00:00:00Z',
        savedSongsCount: 4,
        coversCount: 1,
        isBanned: false,
        downloadsHistory: [],
        passwordHash: hashPassword(ADMIN_DEFAULT_PASSWORD),
      },
      {
        id: 'user-demo',
        name: 'Nguyễn Văn Âm Nhạc',
        email: 'member@aimusicstudio.com',
        role: 'user',
        avatar: '/images/album_cover_lofi_ballad_1794018467443.jpg',
        createdAt: '2026-10-01T00:00:00Z',
        savedSongsCount: 1,
        coversCount: 0,
        isBanned: false,
        downloadsHistory: [],
        passwordHash: hashPassword('123456'),
      },
    ],
    songs: [
      {
        id: 'song-1',
        title: 'Vinahouse Đêm Sài Gòn (Showcase)',
        artist: 'AI Music Studio Official',
        genre: 'Vinahouse',
        vocalType: 'male',
        duration: 165,
        coverUrl: '/images/album_cover_vinahouse_1794018465637.jpg',
        audioUrl: '',
        lyrics:
          '[Verse 1]\nÁnh đèn đêm Sài Gòn rực rỡ sắc màu\nNhịp đập vinahouse cuốn ta đi mau\n[Chorus]\nLên là lên luôn, quẩy hết đêm nay\nÂm nhạc AI bùng nổ mê say!',
        promptStyle: 'Vinahouse, Fast 140 BPM, Catchy Synth Drops, Male Energetic Vocal',
        bpm: 140,
        mood: 'Sôi động',
        createdAt: '2026-11-06T10:00:00Z',
        isFavorite: true,
        playsCount: 1420,
        likesCount: 389,
        downloadsCount: 0,
        userId: 'admin-master',
        userName: 'AI Music Official',
      },
      {
        id: 'song-2',
        title: 'Sương Đêm Tây Bắc (Dân Ca Lào Cai)',
        artist: 'Tây Bắc Folk Studio',
        genre: 'Nhạc Tây Bắc',
        vocalType: 'female',
        duration: 198,
        coverUrl: '/images/album_cover_taybac_1794018466597.jpg',
        audioUrl: '',
        lyrics:
          '[Verse]\nChiều Lào Cai mây vờn đỉnh núi Sa Pa\nTiếng khèn vang xa ngàn mây thiết tha\n[Chorus]\nEm vẫy tay chào người thương phương xa\nSuối hát tình ca ngọt ngào bao la',
        promptStyle: 'Nhạc Tây Bắc, Khèn H’Mông, Đàn Đáy, Giọng nữ trong trẻo 90 BPM',
        bpm: 90,
        mood: 'Sâu lắng',
        createdAt: '2026-11-06T11:30:00Z',
        isFavorite: true,
        playsCount: 980,
        likesCount: 245,
        downloadsCount: 0,
        userId: 'admin-master',
        userName: 'Tây Bắc Music',
      },
      {
        id: 'song-3',
        title: 'Chờ Em Dưới Mưa Lofi Chill',
        artist: 'Lofi Producer',
        genre: 'Lofi',
        vocalType: 'duet',
        duration: 145,
        coverUrl: '/images/album_cover_lofi_ballad_1794018467443.jpg',
        audioUrl: '',
        lyrics:
          '[Verse]\nHạt mưa rơi khẽ bên hiên nhà cũ\nKý ức hôm nào giờ thành giấc ngủ\n[Chorus]\nChill lofi đêm nay cùng ánh sao trời',
        promptStyle: 'Lofi Chill HipHop, Vinyl Crackle, Jazzy Piano, Slow 75 BPM',
        bpm: 75,
        mood: 'Chill',
        createdAt: '2026-11-06T14:15:00Z',
        isFavorite: false,
        playsCount: 2310,
        likesCount: 670,
        downloadsCount: 0,
        userId: 'user-demo',
        userName: 'Lofi Maker',
      },
      {
        id: 'song-4',
        title: 'Thành Phố Tuyết Rơi (AI Cover Showcase)',
        artist: 'AI Cover Hub',
        genre: 'Ballad',
        vocalType: 'female',
        duration: 180,
        coverUrl: '/images/album_cover_ai_cover_1794018468271.jpg',
        audioUrl: '',
        lyrics:
          '[Verse]\nSnowflakes falling on the empty street\nEchoes of your voice in every beat',
        promptStyle: 'Acoustic Pop Ballad, Piano & Strings, 85 BPM',
        bpm: 85,
        mood: 'Trầm buồn',
        createdAt: '2026-11-06T16:00:00Z',
        isFavorite: true,
        playsCount: 3100,
        likesCount: 890,
        downloadsCount: 0,
        isAiCover: true,
        originalArtist: 'V-Pop Cover Project',
        voiceModelId: 'voice-taylor-ai',
        userId: 'admin-master',
        userName: 'AI Cover Hub',
      },
    ],
    ads: [
      {
        id: 'ad-1',
        title: 'AI Music Studio Pro — Tích hợp Suno & Replicate API',
        description:
          'Kết nối API Key trong trang Quản trị Admin để tạo nhạc AI thực tế có giọng hát, AI Cover RVC và tách Stems phòng thu.',
        imageUrl: '/images/hero_studio_banner_1794018467147.jpg',
        targetUrl: '#admin',
        placement: 'home_top',
        isActive: true,
        clicksCount: 0,
        createdAt: '2026-11-01T00:00:00Z',
      },
    ],
    websiteConfig: {
      siteName: 'AI MUSIC STUDIO',
      siteTagline: 'Nền tảng sáng tác nhạc AI & AI Cover chuyên nghiệp',
      announcementText:
        'Chào mừng bạn đến với AI MUSIC STUDIO! Hỗ trợ Suno API, Replicate MusicGen/Demucs/RVC, MiniMax Music-01, FAL.ai & Gemini AI.',
      showAnnouncement: true,
      adsEnabled: true,
      adsenseClientId: '',
      adsenseSlotId: '',
      maxUploadMb: 25,
      rateLimitPerHour: 30,
      maintenanceMode: false,
    },
    activeProvider: initialProvider,
    providers,
    providerConfig: {
      provider: initialProvider,
      apiKey: activeCfg.apiKey,
      baseUrl: activeCfg.baseUrl,
      model: activeCfg.model,
    },
    tasks: {},
    logs: [
      {
        id: 'log-init',
        taskId: 'system',
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: `AI Music Studio DB initialized. Active provider: ${initialProvider.toUpperCase()}`,
        provider: initialProvider,
      },
    ],
    apiUsage: {
      totalRequests: 0,
      successfulGenerations: 0,
      failedRequests: 0,
      estimatedCostUsd: 0,
    },
  };
}

class LocalJsonDatabase {
  private filePath: string;
  private data: DatabaseSchema;

  constructor() {
    const dir = getStorageDir();
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (e) {
      console.warn('Could not create data dir, falling back to /tmp:', e);
    }
    this.filePath = path.join(dir, 'db.json');
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
        const defaults = createInitialData();
        const mergedProviders: Record<AIProviderId, ProviderEntryConfig> = {
          suno: { ...defaults.providers.suno, ...(parsed.providers?.suno || {}) },
          replicate: { ...defaults.providers.replicate, ...(parsed.providers?.replicate || {}) },
          minimax: { ...defaults.providers.minimax, ...(parsed.providers?.minimax || {}) },
          fal: { ...defaults.providers.fal, ...(parsed.providers?.fal || {}) },
          custom: { ...defaults.providers.custom, ...(parsed.providers?.custom || {}) },
        };

        // Hydrate keys from environment variables if missing in stored DB
        if (!mergedProviders.suno.apiKey && process.env.SUNO_API_KEY) {
          mergedProviders.suno.apiKey = process.env.SUNO_API_KEY;
        }
        if (!mergedProviders.replicate.apiKey && process.env.REPLICATE_API_TOKEN) {
          mergedProviders.replicate.apiKey = process.env.REPLICATE_API_TOKEN;
        }
        if (!mergedProviders.minimax.apiKey && process.env.MINIMAX_API_KEY) {
          mergedProviders.minimax.apiKey = process.env.MINIMAX_API_KEY;
        }
        if (!mergedProviders.fal.apiKey && process.env.FAL_KEY) {
          mergedProviders.fal.apiKey = process.env.FAL_KEY;
        }

        const activeProvider = parsed.activeProvider || parsed.providerConfig?.provider || defaults.activeProvider;
        const activeEntry = mergedProviders[activeProvider];

        return {
          ...defaults,
          ...parsed,
          activeProvider,
          providers: mergedProviders,
          websiteConfig: { ...defaults.websiteConfig, ...(parsed.websiteConfig || {}) },
          providerConfig: {
            provider: activeProvider,
            apiKey: activeEntry?.apiKey || '',
            baseUrl: activeEntry?.baseUrl || defaults.providerConfig.baseUrl,
            model: activeEntry?.model || defaults.providerConfig.model,
          },
          apiUsage: { ...defaults.apiUsage, ...(parsed.apiUsage || {}) },
        };
      }
    } catch (err) {
      console.warn('Error loading DB, initializing fresh state:', err);
    }
    const fresh = createInitialData();
    this.saveData(fresh);
    return fresh;
  }

  private saveData(dataToSave: DatabaseSchema) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Could not persist DB to disk:', err);
    }
  }

  public getState(): DatabaseSchema {
    return this.data;
  }

  public save() {
    this.saveData(this.data);
  }
}

export const db = new LocalJsonDatabase();
