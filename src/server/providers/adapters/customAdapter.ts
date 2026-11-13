import {
  ProviderAdapter,
  ProviderEntryConfig,
  AdapterGenerationParams,
  AdapterTestResult,
  AdapterSubmitResult,
} from './types.js';

export const customAdapter: ProviderAdapter = {
  id: 'custom',
  displayName: 'Custom Music API / Self-Hosted',
  defaultBaseUrl: 'https://your-music-server.example.com',
  defaultModel: 'custom-v1',
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: true,
    supportsLyrics: true,
    supportsTwoVersions: true,
    supportsCover: true,
    supportsStemSeparation: true,
    supportsInstrumental: true,
    maxDurationSec: 300,
    notes: 'Kết nối máy chủ AI Music / RVC tự triển khai theo chuẩn REST JSON (/generate, /cover, /stems).',
  },

  async testConnection(cfg: ProviderEntryConfig): Promise<AdapterTestResult> {
    const start = Date.now();
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/health`, {
      headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
    });
    const latencyMs = Date.now() - start;
    return {
      success: res.ok,
      provider: 'custom',
      statusCode: res.status,
      latencyMs,
      message: res.ok
        ? `Custom Endpoint phản hồi HTTP ${res.status} (${latencyMs}ms).`
        : `Custom Endpoint lỗi HTTP ${res.status}`,
    };
  },

  async submitMusic(
    cfg: ProviderEntryConfig,
    params: AdapterGenerationParams
  ): Promise<AdapterSubmitResult> {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/generate`, {
      method: 'POST',
      headers: {
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Custom API lỗi HTTP ${res.status}`);
    }
    const data = await res.json();
    const audioUrl = data.audio_url || data.url;
    if (!audioUrl) {
      throw new Error('Custom endpoint không trả về audio_url');
    }
    return {
      immediateTracks: [{ audioUrl, coverUrl: data.cover_url, title: params.title }],
      progressLog: 'Nhận audio từ Custom Music Server thành công.',
    };
  },

  async submitCover(
    cfg: ProviderEntryConfig,
    params: AdapterGenerationParams
  ): Promise<AdapterSubmitResult> {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/cover`, {
      method: 'POST',
      headers: {
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error(`Custom Cover API lỗi HTTP ${res.status}`);
    }
    const data = await res.json();
    const audioUrl = data.audio_url || data.url;
    if (!audioUrl) throw new Error('Custom Cover endpoint không trả về audio_url');
    return {
      immediateTracks: [{ audioUrl, title: params.title }],
      progressLog: 'Nhận bản AI Cover từ Custom Server thành công.',
    };
  },

  async submitStems(cfg: ProviderEntryConfig, audioInputUrl: string): Promise<AdapterSubmitResult> {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/stems`, {
      method: 'POST',
      headers: {
        ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audioInputUrl }),
    });
    if (!res.ok) throw new Error(`Custom Stems API lỗi HTTP ${res.status}`);
    const data = await res.json();
    return {
      immediateStems: data.stems || { vocals: data.vocals, instrumental: data.instrumental },
      progressLog: 'Tách stems thành công từ Custom Server.',
    };
  },
};
