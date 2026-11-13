import {
  Language,
  MusicGenerationTask,
  TaskLog,
  ProviderConfig,
  ProviderCapabilities,
  ProviderItemStatus,
  AIProviderId,
  User,
  Song,
  AdBanner,
  WebsiteConfig,
  ApiUsageSummary,
} from '../types';

const TOKEN_STORAGE_KEY = 'aimusic_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface GenerateLyricsParams {
  prompt: string;
  genre: string;
  mood: string;
  language: Language;
}

export interface RealMusicGenerateParams {
  title: string;
  lyrics: string;
  genre: string;
  promptStyle: string;
  vocalType: string;
  vocalLanguage?: Language | 'auto';
  duration?: number;
  bpm?: number;
  versionCount?: 1 | 2;
  providerOverride?: AIProviderId;
}

export interface RealCoverGenerateParams {
  title: string;
  audioInputUrl?: string;
  voiceModelId: string;
  similarity: number;
  pitchShift: number;
  volumeBalance?: number;
  keepOriginalInst: boolean;
  separateVocals?: boolean;
  genre?: string;
  vocalType?: string;
  providerOverride?: AIProviderId;
}

export interface ProviderStatusPublic {
  provider: AIProviderId;
  isConfigured: boolean;
  enabled: boolean;
  status: string;
  capabilities?: ProviderCapabilities;
  providers?: Record<AIProviderId, ProviderItemStatus>;
  isServerless?: boolean;
  geminiConfigured: boolean;
}

export async function fetchProviderStatus(): Promise<ProviderStatusPublic | null> {
  try {
    const res = await fetch('/api/music/provider-status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error('Failed to fetch provider status:', err);
  }
  return null;
}

// Request AI Lyrics using Gemini (honest error propagation if unconfigured)
export async function requestGenerateLyrics(
  params: GenerateLyricsParams
): Promise<{ success: boolean; lyrics: string; error?: string }> {
  try {
    const res = await fetch('/api/ai/lyrics', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        lyrics: '',
        error: data.error || `Lỗi máy chủ (${res.status}) khi gọi Gemini AI.`,
      };
    }

    return {
      success: true,
      lyrics: data.lyrics,
    };
  } catch (err: unknown) {
    const errStr = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      lyrics: '',
      error: `Không thể kết nối máy chủ Gemini AI: ${errStr}`,
    };
  }
}

export async function requestAnalyzeMusicStyle(description: string, genre: string) {
  try {
    const res = await fetch('/api/ai/music-style', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ description, genre }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// AUTHENTICATION & PROFILE
// ==========================================
export async function authLogin(email: string, password: string): Promise<{
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      setAuthToken(data.token);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: `Lỗi kết nối: ${err.message}` };
  }
}

export async function authRegister(name: string, email: string, password: string): Promise<{
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (data.success && data.token) {
      setAuthToken(data.token);
    }
    return data;
  } catch (err: any) {
    return { success: false, error: `Lỗi kết nối: ${err.message}` };
  }
}

export async function authLogout(): Promise<void> {
  setAuthToken(null);
  try {
    await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() });
  } catch {
    // ignore
  }
}

export async function authGetMe(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/auth/me', { headers: authHeaders() });
    if (!res.ok) {
      setAuthToken(null);
      return null;
    }
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

export async function authUpdateProfile(payload: { name?: string; avatar?: string }) {
  const res = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function authChangePassword(currentPassword: string, newPassword: string) {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return await res.json();
}

export async function authForgotPassword(email: string) {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return await res.json();
}

// ==========================================
// SONGS LIBRARY & PLAYS
// ==========================================
export async function fetchSongs(): Promise<Song[]> {
  try {
    const res = await fetch('/api/songs');
    if (res.ok) {
      const data = await res.json();
      return data.songs || [];
    }
  } catch (err) {
    console.error('Failed to fetch songs:', err);
  }
  return [];
}

export async function fetchSongById(id: string): Promise<Song | null> {
  try {
    const res = await fetch(`/api/songs/${encodeURIComponent(id)}`);
    if (res.ok) {
      const data = await res.json();
      return data.song || null;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function recordSongPlay(id: string): Promise<void> {
  try {
    await fetch(`/api/songs/${encodeURIComponent(id)}/play`, { method: 'POST' });
  } catch {
    // ignore
  }
}

export async function updateSongApi(
  id: string,
  payload: { title?: string; isFavorite?: boolean }
): Promise<{ success: boolean; song?: Song }> {
  const res = await fetch(`/api/songs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  return await res.json();
}

export async function deleteSongApi(id: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`/api/songs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return await res.json();
}

export async function logSongDownload(
  songId: string,
  format = 'MP3',
  meta?: { title?: string; audioUrl?: string }
): Promise<void> {
  try {
    await fetch(`/api/songs/${encodeURIComponent(songId)}/download-log`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ format, ...meta }),
    });
  } catch {
    // ignore
  }
}

// ==========================================
// REAL AUDIO UPLOAD
// ==========================================
export function uploadAudioFile(file: File): Promise<{
  success: boolean;
  url?: string;
  relativeUrl?: string;
  filename?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = String(reader.result || '');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type || 'audio/mpeg',
            base64Data,
          }),
        });
        const data = await res.json();
        resolve(data);
      } catch (err: any) {
        resolve({ success: false, error: `Lỗi upload file: ${err.message}` });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'Không thể đọc file từ máy.' });
    reader.readAsDataURL(file);
  });
}

// ==========================================
// REAL AI MUSIC & AI COVER GENERATION
// ==========================================
export async function generateRealAIMusic(
  params: RealMusicGenerateParams
): Promise<{ success: boolean; task?: MusicGenerationTask; error?: string }> {
  try {
    const res = await fetch('/api/music/generate', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Không thể bắt đầu tạo nhạc AI.`,
        task: data.task,
      };
    }

    return {
      success: true,
      task: data.task,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Lỗi kết nối máy chủ: ${err.message}`,
    };
  }
}

export async function pollMusicTask(
  taskId: string
): Promise<{ success: boolean; task?: MusicGenerationTask; error?: string }> {
  try {
    const res = await fetch(`/api/music/tasks/${taskId}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      task: data.task,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

export async function generateRealAICover(
  params: RealCoverGenerateParams
): Promise<{ success: boolean; task?: MusicGenerationTask; error?: string }> {
  try {
    const res = await fetch('/api/cover/generate', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Không thể bắt đầu tạo AI Cover.`,
        task: data.task,
      };
    }

    return {
      success: true,
      task: data.task,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Lỗi kết nối: ${err.message}`,
    };
  }
}

export async function pollCoverTask(
  taskId: string
): Promise<{ success: boolean; task?: MusicGenerationTask; error?: string }> {
  try {
    const res = await fetch(`/api/cover/tasks/${taskId}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      task: data.task,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
    };
  }
}

export async function requestStemsSeparation(
  title: string,
  audioInputUrl: string
): Promise<{ success: boolean; task?: MusicGenerationTask; error?: string }> {
  try {
    const res = await fetch('/api/music/stems', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title, audioInputUrl }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${res.status}: Không thể tách Vocal & Instrumental.`,
        task: data.task,
      };
    }
    return { success: true, task: data.task };
  } catch (err: any) {
    return { success: false, error: `Lỗi kết nối: ${err.message}` };
  }
}

// ==========================================
// PUBLIC SITE CONFIG & ADS
// ==========================================
export async function fetchPublicSiteData(): Promise<{
  websiteConfig: WebsiteConfig | null;
  ads: AdBanner[];
}> {
  try {
    const res = await fetch('/api/site/public');
    if (res.ok) {
      const data = await res.json();
      return {
        websiteConfig: data.websiteConfig || null,
        ads: data.ads || [],
      };
    }
  } catch {
    // ignore
  }
  return { websiteConfig: null, ads: [] };
}

export async function trackAdClick(adId: string): Promise<void> {
  try {
    await fetch(`/api/ads/${encodeURIComponent(adId)}/click`, { method: 'POST' });
  } catch {
    // ignore
  }
}

// ==========================================
// ADMIN PROTECTED APIs
// ==========================================
export async function getAdminApiConfig(): Promise<ProviderConfig | null> {
  try {
    const res = await fetch('/api/admin/api-config', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.config;
    }
  } catch (err) {
    console.error('Failed to get API config:', err);
  }
  return null;
}

export async function updateAdminApiConfig(config: {
  provider: AIProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  enabled?: boolean;
  setActive?: boolean;
}) {
  const res = await fetch('/api/admin/api-config', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(config),
  });
  return await res.json();
}

export async function toggleAdminProvider(providerId: AIProviderId, enabled: boolean) {
  const res = await fetch(`/api/admin/providers/${encodeURIComponent(providerId)}/toggle`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ enabled }),
  });
  return await res.json();
}

export async function fetchAdminFailedTasks(): Promise<MusicGenerationTask[]> {
  try {
    const res = await fetch('/api/admin/failed-tasks', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.tasks || [];
    }
  } catch {
    // ignore
  }
  return [];
}

export async function testAdminConnection(provider: AIProviderId, apiKey?: string, baseUrl?: string) {
  const res = await fetch('/api/admin/test-connection', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ provider, apiKey, baseUrl }),
  });
  return await res.json();
}

export async function getAdminLogs(): Promise<TaskLog[]> {
  try {
    const res = await fetch('/api/admin/logs', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.logs || [];
    }
  } catch (err) {
    console.error('Failed to get logs:', err);
  }
  return [];
}

export async function requestAdminStats(): Promise<{
  totalUsers: number;
  totalSongsGenerated: number;
  totalCoversCreated: number;
  totalDownloads?: number;
  activeVoiceModels: number;
  apiStatus: string;
  apiUsage?: ApiUsageSummary;
  storageUsedGb: number;
} | null> {
  try {
    const res = await fetch('/api/admin/stats', { headers: authHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch admin stats:', err);
  }
  return null;
}

export async function fetchAdminUsers(): Promise<User[]> {
  try {
    const res = await fetch('/api/admin/users', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.users || [];
    }
  } catch (err) {
    console.error('Failed to fetch users:', err);
  }
  return [];
}

export async function toggleBanAdminUser(userId: string) {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/toggle-ban`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return await res.json();
}

export async function fetchAdminAds(): Promise<AdBanner[]> {
  try {
    const res = await fetch('/api/admin/ads', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.ads || [];
    }
  } catch {
    // ignore
  }
  return [];
}

export async function createAdminAd(ad: Partial<AdBanner>) {
  const res = await fetch('/api/admin/ads', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(ad),
  });
  return await res.json();
}

export async function updateAdminAd(id: string, ad: Partial<AdBanner>) {
  const res = await fetch(`/api/admin/ads/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(ad),
  });
  return await res.json();
}

export async function deleteAdminAd(id: string) {
  const res = await fetch(`/api/admin/ads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return await res.json();
}

export async function fetchAdminSiteConfig(): Promise<WebsiteConfig | null> {
  try {
    const res = await fetch('/api/admin/site-config', { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.websiteConfig || null;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function updateAdminSiteConfig(config: Partial<WebsiteConfig>) {
  const res = await fetch('/api/admin/site-config', {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(config),
  });
  return await res.json();
}
