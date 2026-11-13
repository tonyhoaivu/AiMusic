import {
  ProviderAdapter,
  ProviderEntryConfig,
  AdapterGenerationParams,
  AdapterTestResult,
  AdapterSubmitResult,
} from './types.js';

export const minimaxAdapter: ProviderAdapter = {
  id: 'minimax',
  displayName: 'MiniMax Music-01',
  defaultBaseUrl: 'https://api.minimax.chat/v1',
  defaultModel: 'music-01',
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: true,
    supportsLyrics: true,
    supportsTwoVersions: false,
    supportsCover: false,
    supportsStemSeparation: false,
    supportsInstrumental: true,
    maxDurationSec: 180,
    notes: 'Hỗ trợ tạo bài hát có lời + giọng hát trực tiếp qua model music-01 (không hỗ trợ AI Cover / tách stems).',
  },

  async testConnection(cfg: ProviderEntryConfig): Promise<AdapterTestResult> {
    const start = Date.now();
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/music_generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: cfg.model || 'music-01', lyrics: 'test' }),
    });
    const latencyMs = Date.now() - start;

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        provider: 'minimax',
        statusCode: res.status,
        latencyMs,
        message: `MiniMax API Key không hợp lệ (HTTP ${res.status}).`,
      };
    }
    return {
      success: res.status < 500,
      provider: 'minimax',
      statusCode: res.status,
      latencyMs,
      message: `MiniMax Music-01 endpoint đã xác thực và phản hồi HTTP ${res.status} (${latencyMs}ms).`,
    };
  },

  async submitMusic(
    cfg: ProviderEntryConfig,
    params: AdapterGenerationParams
  ): Promise<AdapterSubmitResult> {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/music_generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.model || 'music-01',
        prompt: `${params.genre}, ${params.promptStyle}`.trim(),
        lyrics:
          params.vocalType === 'instrumental'
            ? '[Inst]'
            : params.lyrics || `[Verse]\n${params.title}`,
        audio_setting: {
          sample_rate: 44100,
          bitrate: 256000,
          format: 'mp3',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MiniMax API lỗi HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const audioUrl = data.data?.audio_url || data.audio_url;
    if (!audioUrl) {
      throw new Error(
        `MiniMax API không trả về audio_url: ${data.base_resp?.status_msg || JSON.stringify(data).slice(0, 200)}`
      );
    }

    return {
      immediateTracks: [{ audioUrl, title: params.title }],
      progressLog: 'MiniMax Music-01 đã tạo bài hát thành công.',
    };
  },
};
