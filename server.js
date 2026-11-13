// server.ts
import express2 from "express";
import path3 from "path";
import fs3 from "fs";

// src/server/app.ts
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path2 from "path";
import fs2 from "fs";

// src/server/db.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}
function verifyPassword(password, storedHash) {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const keyBuf = Buffer.from(keyHex, "hex");
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}
function getStorageDir() {
  if (process.env.DATA_DIR) {
    return path.resolve(process.env.DATA_DIR);
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return "/tmp/aimusic-data";
  }
  return path.resolve("./data");
}
function getUploadsDir() {
  const base = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? "/tmp/aimusic-uploads" : path.resolve("./uploads");
  if (!fs.existsSync(base)) {
    fs.mkdirSync(base, { recursive: true });
  }
  return base;
}
var ADMIN_DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || "0927099940@Phv";
var ADMIN_DEFAULT_EMAIL = process.env.ADMIN_EMAIL || "admin@aimusicstudio.com";
function createDefaultProviders() {
  return {
    suno: {
      enabled: true,
      apiKey: process.env.SUNO_API_KEY || "",
      baseUrl: process.env.AI_MUSIC_BASE_URL || "https://api.sunoapi.org",
      model: process.env.AI_MUSIC_MODEL || "V3_5"
    },
    replicate: {
      enabled: true,
      apiKey: process.env.REPLICATE_API_TOKEN || "",
      baseUrl: "https://api.replicate.com/v1",
      model: "meta/musicgen"
    },
    minimax: {
      enabled: true,
      apiKey: process.env.MINIMAX_API_KEY || "",
      baseUrl: "https://api.minimax.chat/v1",
      model: "music-01"
    },
    fal: {
      enabled: true,
      apiKey: process.env.FAL_KEY || "",
      baseUrl: "https://queue.fal.run",
      model: "fal-ai/stable-audio"
    },
    custom: {
      enabled: false,
      apiKey: "",
      baseUrl: process.env.AI_MUSIC_CUSTOM_URL || "",
      model: "custom-v1"
    }
  };
}
function createInitialData() {
  const initialProvider = process.env.AI_MUSIC_PROVIDER || "suno";
  const providers = createDefaultProviders();
  const activeCfg = providers[initialProvider] || providers.suno;
  return {
    users: [
      {
        id: "admin-master",
        name: "Qu\u1EA3n Tr\u1ECB Vi\xEAn (Admin)",
        email: ADMIN_DEFAULT_EMAIL,
        role: "admin",
        avatar: "/images/album_cover_ai_cover_1794018468271.jpg",
        createdAt: "2026-01-01T00:00:00Z",
        savedSongsCount: 4,
        coversCount: 1,
        isBanned: false,
        downloadsHistory: [],
        passwordHash: hashPassword(ADMIN_DEFAULT_PASSWORD)
      },
      {
        id: "user-demo",
        name: "Nguy\u1EC5n V\u0103n \xC2m Nh\u1EA1c",
        email: "member@aimusicstudio.com",
        role: "user",
        avatar: "/images/album_cover_lofi_ballad_1794018467443.jpg",
        createdAt: "2026-10-01T00:00:00Z",
        savedSongsCount: 1,
        coversCount: 0,
        isBanned: false,
        downloadsHistory: [],
        passwordHash: hashPassword("123456")
      }
    ],
    songs: [
      {
        id: "song-1",
        title: "Vinahouse \u0110\xEAm S\xE0i G\xF2n (Showcase)",
        artist: "AI Music Studio Official",
        genre: "Vinahouse",
        vocalType: "male",
        duration: 165,
        coverUrl: "/images/album_cover_vinahouse_1794018465637.jpg",
        audioUrl: "",
        lyrics: "[Verse 1]\n\xC1nh \u0111\xE8n \u0111\xEAm S\xE0i G\xF2n r\u1EF1c r\u1EE1 s\u1EAFc m\xE0u\nNh\u1ECBp \u0111\u1EADp vinahouse cu\u1ED1n ta \u0111i mau\n[Chorus]\nL\xEAn l\xE0 l\xEAn lu\xF4n, qu\u1EA9y h\u1EBFt \u0111\xEAm nay\n\xC2m nh\u1EA1c AI b\xF9ng n\u1ED5 m\xEA say!",
        promptStyle: "Vinahouse, Fast 140 BPM, Catchy Synth Drops, Male Energetic Vocal",
        bpm: 140,
        mood: "S\xF4i \u0111\u1ED9ng",
        createdAt: "2026-11-06T10:00:00Z",
        isFavorite: true,
        playsCount: 1420,
        likesCount: 389,
        downloadsCount: 0,
        userId: "admin-master",
        userName: "AI Music Official"
      },
      {
        id: "song-2",
        title: "S\u01B0\u01A1ng \u0110\xEAm T\xE2y B\u1EAFc (D\xE2n Ca L\xE0o Cai)",
        artist: "T\xE2y B\u1EAFc Folk Studio",
        genre: "Nh\u1EA1c T\xE2y B\u1EAFc",
        vocalType: "female",
        duration: 198,
        coverUrl: "/images/album_cover_taybac_1794018466597.jpg",
        audioUrl: "",
        lyrics: "[Verse]\nChi\u1EC1u L\xE0o Cai m\xE2y v\u1EDDn \u0111\u1EC9nh n\xFAi Sa Pa\nTi\u1EBFng kh\xE8n vang xa ng\xE0n m\xE2y thi\u1EBFt tha\n[Chorus]\nEm v\u1EABy tay ch\xE0o ng\u01B0\u1EDDi th\u01B0\u01A1ng ph\u01B0\u01A1ng xa\nSu\u1ED1i h\xE1t t\xECnh ca ng\u1ECDt ng\xE0o bao la",
        promptStyle: "Nh\u1EA1c T\xE2y B\u1EAFc, Kh\xE8n H\u2019M\xF4ng, \u0110\xE0n \u0110\xE1y, Gi\u1ECDng n\u1EEF trong tr\u1EBBo 90 BPM",
        bpm: 90,
        mood: "S\xE2u l\u1EAFng",
        createdAt: "2026-11-06T11:30:00Z",
        isFavorite: true,
        playsCount: 980,
        likesCount: 245,
        downloadsCount: 0,
        userId: "admin-master",
        userName: "T\xE2y B\u1EAFc Music"
      },
      {
        id: "song-3",
        title: "Ch\u1EDD Em D\u01B0\u1EDBi M\u01B0a Lofi Chill",
        artist: "Lofi Producer",
        genre: "Lofi",
        vocalType: "duet",
        duration: 145,
        coverUrl: "/images/album_cover_lofi_ballad_1794018467443.jpg",
        audioUrl: "",
        lyrics: "[Verse]\nH\u1EA1t m\u01B0a r\u01A1i kh\u1EBD b\xEAn hi\xEAn nh\xE0 c\u0169\nK\xFD \u1EE9c h\xF4m n\xE0o gi\u1EDD th\xE0nh gi\u1EA5c ng\u1EE7\n[Chorus]\nChill lofi \u0111\xEAm nay c\xF9ng \xE1nh sao tr\u1EDDi",
        promptStyle: "Lofi Chill HipHop, Vinyl Crackle, Jazzy Piano, Slow 75 BPM",
        bpm: 75,
        mood: "Chill",
        createdAt: "2026-11-06T14:15:00Z",
        isFavorite: false,
        playsCount: 2310,
        likesCount: 670,
        downloadsCount: 0,
        userId: "user-demo",
        userName: "Lofi Maker"
      },
      {
        id: "song-4",
        title: "Th\xE0nh Ph\u1ED1 Tuy\u1EBFt R\u01A1i (AI Cover Showcase)",
        artist: "AI Cover Hub",
        genre: "Ballad",
        vocalType: "female",
        duration: 180,
        coverUrl: "/images/album_cover_ai_cover_1794018468271.jpg",
        audioUrl: "",
        lyrics: "[Verse]\nSnowflakes falling on the empty street\nEchoes of your voice in every beat",
        promptStyle: "Acoustic Pop Ballad, Piano & Strings, 85 BPM",
        bpm: 85,
        mood: "Tr\u1EA7m bu\u1ED3n",
        createdAt: "2026-11-06T16:00:00Z",
        isFavorite: true,
        playsCount: 3100,
        likesCount: 890,
        downloadsCount: 0,
        isAiCover: true,
        originalArtist: "V-Pop Cover Project",
        voiceModelId: "voice-taylor-ai",
        userId: "admin-master",
        userName: "AI Cover Hub"
      }
    ],
    ads: [
      {
        id: "ad-1",
        title: "AI Music Studio Pro \u2014 T\xEDch h\u1EE3p Suno & Replicate API",
        description: "K\u1EBFt n\u1ED1i API Key trong trang Qu\u1EA3n tr\u1ECB Admin \u0111\u1EC3 t\u1EA1o nh\u1EA1c AI th\u1EF1c t\u1EBF c\xF3 gi\u1ECDng h\xE1t, AI Cover RVC v\xE0 t\xE1ch Stems ph\xF2ng thu.",
        imageUrl: "/images/hero_studio_banner_1794018467147.jpg",
        targetUrl: "#admin",
        placement: "home_top",
        isActive: true,
        clicksCount: 0,
        createdAt: "2026-11-01T00:00:00Z"
      }
    ],
    websiteConfig: {
      siteName: "AI MUSIC STUDIO",
      siteTagline: "N\u1EC1n t\u1EA3ng s\xE1ng t\xE1c nh\u1EA1c AI & AI Cover chuy\xEAn nghi\u1EC7p",
      announcementText: "Ch\xE0o m\u1EEBng b\u1EA1n \u0111\u1EBFn v\u1EDBi AI MUSIC STUDIO! H\u1ED7 tr\u1EE3 Suno API, Replicate MusicGen/Demucs/RVC, MiniMax Music-01, FAL.ai & Gemini AI.",
      showAnnouncement: true,
      adsEnabled: true,
      adsenseClientId: "",
      adsenseSlotId: "",
      maxUploadMb: 25,
      rateLimitPerHour: 30,
      maintenanceMode: false
    },
    activeProvider: initialProvider,
    providers,
    providerConfig: {
      provider: initialProvider,
      apiKey: activeCfg.apiKey,
      baseUrl: activeCfg.baseUrl,
      model: activeCfg.model
    },
    tasks: {},
    logs: [
      {
        id: "log-init",
        taskId: "system",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
        level: "info",
        message: `AI Music Studio DB initialized. Active provider: ${initialProvider.toUpperCase()}`,
        provider: initialProvider
      }
    ],
    apiUsage: {
      totalRequests: 0,
      successfulGenerations: 0,
      failedRequests: 0,
      estimatedCostUsd: 0
    }
  };
}
var LocalJsonDatabase = class {
  constructor() {
    const dir = getStorageDir();
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (e) {
      console.warn("Could not create data dir, falling back to /tmp:", e);
    }
    this.filePath = path.join(dir, "db.json");
    this.data = this.load();
  }
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        const parsed = JSON.parse(raw);
        const defaults = createInitialData();
        const mergedProviders = {
          suno: { ...defaults.providers.suno, ...parsed.providers?.suno || {} },
          replicate: { ...defaults.providers.replicate, ...parsed.providers?.replicate || {} },
          minimax: { ...defaults.providers.minimax, ...parsed.providers?.minimax || {} },
          fal: { ...defaults.providers.fal, ...parsed.providers?.fal || {} },
          custom: { ...defaults.providers.custom, ...parsed.providers?.custom || {} }
        };
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
          websiteConfig: { ...defaults.websiteConfig, ...parsed.websiteConfig || {} },
          providerConfig: {
            provider: activeProvider,
            apiKey: activeEntry?.apiKey || "",
            baseUrl: activeEntry?.baseUrl || defaults.providerConfig.baseUrl,
            model: activeEntry?.model || defaults.providerConfig.model
          },
          apiUsage: { ...defaults.apiUsage, ...parsed.apiUsage || {} }
        };
      }
    } catch (err) {
      console.warn("Error loading DB, initializing fresh state:", err);
    }
    const fresh = createInitialData();
    this.saveData(fresh);
    return fresh;
  }
  saveData(dataToSave) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(dataToSave, null, 2), "utf-8");
    } catch (err) {
      console.warn("Could not persist DB to disk:", err);
    }
  }
  getState() {
    return this.data;
  }
  save() {
    this.saveData(this.data);
  }
};
var db = new LocalJsonDatabase();

// src/server/providers/adapters/sunoAdapter.ts
var sunoAdapter = {
  id: "suno",
  displayName: "Suno API (Suno v3.5 / v4)",
  defaultBaseUrl: "https://api.sunoapi.org",
  defaultModel: "V3_5",
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: true,
    supportsLyrics: true,
    supportsTwoVersions: true,
    supportsCover: true,
    supportsStemSeparation: false,
    supportsInstrumental: true,
    maxDurationSec: 240,
    notes: "H\u1ED7 tr\u1EE3 t\u1EA1o b\xE0i h\xE1t c\xF3 l\u1EDDi + gi\u1ECDng h\xE1t AI, tr\u1EA3 v\u1EC1 t\u1ED1i \u0111a 2 phi\xEAn b\u1EA3n m\u1ED7i l\u01B0\u1EE3t."
  },
  async testConnection(cfg) {
    const start = Date.now();
    const base = cfg.baseUrl.replace(/\/$/, "");
    const probePaths = [
      `${base}/api/v1/generate/credit`,
      `${base}/api/v1/gateway/feed?page=1&limit=1`
    ];
    let lastStatus = 0;
    let lastBody = "";
    for (const url of probePaths) {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json"
        }
      });
      lastStatus = res.status;
      lastBody = await res.text();
      if (res.status === 200) {
        return {
          success: true,
          provider: "suno",
          statusCode: 200,
          latencyMs: Date.now() - start,
          message: `K\u1EBFt n\u1ED1i th\xE0nh c\xF4ng t\u1EDBi Suno API (${Date.now() - start}ms). API Key h\u1EE3p l\u1EC7.`
        };
      }
      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          provider: "suno",
          statusCode: res.status,
          latencyMs: Date.now() - start,
          message: `X\xE1c th\u1EF1c Suno API th\u1EA5t b\u1EA1i (HTTP ${res.status}): API Key kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c h\u1EBFt quy\u1EC1n.`
        };
      }
    }
    return {
      success: false,
      provider: "suno",
      statusCode: lastStatus,
      latencyMs: Date.now() - start,
      message: `Suno API ph\u1EA3n h\u1ED3i HTTP ${lastStatus}: ${lastBody.slice(0, 160)}`
    };
  },
  async submitMusic(cfg, params) {
    const base = cfg.baseUrl.replace(/\/$/, "");
    const vocalTag = params.vocalType === "instrumental" ? "instrumental" : params.vocalType === "female" ? "female vocal" : params.vocalType === "duet" ? "male and female duet" : "male vocal";
    const langTag = params.vocalLanguage === "en" ? "English" : params.vocalLanguage === "vi" ? "Vietnamese" : "";
    const tags = [params.genre, params.promptStyle, vocalTag, langTag, params.bpm ? `${params.bpm} BPM` : ""].filter(Boolean).join(", ");
    const isGatewayUrl = base.includes("gateway");
    const endpoint = isGatewayUrl ? `${base}/api/v1/gateway/generate/music` : `${base}/api/v1/generate`;
    const payload = {
      customMode: true,
      instrumental: params.vocalType === "instrumental",
      make_instrumental: params.vocalType === "instrumental",
      prompt: params.lyrics || params.promptStyle || params.title,
      style: tags,
      tags,
      title: params.title,
      model: cfg.model || "V3_5",
      mv: cfg.model || "chirp-v3-5",
      ...params.callbackUrl ? { callBackUrl: params.callbackUrl } : {}
    };
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Suno API l\u1ED7i HTTP ${res.status}: ${text.slice(0, 220)}`);
    }
    const data = await res.json();
    if (data.code && data.code !== 200) {
      throw new Error(`Suno API t\u1EEB ch\u1ED1i y\xEAu c\u1EA7u (code ${data.code}): ${data.msg || JSON.stringify(data)}`);
    }
    const taskId = data.data?.taskId || data.data?.task_id || data.task_id || data.id;
    if (!taskId) {
      throw new Error(`Suno API kh\xF4ng tr\u1EA3 v\u1EC1 taskId h\u1EE3p l\u1EC7: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return {
      externalTaskId: String(taskId),
      progressLog: `\u0110\xE3 g\u1EEDi t\xE1c v\u1EE5 t\u1EDBi Suno API (Task ID: ${taskId}).`
    };
  },
  async submitCover(cfg, params) {
    if (!params.audioInputUrl || !/^https?:\/\//i.test(params.audioInputUrl)) {
      throw new Error("Suno Upload-Cover y\xEAu c\u1EA7u \u0111\u01B0\u1EDDng d\u1EABn audio URL c\xF4ng khai (https://...).");
    }
    const base = cfg.baseUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/api/v1/generate/upload-cover`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uploadUrl: params.audioInputUrl,
        customMode: true,
        instrumental: false,
        title: params.title,
        style: `${params.genre}, AI Cover, ${params.voiceModelId || "vocal"}`,
        prompt: params.lyrics || `Cover in style of ${params.voiceModelId}`,
        model: cfg.model || "V3_5",
        ...params.callbackUrl ? { callBackUrl: params.callbackUrl } : {}
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Suno Cover API l\u1ED7i HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const taskId = data.data?.taskId || data.task_id || data.id;
    if (!taskId) {
      throw new Error(`Suno Cover API kh\xF4ng tr\u1EA3 v\u1EC1 taskId: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return {
      externalTaskId: String(taskId),
      progressLog: `\u0110\xE3 g\u1EEDi y\xEAu c\u1EA7u Upload-Cover t\u1EDBi Suno API (${taskId}).`
    };
  },
  async pollTask(cfg, externalTaskId) {
    const base = cfg.baseUrl.replace(/\/$/, "");
    const endpoints = [
      `${base}/api/v1/generate/record-info?taskId=${encodeURIComponent(externalTaskId)}`,
      `${base}/api/v1/gateway/query?task_id=${encodeURIComponent(externalTaskId)}`
    ];
    for (const url of endpoints) {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${cfg.apiKey}` }
      });
      if (!res.ok) continue;
      const json = await res.json();
      const body = json.data || json;
      const rawStatus = String(body.status || "").toUpperCase();
      if (rawStatus === "SUCCESS" || rawStatus === "COMPLETED") {
        const sunoList = body.response?.sunoData || body.data || (Array.isArray(body) ? body : [body]);
        const tracks = (Array.isArray(sunoList) ? sunoList : [sunoList]).map((item, idx) => ({
          audioUrl: item?.audioUrl || item?.audio_url || "",
          coverUrl: item?.imageUrl || item?.image_url || void 0,
          title: item?.title ? `${item.title}${sunoList.length > 1 ? ` (v${idx + 1})` : ""}` : void 0
        })).filter((t) => Boolean(t.audioUrl));
        if (tracks.length === 0) {
          return {
            status: "failed",
            error: "Suno API b\xE1o ho\xE0n th\xE0nh nh\u01B0ng kh\xF4ng tr\u1EA3 v\u1EC1 audio_url."
          };
        }
        return {
          status: "completed",
          progress: 100,
          tracks,
          log: `Nh\u1EADn th\xE0nh c\xF4ng ${tracks.length} phi\xEAn b\u1EA3n MP3 t\u1EEB Suno API.`
        };
      }
      if (rawStatus === "CREATE_TASK_FAILED" || rawStatus === "GENERATE_AUDIO_FAILED" || rawStatus === "FAILED" || rawStatus === "ERROR") {
        return {
          status: "failed",
          error: body.errorMessage || body.error_message || json.msg || "Suno API x\u1EED l\xFD th\u1EA5t b\u1EA1i."
        };
      }
      return {
        status: "processing",
        progress: rawStatus === "TEXT_SUCCESS" || rawStatus === "FIRST_SUCCESS" ? 70 : 40,
        log: `Tr\u1EA1ng th\xE1i Suno API: ${rawStatus || "PROCESSING"}...`
      };
    }
    return {
      status: "processing",
      progress: 35,
      log: "\u0110ang ch\u1EDD ph\u1EA3n h\u1ED3i tr\u1EA1ng th\xE1i t\u1EEB Suno API..."
    };
  }
};

// src/server/providers/adapters/replicateAdapter.ts
var replicateAdapter = {
  id: "replicate",
  displayName: "Replicate (MusicGen + Demucs + RVC)",
  defaultBaseUrl: "https://api.replicate.com/v1",
  defaultModel: "meta/musicgen",
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: false,
    supportsLyrics: false,
    supportsTwoVersions: false,
    supportsCover: true,
    supportsStemSeparation: true,
    supportsInstrumental: true,
    maxDurationSec: 30,
    notes: "MusicGen t\u1EA1o nh\u1EA1c n\u1EC1n/giai \u0111i\u1EC7u (t\u1ED1i \u0111a 30s, kh\xF4ng h\xE1t theo l\u1EDDi). Demucs t\xE1ch vocal/instrumental v\xE0 RVC th\u1EF1c hi\u1EC7n AI Cover."
  },
  async testConnection(cfg) {
    const start = Date.now();
    const res = await fetch("https://api.replicate.com/v1/models/meta/musicgen", {
      headers: { Authorization: `Bearer ${cfg.apiKey}` }
    });
    const latencyMs = Date.now() - start;
    if (res.ok) {
      return {
        success: true,
        provider: "replicate",
        statusCode: 200,
        latencyMs,
        message: `K\u1EBFt n\u1ED1i Replicate th\xE0nh c\xF4ng (${latencyMs}ms). S\u1EB5n s\xE0ng MusicGen, Demucs & RVC.`
      };
    }
    return {
      success: false,
      provider: "replicate",
      statusCode: res.status,
      latencyMs,
      message: `L\u1ED7i x\xE1c th\u1EF1c Replicate (HTTP ${res.status}): Vui l\xF2ng ki\u1EC3m tra REPLICATE_API_TOKEN.`
    };
  },
  async submitMusic(cfg, params) {
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "671ac645ce5e552cc63a87071830167b57022e4057d1bc22f4f60f7763c29437",
        input: {
          prompt: `${params.genre}, ${params.promptStyle || params.title}, ${params.bpm ? `${params.bpm} BPM` : ""}`.trim(),
          duration: Math.min(30, params.duration || 30),
          model_version: "stereo-melody-large"
        },
        ...params.callbackUrl ? { webhook: params.callbackUrl } : {}
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Replicate MusicGen l\u1ED7i HTTP ${res.status}: ${err.detail || JSON.stringify(err)}`);
    }
    const data = await res.json();
    return {
      externalTaskId: data.id,
      progressLog: `Replicate MusicGen Prediction ID: ${data.id}`
    };
  },
  async submitCover(cfg, params) {
    if (!params.audioInputUrl || !/^https?:\/\//i.test(params.audioInputUrl)) {
      throw new Error("Replicate RVC y\xEAu c\u1EA7u URL file \xE2m thanh c\xF4ng khai (https://...).");
    }
    if (/localhost|127\.0\.0\.1/i.test(params.audioInputUrl)) {
      throw new Error(
        "Replicate Cloud kh\xF4ng th\u1EC3 t\u1EA3i file t\u1EEB localhost. H\xE3y tri\u1EC3n khai l\xEAn domain HTTPS ho\u1EB7c nh\u1EADp URL audio c\xF4ng khai."
      );
    }
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
        input: {
          song_input: params.audioInputUrl,
          rvc_model: "Squidward",
          pitch_change: params.pitchShift || 0,
          index_rate: Math.min(1, Math.max(0, (params.similarity || 85) / 100)),
          main_vocals_volume_change: Math.round(((params.volumeBalance ?? 70) - 50) / 5)
        },
        ...params.callbackUrl ? { webhook: params.callbackUrl } : {}
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Replicate RVC l\u1ED7i HTTP ${res.status}: ${err.detail || JSON.stringify(err)}`);
    }
    const data = await res.json();
    return {
      externalTaskId: data.id,
      progressLog: `Replicate RVC AI Cover Prediction ID: ${data.id}`
    };
  },
  async submitStems(cfg, audioInputUrl) {
    if (!audioInputUrl || !/^https?:\/\//i.test(audioInputUrl)) {
      throw new Error("Replicate Demucs y\xEAu c\u1EA7u URL file \xE2m thanh c\xF4ng khai (https://...).");
    }
    if (/localhost|127\.0\.0\.1/i.test(audioInputUrl)) {
      throw new Error(
        "Replicate Cloud kh\xF4ng th\u1EC3 truy c\u1EADp localhost. H\xE3y d\xF9ng URL c\xF4ng khai ho\u1EB7c tri\u1EC3n khai l\xEAn domain th\u1EADt."
      );
    }
    const res = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
        input: {
          audio: audioInputUrl
        }
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Replicate Demucs l\u1ED7i HTTP ${res.status}: ${err.detail || JSON.stringify(err)}`);
    }
    const data = await res.json();
    return {
      externalTaskId: data.id,
      progressLog: `Replicate Demucs Stem Separation ID: ${data.id}`
    };
  },
  async pollTask(cfg, externalTaskId, taskType) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${externalTaskId}`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` }
    });
    if (!res.ok) {
      return { status: "processing", progress: 30 };
    }
    const data = await res.json();
    if (data.status === "succeeded") {
      if (taskType === "stems" && data.output && typeof data.output === "object") {
        return {
          status: "completed",
          progress: 100,
          stems: {
            vocals: data.output.vocals,
            instrumental: data.output.other || data.output.no_vocals,
            drums: data.output.drums,
            bass: data.output.bass
          },
          tracks: data.output.vocals ? [{ audioUrl: data.output.vocals }] : void 0,
          log: "T\xE1ch Vocal & Stems b\u1EB1ng Demucs th\xE0nh c\xF4ng!"
        };
      }
      const audioUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!audioUrl) {
        return { status: "failed", error: "Replicate th\xE0nh c\xF4ng nh\u01B0ng kh\xF4ng c\xF3 output audio URL." };
      }
      return {
        status: "completed",
        progress: 100,
        tracks: [{ audioUrl: String(audioUrl) }],
        log: "Replicate x\u1EED l\xFD audio ho\xE0n t\u1EA5t!"
      };
    }
    if (data.status === "failed" || data.status === "canceled") {
      return {
        status: "failed",
        error: data.error || `Replicate task ${data.status}`
      };
    }
    return {
      status: "processing",
      progress: data.status === "processing" ? 65 : 25,
      log: `Replicate GPU status: ${data.status}`
    };
  }
};

// src/server/providers/adapters/minimaxAdapter.ts
var minimaxAdapter = {
  id: "minimax",
  displayName: "MiniMax Music-01",
  defaultBaseUrl: "https://api.minimax.chat/v1",
  defaultModel: "music-01",
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: true,
    supportsLyrics: true,
    supportsTwoVersions: false,
    supportsCover: false,
    supportsStemSeparation: false,
    supportsInstrumental: true,
    maxDurationSec: 180,
    notes: "H\u1ED7 tr\u1EE3 t\u1EA1o b\xE0i h\xE1t c\xF3 l\u1EDDi + gi\u1ECDng h\xE1t tr\u1EF1c ti\u1EBFp qua model music-01 (kh\xF4ng h\u1ED7 tr\u1EE3 AI Cover / t\xE1ch stems)."
  },
  async testConnection(cfg) {
    const start = Date.now();
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/music_generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: cfg.model || "music-01", lyrics: "test" })
    });
    const latencyMs = Date.now() - start;
    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        provider: "minimax",
        statusCode: res.status,
        latencyMs,
        message: `MiniMax API Key kh\xF4ng h\u1EE3p l\u1EC7 (HTTP ${res.status}).`
      };
    }
    return {
      success: res.status < 500,
      provider: "minimax",
      statusCode: res.status,
      latencyMs,
      message: `MiniMax Music-01 endpoint \u0111\xE3 x\xE1c th\u1EF1c v\xE0 ph\u1EA3n h\u1ED3i HTTP ${res.status} (${latencyMs}ms).`
    };
  },
  async submitMusic(cfg, params) {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/music_generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: cfg.model || "music-01",
        prompt: `${params.genre}, ${params.promptStyle}`.trim(),
        lyrics: params.vocalType === "instrumental" ? "[Inst]" : params.lyrics || `[Verse]
${params.title}`,
        audio_setting: {
          sample_rate: 44100,
          bitrate: 256e3,
          format: "mp3"
        }
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`MiniMax API l\u1ED7i HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    const audioUrl = data.data?.audio_url || data.audio_url;
    if (!audioUrl) {
      throw new Error(
        `MiniMax API kh\xF4ng tr\u1EA3 v\u1EC1 audio_url: ${data.base_resp?.status_msg || JSON.stringify(data).slice(0, 200)}`
      );
    }
    return {
      immediateTracks: [{ audioUrl, title: params.title }],
      progressLog: "MiniMax Music-01 \u0111\xE3 t\u1EA1o b\xE0i h\xE1t th\xE0nh c\xF4ng."
    };
  }
};

// src/server/providers/adapters/falAdapter.ts
var falAdapter = {
  id: "fal",
  displayName: "FAL.ai (Stable Audio)",
  defaultBaseUrl: "https://queue.fal.run",
  defaultModel: "fal-ai/stable-audio",
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: false,
    supportsLyrics: false,
    supportsTwoVersions: false,
    supportsCover: false,
    supportsStemSeparation: false,
    supportsInstrumental: true,
    maxDurationSec: 47,
    notes: "T\u1EA1o nh\u1EA1c kh\xF4ng l\u1EDDi (Instrumental) t\u1ED1c \u0111\u1ED9 cao t\u1ED1i \u0111a 47s qua Stable Audio."
  },
  async testConnection(cfg) {
    const start = Date.now();
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/${cfg.model || "fal-ai/stable-audio"}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const latencyMs = Date.now() - start;
    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        provider: "fal",
        statusCode: res.status,
        latencyMs,
        message: `FAL_KEY kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c h\u1EBFt quy\u1EC1n truy c\u1EADp (HTTP ${res.status}).`
      };
    }
    return {
      success: res.status < 500,
      provider: "fal",
      statusCode: res.status,
      latencyMs,
      message: `K\u1EBFt n\u1ED1i FAL.ai Audio Queue th\xE0nh c\xF4ng (HTTP ${res.status}, ${latencyMs}ms).`
    };
  },
  async submitMusic(cfg, params) {
    const modelPath = cfg.model || "fal-ai/stable-audio";
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/${modelPath}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${cfg.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: `${params.genre}, ${params.promptStyle || params.title}`,
        seconds_total: Math.min(47, params.duration || 30)
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`FAL.ai l\u1ED7i HTTP ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    if (!data.request_id) {
      throw new Error(`FAL.ai kh\xF4ng tr\u1EA3 v\u1EC1 request_id: ${JSON.stringify(data).slice(0, 200)}`);
    }
    return {
      externalTaskId: data.request_id,
      progressLog: `FAL.ai Queue Request ID: ${data.request_id}`
    };
  },
  async pollTask(cfg, externalTaskId) {
    const modelPath = cfg.model || "fal-ai/stable-audio";
    const base = cfg.baseUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/${modelPath}/requests/${externalTaskId}`, {
      headers: { Authorization: `Key ${cfg.apiKey}` }
    });
    if (!res.ok) {
      return { status: "processing", progress: 45 };
    }
    const data = await res.json();
    const audioUrl = data.audio_file?.url || data.audio?.url;
    if (audioUrl) {
      return {
        status: "completed",
        progress: 100,
        tracks: [{ audioUrl }],
        log: "FAL.ai \u0111\xE3 render audio th\xE0nh c\xF4ng."
      };
    }
    if (data.status === "FAILED") {
      return { status: "failed", error: data.error || "FAL.ai task failed" };
    }
    return { status: "processing", progress: 60 };
  }
};

// src/server/providers/adapters/customAdapter.ts
var customAdapter = {
  id: "custom",
  displayName: "Custom Music API / Self-Hosted",
  defaultBaseUrl: "https://your-music-server.example.com",
  defaultModel: "custom-v1",
  capabilities: {
    supportsMusicGeneration: true,
    supportsVocals: true,
    supportsLyrics: true,
    supportsTwoVersions: true,
    supportsCover: true,
    supportsStemSeparation: true,
    supportsInstrumental: true,
    maxDurationSec: 300,
    notes: "K\u1EBFt n\u1ED1i m\xE1y ch\u1EE7 AI Music / RVC t\u1EF1 tri\u1EC3n khai theo chu\u1EA9n REST JSON (/generate, /cover, /stems)."
  },
  async testConnection(cfg) {
    const start = Date.now();
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/health`, {
      headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}
    });
    const latencyMs = Date.now() - start;
    return {
      success: res.ok,
      provider: "custom",
      statusCode: res.status,
      latencyMs,
      message: res.ok ? `Custom Endpoint ph\u1EA3n h\u1ED3i HTTP ${res.status} (${latencyMs}ms).` : `Custom Endpoint l\u1ED7i HTTP ${res.status}`
    };
  },
  async submitMusic(cfg, params) {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/generate`, {
      method: "POST",
      headers: {
        ...cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error(`Custom API l\u1ED7i HTTP ${res.status}`);
    }
    const data = await res.json();
    const audioUrl = data.audio_url || data.url;
    if (!audioUrl) {
      throw new Error("Custom endpoint kh\xF4ng tr\u1EA3 v\u1EC1 audio_url");
    }
    return {
      immediateTracks: [{ audioUrl, coverUrl: data.cover_url, title: params.title }],
      progressLog: "Nh\u1EADn audio t\u1EEB Custom Music Server th\xE0nh c\xF4ng."
    };
  },
  async submitCover(cfg, params) {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/cover`, {
      method: "POST",
      headers: {
        ...cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error(`Custom Cover API l\u1ED7i HTTP ${res.status}`);
    }
    const data = await res.json();
    const audioUrl = data.audio_url || data.url;
    if (!audioUrl) throw new Error("Custom Cover endpoint kh\xF4ng tr\u1EA3 v\u1EC1 audio_url");
    return {
      immediateTracks: [{ audioUrl, title: params.title }],
      progressLog: "Nh\u1EADn b\u1EA3n AI Cover t\u1EEB Custom Server th\xE0nh c\xF4ng."
    };
  },
  async submitStems(cfg, audioInputUrl) {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/stems`, {
      method: "POST",
      headers: {
        ...cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ audioInputUrl })
    });
    if (!res.ok) throw new Error(`Custom Stems API l\u1ED7i HTTP ${res.status}`);
    const data = await res.json();
    return {
      immediateStems: data.stems || { vocals: data.vocals, instrumental: data.instrumental },
      progressLog: "T\xE1ch stems th\xE0nh c\xF4ng t\u1EEB Custom Server."
    };
  }
};

// src/server/providers/manager.ts
var ADAPTERS = {
  suno: sunoAdapter,
  replicate: replicateAdapter,
  minimax: minimaxAdapter,
  fal: falAdapter,
  custom: customAdapter
};
var MusicProviderManager = class {
  maskKey(key) {
    if (!key) return "";
    if (key.length <= 8) return "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    return `${key.slice(0, 4)}\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022${key.slice(-4)}`;
  }
  getConfig() {
    const state = db.getState();
    const activeId = state.activeProvider || "suno";
    const activeEntry = state.providers[activeId];
    const adapter = ADAPTERS[activeId];
    const providersMap = {};
    Object.keys(ADAPTERS).forEach((pid) => {
      const entry = state.providers[pid];
      const ad = ADAPTERS[pid];
      providersMap[pid] = {
        id: pid,
        name: ad.displayName,
        enabled: entry.enabled,
        isConfigured: Boolean(entry.apiKey || pid === "custom" && entry.baseUrl),
        apiKeyMasked: this.maskKey(entry.apiKey),
        baseUrl: entry.baseUrl || ad.defaultBaseUrl,
        model: entry.model || ad.defaultModel,
        capabilities: ad.capabilities
      };
    });
    const isConfigured = Boolean(activeEntry.apiKey || activeId === "custom" && activeEntry.baseUrl);
    const status = !activeEntry.enabled ? "disabled" : isConfigured ? "connected" : "unconfigured";
    return {
      provider: activeId,
      apiKeyMasked: this.maskKey(activeEntry.apiKey),
      baseUrl: activeEntry.baseUrl || adapter.defaultBaseUrl,
      model: activeEntry.model || adapter.defaultModel,
      isConfigured,
      enabled: activeEntry.enabled,
      status,
      isServerless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
      capabilities: adapter.capabilities,
      providers: providersMap
    };
  }
  updateConfig(newConfig) {
    const state = db.getState();
    const targetId = newConfig.provider || state.activeProvider;
    const entry = state.providers[targetId];
    if (!entry) {
      throw new Error(`Provider kh\xF4ng h\u1EE3p l\u1EC7: ${targetId}`);
    }
    if (newConfig.enabled !== void 0) {
      entry.enabled = Boolean(newConfig.enabled);
    }
    if (newConfig.apiKey !== void 0 && newConfig.apiKey !== "" && newConfig.apiKey !== "***") {
      entry.apiKey = newConfig.apiKey.trim();
    }
    if (newConfig.baseUrl !== void 0 && newConfig.baseUrl.trim()) {
      entry.baseUrl = newConfig.baseUrl.trim();
    }
    if (newConfig.model !== void 0 && newConfig.model.trim()) {
      entry.model = newConfig.model.trim();
    }
    if (newConfig.setActive !== false && newConfig.provider) {
      state.activeProvider = targetId;
    }
    const activeEntry = state.providers[state.activeProvider];
    state.providerConfig = {
      provider: state.activeProvider,
      apiKey: activeEntry.apiKey,
      baseUrl: activeEntry.baseUrl,
      model: activeEntry.model
    };
    db.save();
    this.addLog(
      "admin",
      "info",
      `Admin c\u1EADp nh\u1EADt nh\xE0 cung c\u1EA5p ${targetId.toUpperCase()} (enabled=${entry.enabled}, active=${state.activeProvider.toUpperCase()})`
    );
    return this.getConfig();
  }
  toggleProviderEnabled(providerId, enabled) {
    return this.updateConfig({ provider: providerId, enabled, setActive: false });
  }
  getLogs(limit = 80) {
    return db.getState().logs.slice(-limit).reverse();
  }
  getFailedTasks(limit = 30) {
    return Object.values(db.getState().tasks).filter((t) => t.status === "failed").slice(-limit).reverse();
  }
  getTask(id) {
    return db.getState().tasks[id];
  }
  getAllTasks() {
    return Object.values(db.getState().tasks).reverse();
  }
  addLog(taskId, level, message, provider) {
    const state = db.getState();
    const logItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
      level,
      message,
      provider: provider || state.activeProvider
    };
    state.logs.push(logItem);
    if (state.logs.length > 300) state.logs.shift();
    db.save();
  }
  async testConnection(providerOverride, apiKeyOverride, baseUrlOverride) {
    const state = db.getState();
    const providerId = providerOverride || state.activeProvider;
    const entry = state.providers[providerId];
    const adapter = ADAPTERS[providerId];
    const effectiveCfg = {
      enabled: entry.enabled,
      apiKey: apiKeyOverride && apiKeyOverride !== "***" ? apiKeyOverride.trim() : entry.apiKey,
      baseUrl: baseUrlOverride?.trim() || entry.baseUrl || adapter.defaultBaseUrl,
      model: entry.model || adapter.defaultModel
    };
    if (!effectiveCfg.apiKey && providerId !== "custom") {
      return {
        success: false,
        provider: providerId,
        latencyMs: 0,
        message: `Ch\u01B0a c\xF3 API Key cho ${adapter.displayName}. Vui l\xF2ng nh\u1EADp API Key \u0111\u1EC3 ki\u1EC3m tra.`
      };
    }
    try {
      const result = await adapter.testConnection(effectiveCfg);
      this.addLog(
        "test",
        result.success ? "success" : "error",
        `Test ${providerId.toUpperCase()}: ${result.message}`,
        providerId
      );
      return result;
    } catch (err) {
      const msg = `Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i \u0111\u1EBFn ${effectiveCfg.baseUrl}: ${err.message}`;
      this.addLog("test", "error", msg, providerId);
      return {
        success: false,
        provider: providerId,
        latencyMs: 0,
        message: msg
      };
    }
  }
  resolveAdapterForCapability(preferred, requiredCap) {
    const state = db.getState();
    const prefEntry = state.providers[preferred];
    const prefAdapter = ADAPTERS[preferred];
    if (!prefEntry.enabled) {
      return {
        error: `Nh\xE0 cung c\u1EA5p ${prefAdapter.displayName} hi\u1EC7n \u0111ang b\u1ECB T\u1EAET b\u1EDFi Qu\u1EA3n tr\u1ECB vi\xEAn.`
      };
    }
    if (prefAdapter.capabilities[requiredCap]) {
      if (!prefEntry.apiKey && preferred !== "custom") {
        return {
          error: `Ch\u01B0a c\u1EA5u h\xECnh API Key cho ${prefAdapter.displayName}. Vui l\xF2ng v\xE0o Trang Qu\u1EA3n Tr\u1ECB Admin > AI Music API \u0111\u1EC3 nh\u1EADp API Key th\u1EF1c t\u1EBF.`
        };
      }
      return { providerId: preferred, adapter: prefAdapter };
    }
    const fallbackId = Object.keys(ADAPTERS).find((pid) => {
      const e = state.providers[pid];
      return e.enabled && Boolean(e.apiKey) && ADAPTERS[pid].capabilities[requiredCap];
    });
    if (fallbackId) {
      return { providerId: fallbackId, adapter: ADAPTERS[fallbackId] };
    }
    const capLabel = requiredCap === "supportsCover" ? "AI Cover (Chuy\u1EC3n \u0111\u1ED5i gi\u1ECDng h\xE1t)" : requiredCap === "supportsStemSeparation" ? "T\xE1ch gi\u1ECDng & nh\u1EA1c n\u1EC1n (Demucs)" : "T\u1EA1o nh\u1EA1c AI";
    return {
      error: `Nh\xE0 cung c\u1EA5p ${prefAdapter.displayName} kh\xF4ng h\u1ED7 tr\u1EE3 ch\u1EE9c n\u0103ng "${capLabel}". Vui l\xF2ng b\u1EADt v\xE0 c\u1EA5u h\xECnh API Key cho nh\xE0 cung c\u1EA5p h\u1ED7 tr\u1EE3 (VD: Replicate cho RVC/Demucs ho\u1EB7c Suno API).`
    };
  }
  async createMusicTask(params) {
    const state = db.getState();
    const preferred = params.providerOverride || state.activeProvider;
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const resolved = this.resolveAdapterForCapability(preferred, "supportsMusicGeneration");
    const task = {
      id: taskId,
      provider: "providerId" in resolved ? resolved.providerId : preferred,
      type: "music",
      status: "pending",
      progress: 5,
      title: params.title || "Untitled Song",
      promptStyle: params.promptStyle || params.genre,
      lyrics: params.lyrics,
      genre: params.genre,
      vocalType: params.vocalType,
      vocalLanguage: params.vocalLanguage || "vi",
      bpm: params.bpm || 120,
      userId: params.userId,
      logs: [`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Kh\u1EDFi t\u1EA1o t\xE1c v\u1EE5 t\u1EA1o nh\u1EA1c AI: "${params.title}"`],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    state.tasks[taskId] = task;
    state.apiUsage.totalRequests += 1;
    if ("error" in resolved) {
      task.status = "failed";
      task.progress = 0;
      task.error = resolved.error;
      task.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] TH\u1EA4T B\u1EA0I: ${resolved.error}`);
      state.apiUsage.failedRequests += 1;
      db.save();
      this.addLog(taskId, "error", resolved.error, preferred);
      return task;
    }
    const { providerId, adapter } = resolved;
    if (params.vocalType !== "instrumental" && !adapter.capabilities.supportsVocals) {
      const capErr = `${adapter.displayName} ch\u1EC9 h\u1ED7 tr\u1EE3 nh\u1EA1c kh\xF4ng l\u1EDDi (Instrumental), kh\xF4ng h\u1ED7 tr\u1EE3 h\xE1t gi\u1ECDng ca s\u0129 AI. H\xE3y ch\u1ECDn "Nh\u1EA1c Kh\xF4ng L\u1EDDi" ho\u1EB7c chuy\u1EC3n nh\xE0 cung c\u1EA5p sang Suno API / MiniMax Music-01.`;
      task.status = "failed";
      task.progress = 0;
      task.error = capErr;
      task.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] T\u1EEA CH\u1ED0I: ${capErr}`);
      state.apiUsage.failedRequests += 1;
      db.save();
      this.addLog(taskId, "warn", capErr, providerId);
      return task;
    }
    db.save();
    const resolvedParams = {
      ...params,
      callbackUrl: params.callbackUrl?.replace("__TASK_ID__", taskId)
    };
    this.runAsyncSubmission(task, adapter, state.providers[providerId], resolvedParams, "music");
    return task;
  }
  async createCoverTask(params) {
    const state = db.getState();
    const preferred = params.providerOverride || state.activeProvider;
    const taskId = `cover-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const resolved = this.resolveAdapterForCapability(preferred, "supportsCover");
    const task = {
      id: taskId,
      provider: "providerId" in resolved ? resolved.providerId : preferred,
      type: "cover",
      status: "pending",
      progress: 5,
      title: params.title || "AI Cover Track",
      promptStyle: `AI Cover (${params.voiceModelId || "voice"})`,
      genre: params.genre || "Pop",
      vocalType: params.vocalType || "female",
      voiceModelId: params.voiceModelId,
      userId: params.userId,
      logs: [`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Kh\u1EDFi t\u1EA1o t\xE1c v\u1EE5 AI Cover: "${params.title}"`],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    state.tasks[taskId] = task;
    state.apiUsage.totalRequests += 1;
    if ("error" in resolved) {
      task.status = "failed";
      task.progress = 0;
      task.error = resolved.error;
      task.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] TH\u1EA4T B\u1EA0I: ${resolved.error}`);
      state.apiUsage.failedRequests += 1;
      db.save();
      this.addLog(taskId, "error", resolved.error, preferred);
      return task;
    }
    db.save();
    const resolvedParams = {
      ...params,
      callbackUrl: params.callbackUrl?.replace("__TASK_ID__", taskId)
    };
    this.runAsyncSubmission(
      task,
      resolved.adapter,
      state.providers[resolved.providerId],
      resolvedParams,
      "cover"
    );
    return task;
  }
  async createStemsTask(params) {
    const state = db.getState();
    const preferred = state.activeProvider;
    const taskId = `stems-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const resolved = this.resolveAdapterForCapability(preferred, "supportsStemSeparation");
    const task = {
      id: taskId,
      provider: "providerId" in resolved ? resolved.providerId : "replicate",
      type: "stems",
      status: "pending",
      progress: 5,
      title: params.title || "T\xE1ch Vocal & Instrumental",
      promptStyle: "Demucs Stem Separation",
      genre: "Pop",
      vocalType: "duet",
      userId: params.userId,
      logs: [`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] Kh\u1EDFi t\u1EA1o t\xE1ch Vocal & Nh\u1EA1c n\u1EC1n (Demucs)...`],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    state.tasks[taskId] = task;
    state.apiUsage.totalRequests += 1;
    if ("error" in resolved) {
      task.status = "failed";
      task.error = resolved.error;
      task.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] TH\u1EA4T B\u1EA0I: ${resolved.error}`);
      state.apiUsage.failedRequests += 1;
      db.save();
      this.addLog(taskId, "error", resolved.error, "replicate");
      return task;
    }
    db.save();
    this.runAsyncSubmission(
      task,
      resolved.adapter,
      state.providers[resolved.providerId],
      {
        title: task.title,
        lyrics: "",
        genre: "Pop",
        promptStyle: "Demucs",
        vocalType: "duet",
        audioInputUrl: params.audioInputUrl,
        userId: params.userId,
        userName: params.userName
      },
      "stems"
    );
    return task;
  }
  async runAsyncSubmission(task, adapter, cfg, params, mode) {
    try {
      task.status = "processing";
      task.progress = 20;
      task.logs.push(
        `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] \u0110ang k\u1EBFt n\u1ED1i ${adapter.displayName} (${cfg.model})...`
      );
      db.save();
      this.addLog(task.id, "info", `Submitting ${mode} task to ${adapter.id}`, adapter.id);
      let submitRes;
      if (mode === "cover") {
        if (!adapter.submitCover) {
          throw new Error(`${adapter.displayName} kh\xF4ng h\u1ED7 tr\u1EE3 AI Cover.`);
        }
        submitRes = await adapter.submitCover(cfg, params);
      } else if (mode === "stems") {
        if (!adapter.submitStems || !params.audioInputUrl) {
          throw new Error(`${adapter.displayName} kh\xF4ng h\u1ED7 tr\u1EE3 t\xE1ch Stems ho\u1EB7c thi\u1EBFu audio URL.`);
        }
        submitRes = await adapter.submitStems(cfg, params.audioInputUrl);
      } else {
        submitRes = await adapter.submitMusic(cfg, params);
      }
      task.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${submitRes.progressLog}`);
      if (submitRes.immediateStems) {
        this.finalizeStemsSuccess(task, submitRes.immediateStems);
        return;
      }
      if (submitRes.immediateTracks && submitRes.immediateTracks.length > 0) {
        this.finalizeTracksSuccess(task, submitRes.immediateTracks, params, adapter.id);
        return;
      }
      if (!submitRes.externalTaskId || !adapter.pollTask) {
        throw new Error("Provider kh\xF4ng tr\u1EA3 v\u1EC1 Task ID \u0111\u1EC3 theo d\xF5i ti\u1EBFn tr\xECnh.");
      }
      task.externalTaskId = submitRes.externalTaskId;
      task.progress = 35;
      db.save();
      this.startPolling(task, adapter, cfg, submitRes.externalTaskId, params, mode);
    } catch (err) {
      task.status = "failed";
      task.progress = 0;
      task.error = err.message || "L\u1ED7i kh\xF4ng x\xE1c \u0111\u1ECBnh khi g\u1ECDi API t\u1EA1o nh\u1EA1c.";
      task.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] L\u1ED6I: ${task.error}`);
      db.getState().apiUsage.failedRequests += 1;
      db.save();
      this.addLog(task.id, "error", `${mode} failed: ${task.error}`, adapter.id);
    }
  }
  startPolling(task, adapter, cfg, externalId, params, mode) {
    let attempts = 0;
    const maxAttempts = 60;
    const timer = setInterval(async () => {
      attempts++;
      if (task.status === "completed" || task.status === "failed") {
        clearInterval(timer);
        return;
      }
      if (attempts > maxAttempts) {
        clearInterval(timer);
        task.status = "failed";
        task.error = "Qu\xE1 th\u1EDDi gian ch\u1EDD ph\u1EA3n h\u1ED3i t\u1EEB nh\xE0 cung c\u1EA5p API (Timeout).";
        task.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] L\u1ED6I: Timeout.`);
        db.getState().apiUsage.failedRequests += 1;
        db.save();
        this.addLog(task.id, "error", `Task ${task.id} polling timeout`, adapter.id);
        return;
      }
      try {
        const pollRes = await adapter.pollTask(cfg, externalId, mode);
        if (pollRes.log) {
          task.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] ${pollRes.log}`);
        }
        if (pollRes.progress) {
          task.progress = Math.max(task.progress, pollRes.progress);
        }
        if (pollRes.status === "completed") {
          clearInterval(timer);
          if (mode === "stems" && pollRes.stems) {
            this.finalizeStemsSuccess(task, pollRes.stems);
          } else if (pollRes.tracks && pollRes.tracks.length > 0) {
            this.finalizeTracksSuccess(task, pollRes.tracks, params, adapter.id);
          } else {
            task.status = "failed";
            task.error = "Nh\xE0 cung c\u1EA5p b\xE1o ho\xE0n th\xE0nh nh\u01B0ng kh\xF4ng c\xF3 file \xE2m thanh tr\u1EA3 v\u1EC1.";
            db.getState().apiUsage.failedRequests += 1;
            db.save();
          }
        } else if (pollRes.status === "failed") {
          clearInterval(timer);
          task.status = "failed";
          task.error = pollRes.error || "T\xE1c v\u1EE5 API th\u1EA5t b\u1EA1i.";
          db.getState().apiUsage.failedRequests += 1;
          db.save();
          this.addLog(task.id, "error", `Task ${task.id} failed: ${task.error}`, adapter.id);
        } else {
          db.save();
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2500);
  }
  handleWebhookCallback(taskId, payload) {
    const task = db.getState().tasks[taskId];
    if (!task) return false;
    const tracks = payload?.data?.data || payload?.tracks || [];
    if (Array.isArray(tracks) && tracks.length > 0) {
      const normalized = tracks.map((t) => ({
        audioUrl: t.audio_url || t.audioUrl,
        coverUrl: t.image_url || t.coverUrl,
        title: t.title
      })).filter((t) => Boolean(t.audioUrl));
      if (normalized.length > 0) {
        this.finalizeTracksSuccess(
          task,
          normalized,
          {
            title: task.title,
            lyrics: task.lyrics || "",
            genre: task.genre,
            promptStyle: task.promptStyle,
            vocalType: task.vocalType,
            bpm: task.bpm,
            userId: task.userId
          },
          task.provider
        );
        return true;
      }
    }
    return false;
  }
  finalizeStemsSuccess(task, stems) {
    task.status = "completed";
    task.progress = 100;
    task.resultStems = stems;
    task.resultAudioUrl = stems.vocals || stems.instrumental;
    task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    task.logs.push(`[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] T\xE1ch Vocal & Instrumental th\xE0nh c\xF4ng!`);
    db.getState().apiUsage.successfulGenerations += 1;
    db.save();
    this.addLog(task.id, "success", `Separated stems for task ${task.id}`, task.provider);
  }
  finalizeTracksSuccess(task, tracks, params, providerId) {
    const state = db.getState();
    const versionLimit = Math.max(1, Math.min(2, params.versionCount || tracks.length));
    const selectedTracks = tracks.slice(0, versionLimit);
    const createdSongs = selectedTracks.map((tr, idx) => ({
      id: `song-${Date.now()}-${idx + 1}`,
      title: tr.title || (selectedTracks.length > 1 ? `${task.title} (Phi\xEAn b\u1EA3n ${idx + 1})` : task.title),
      artist: `AI Artist (${providerId.toUpperCase()})`,
      genre: task.genre,
      vocalType: task.vocalType,
      vocalLanguage: task.vocalLanguage,
      duration: params.duration || 180,
      coverUrl: tr.coverUrl || "/images/album_cover_vinahouse_1794018465637.jpg",
      audioUrl: tr.audioUrl,
      lyrics: task.lyrics || "",
      promptStyle: task.promptStyle,
      bpm: task.bpm,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      isFavorite: false,
      playsCount: 1,
      likesCount: 0,
      downloadsCount: 0,
      userId: params.userId || "user-demo",
      userName: params.userName || "Th\xE0nh Vi\xEAn",
      provider: providerId,
      taskId: task.id,
      isRealAiGenerated: true,
      isAiCover: task.type === "cover",
      voiceModelId: params.voiceModelId
    }));
    task.status = "completed";
    task.progress = 100;
    task.resultAudioUrl = createdSongs[0].audioUrl;
    task.resultCoverUrl = createdSongs[0].coverUrl;
    task.songData = createdSongs[0];
    task.songsData = createdSongs;
    task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    task.logs.push(
      `[${(/* @__PURE__ */ new Date()).toLocaleTimeString()}] HO\xC0N T\u1EA4T! \u0110\xE3 nh\u1EADn ${createdSongs.length} file \xE2m thanh th\u1EADt t\u1EEB ${providerId.toUpperCase()}.`
    );
    createdSongs.slice().reverse().forEach((s) => state.songs.unshift(s));
    state.apiUsage.successfulGenerations += 1;
    state.apiUsage.estimatedCostUsd = Number((state.apiUsage.estimatedCostUsd + 0.04 * createdSongs.length).toFixed(2));
    if (params.userId) {
      const u = state.users.find((user) => user.id === params.userId);
      if (u) {
        if (task.type === "cover") u.coversCount += createdSongs.length;
        else u.savedSongsCount += createdSongs.length;
      }
    }
    db.save();
    this.addLog(
      task.id,
      "success",
      `Generated ${createdSongs.length} real track(s) via ${providerId}`,
      providerId
    );
  }
};
var providerManager = new MusicProviderManager();

// src/server/auth.ts
import crypto2 from "crypto";
function getSecret() {
  return process.env.SESSION_SECRET || process.env.GEMINI_API_KEY || "ai-music-studio-stable-hmac-secret-2026";
}
function signToken(payload) {
  const fullPayload = {
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1e3
    // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const sig = crypto2.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}
function verifyToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto2.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto2.timingSafeEqual(a, b)) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8")
    );
    if (!payload || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
function extractAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith("aimusic_token="));
    if (match) {
      return decodeURIComponent(match.split("=")[1] || "");
    }
  }
  return null;
}
function optionalAuth(req, _res, next) {
  const token = extractAuthToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.authUser = payload;
    }
  }
  next();
}
function requireAuth(req, res, next) {
  const token = extractAuthToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: "Vui l\xF2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 ti\u1EBFp t\u1EE5c." });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: "Phi\xEAn \u0111\u0103ng nh\u1EADp h\u1EBFt h\u1EA1n ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7." });
  }
  const storedUser = db.getState().users.find((u) => u.id === payload.id);
  if (storedUser?.isBanned) {
    return res.status(403).json({ success: false, error: "T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 b\u1ECB kh\xF3a." });
  }
  req.authUser = payload;
  next();
}
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.authUser?.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i: Ch\u1EC9 Qu\u1EA3n tr\u1ECB vi\xEAn (Admin) m\u1EDBi c\xF3 quy\u1EC1n th\u1EF1c hi\u1EC7n thao t\xE1c n\xE0y."
      });
    }
    next();
  });
}

// src/server/app.ts
dotenv.config();
var app = express();
app.use(express.json({ limit: "35mb" }));
app.use(express.urlencoded({ extended: true, limit: "35mb" }));
var geminiApiKey = process.env.GEMINI_API_KEY || "";
var ai = null;
if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI client:", err);
  }
}
function sanitizeUser(u) {
  const { passwordHash, ...safe } = u;
  return safe;
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    geminiConfigured: !!ai,
    musicProviderConfigured: providerManager.getConfig().isConfigured,
    activeProvider: providerManager.getConfig().provider,
    serverless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/music/provider-status", (_req, res) => {
  const cfg = providerManager.getConfig();
  res.json({
    success: true,
    provider: cfg.provider,
    isConfigured: cfg.isConfigured,
    enabled: cfg.enabled,
    status: cfg.status,
    capabilities: cfg.capabilities,
    providers: cfg.providers,
    isServerless: cfg.isServerless,
    geminiConfigured: !!ai
  });
});
app.get("/api/site/public", (_req, res) => {
  const state = db.getState();
  res.json({
    success: true,
    websiteConfig: state.websiteConfig,
    ads: state.websiteConfig.adsEnabled ? state.ads.filter((a) => a.isActive) : []
  });
});
app.post("/api/ads/:id/click", (req, res) => {
  const ad = db.getState().ads.find((a) => a.id === req.params.id);
  if (ad) {
    ad.clicksCount += 1;
    db.save();
  }
  res.json({ success: true });
});
app.post("/api/auth/register", (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 Email v\xE0 M\u1EADt kh\u1EA9u." });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const state = db.getState();
    if (state.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ success: false, error: "Email n\xE0y \u0111\xE3 \u0111\u01B0\u1EE3c \u0111\u0103ng k\xFD." });
    }
    const newUser = {
      id: `user-${Date.now()}`,
      name: String(name || cleanEmail.split("@")[0]).trim(),
      email: cleanEmail,
      role: "user",
      avatar: "/images/album_cover_lofi_ballad_1794018467443.jpg",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      savedSongsCount: 0,
      coversCount: 0,
      isBanned: false,
      downloadsHistory: [],
      passwordHash: hashPassword(String(password))
    };
    state.users.push(newUser);
    db.save();
    const token = signToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name
    });
    res.setHeader(
      "Set-Cookie",
      `aimusic_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}`
    );
    res.json({
      success: true,
      token,
      user: sanitizeUser(newUser)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Vui l\xF2ng nh\u1EADp Email v\xE0 M\u1EADt kh\u1EA9u." });
    }
    const cleanInput = String(email).trim().toLowerCase();
    const state = db.getState();
    const targetUser = state.users.find(
      (u) => u.email.toLowerCase() === cleanInput || cleanInput === "admin" && u.role === "admin"
    );
    if (!targetUser || !verifyPassword(String(password), targetUser.passwordHash)) {
      return res.status(401).json({ success: false, error: "Email ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c." });
    }
    if (targetUser.isBanned) {
      return res.status(403).json({ success: false, error: "T\xE0i kho\u1EA3n n\xE0y \u0111\xE3 b\u1ECB Qu\u1EA3n tr\u1ECB vi\xEAn kh\xF3a." });
    }
    const token = signToken({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      name: targetUser.name
    });
    res.setHeader(
      "Set-Cookie",
      `aimusic_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}`
    );
    res.json({
      success: true,
      token,
      user: sanitizeUser(targetUser)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/auth/logout", (_req, res) => {
  res.setHeader("Set-Cookie", "aimusic_token=; Path=/; HttpOnly; Max-Age=0");
  res.json({ success: true });
});
app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = db.getState().users.find((u) => u.id === req.authUser?.id);
  if (!user) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n." });
  }
  res.json({ success: true, user: sanitizeUser(user) });
});
app.put("/api/auth/profile", requireAuth, (req, res) => {
  const user = db.getState().users.find((u) => u.id === req.authUser?.id);
  if (!user) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n." });
  }
  if (req.body.name) user.name = String(req.body.name).trim();
  if (req.body.avatar) user.avatar = String(req.body.avatar).trim();
  db.save();
  res.json({ success: true, user: sanitizeUser(user) });
});
app.post("/api/auth/change-password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.getState().users.find((u) => u.id === req.authUser?.id);
  if (!user) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n." });
  }
  if (!verifyPassword(String(currentPassword || ""), user.passwordHash)) {
    return res.status(400).json({ success: false, error: "M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng \u0111\xFAng." });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, error: "M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i t\u1EEB 6 k\xFD t\u1EF1 tr\u1EDF l\xEAn." });
  }
  user.passwordHash = hashPassword(String(newPassword));
  db.save();
  res.json({ success: true, message: "\u0110\u1ED5i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng!" });
});
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Vui l\xF2ng nh\u1EADp email." });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const user = db.getState().users.find((u) => u.email.toLowerCase() === cleanEmail);
  res.json({
    success: true,
    message: user ? "H\u01B0\u1EDBng d\u1EABn kh\xF4i ph\u1EE5c m\u1EADt kh\u1EA9u \u0111\xE3 \u0111\u01B0\u1EE3c ghi nh\u1EADn. N\u1EBFu c\u1EA7n \u0111\u1EB7t l\u1EA1i kh\u1EA9n c\u1EA5p tr\xEAn hosting ri\xEAng, vui l\xF2ng li\xEAn h\u1EC7 Qu\u1EA3n tr\u1ECB vi\xEAn." : "N\u1EBFu email t\u1ED3n t\u1EA1i trong h\u1EC7 th\u1ED1ng, b\u1EA1n s\u1EBD nh\u1EADn \u0111\u01B0\u1EE3c h\u01B0\u1EDBng d\u1EABn kh\xF4i ph\u1EE5c."
  });
});
app.get("/api/songs", (_req, res) => {
  res.json({
    success: true,
    songs: db.getState().songs
  });
});
app.get("/api/songs/:id", (req, res) => {
  const song = db.getState().songs.find((s) => s.id === req.params.id);
  if (!song) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y b\xE0i h\xE1t." });
  }
  res.json({ success: true, song });
});
app.post("/api/songs/:id/play", (req, res) => {
  const song = db.getState().songs.find((s) => s.id === req.params.id);
  if (song) {
    song.playsCount += 1;
    db.save();
  }
  res.json({ success: true, playsCount: song?.playsCount || 0 });
});
app.patch("/api/songs/:id", optionalAuth, (req, res) => {
  const song = db.getState().songs.find((s) => s.id === req.params.id);
  if (!song) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y b\xE0i h\xE1t." });
  }
  if (typeof req.body.title === "string" && req.body.title.trim()) {
    song.title = req.body.title.trim();
  }
  if (typeof req.body.isFavorite === "boolean") {
    song.isFavorite = req.body.isFavorite;
  }
  db.save();
  res.json({ success: true, song });
});
app.delete("/api/songs/:id", optionalAuth, (req, res) => {
  const state = db.getState();
  const idx = state.songs.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y b\xE0i h\xE1t." });
  }
  state.songs.splice(idx, 1);
  db.save();
  res.json({ success: true });
});
app.post("/api/songs/:id/download-log", optionalAuth, (req, res) => {
  const state = db.getState();
  const song = state.songs.find((s) => s.id === req.params.id);
  if (song) {
    song.downloadsCount = (song.downloadsCount || 0) + 1;
  }
  const format = String(req.body?.format || "MP3").toUpperCase();
  if (req.authUser) {
    const user = state.users.find((u) => u.id === req.authUser?.id);
    if (user) {
      if (!user.downloadsHistory) user.downloadsHistory = [];
      user.downloadsHistory.unshift({
        id: `dl-${Date.now()}`,
        songId: song?.id || req.params.id,
        title: song?.title || String(req.body?.title || "AI Track"),
        audioUrl: song?.audioUrl || String(req.body?.audioUrl || ""),
        format,
        downloadedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (user.downloadsHistory.length > 100) {
        user.downloadsHistory = user.downloadsHistory.slice(0, 100);
      }
    }
  }
  db.save();
  res.json({
    success: true,
    downloadsCount: song?.downloadsCount || 1
  });
});
app.post("/api/upload", (req, res) => {
  try {
    const { filename, mimeType, base64Data } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ success: false, error: "Thi\u1EBFu d\u1EEF li\u1EC7u file t\u1EA3i l\xEAn." });
    }
    const maxMb = db.getState().websiteConfig.maxUploadMb || 25;
    const rawBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(rawBase64, "base64");
    if (buffer.length > maxMb * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: `Dung l\u01B0\u1EE3ng file v\u01B0\u1EE3t qu\xE1 gi\u1EDBi h\u1EA1n ${maxMb}MB cho ph\xE9p.`
      });
    }
    const safeName = `${Date.now()}-${String(filename).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploadsDir = getUploadsDir();
    const targetPath = path2.join(uploadsDir, safeName);
    fs2.writeFileSync(targetPath, buffer);
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const publicBase = process.env.APP_URL || `${proto}://${host}`;
    const relativeUrl = `/api/uploads/${encodeURIComponent(safeName)}`;
    const fullUrl = `${publicBase.replace(/\/$/, "")}${relativeUrl}`;
    res.json({
      success: true,
      filename: safeName,
      mimeType: mimeType || "audio/mpeg",
      sizeBytes: buffer.length,
      relativeUrl,
      url: fullUrl
    });
  } catch (err) {
    res.status(500).json({ success: false, error: `L\u1ED7i t\u1EA3i file l\xEAn m\xE1y ch\u1EE7: ${err.message}` });
  }
});
app.get("/api/uploads/:filename", (req, res) => {
  const safeName = path2.basename(req.params.filename);
  const filePath = path2.join(getUploadsDir(), safeName);
  if (!fs2.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }
  if (safeName.endsWith(".wav")) res.setHeader("Content-Type", "audio/wav");
  else res.setHeader("Content-Type", "audio/mpeg");
  res.sendFile(filePath);
});
app.post("/api/music/generate", optionalAuth, async (req, res) => {
  try {
    const {
      title,
      lyrics,
      genre,
      promptStyle,
      vocalType,
      vocalLanguage,
      duration,
      bpm,
      versionCount,
      providerOverride
    } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: "T\xEAn b\xE0i h\xE1t kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    }
    const appBase = process.env.APP_URL && process.env.APP_URL.startsWith("https://") ? process.env.APP_URL.replace(/\/$/, "") : "";
    const callbackUrl = appBase ? `${appBase}/api/music/webhook/music/__TASK_ID__` : void 0;
    const task = await providerManager.createMusicTask({
      title,
      lyrics: lyrics || "",
      genre: genre || "Pop",
      promptStyle: promptStyle || genre,
      vocalType: vocalType || "male",
      vocalLanguage: vocalLanguage || "vi",
      duration: duration || 120,
      bpm: bpm || 120,
      versionCount: versionCount === 2 ? 2 : 1,
      providerOverride,
      callbackUrl,
      userId: req.authUser?.id,
      userName: req.authUser?.name
    });
    if (task.status === "failed") {
      return res.status(400).json({
        success: false,
        error: task.error,
        task
      });
    }
    res.json({
      success: true,
      task
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/music/tasks/:id", (req, res) => {
  const task = providerManager.getTask(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE1c v\u1EE5 t\u1EA1o nh\u1EA1c" });
  }
  res.json({ success: true, task });
});
app.post("/api/music/stems", optionalAuth, async (req, res) => {
  try {
    const { title, audioInputUrl } = req.body;
    if (!audioInputUrl) {
      return res.status(400).json({
        success: false,
        error: "Vui l\xF2ng t\u1EA3i l\xEAn file \xE2m thanh ho\u1EB7c nh\u1EADp URL \xE2m thanh \u0111\u1EC3 t\xE1ch vocal & instrumental."
      });
    }
    const task = await providerManager.createStemsTask({
      title: title || "T\xE1ch Vocal & Instrumental",
      audioInputUrl,
      userId: req.authUser?.id,
      userName: req.authUser?.name
    });
    if (task.status === "failed") {
      return res.status(400).json({
        success: false,
        error: task.error,
        task
      });
    }
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/music/webhook/:provider/:taskId", (req, res) => {
  try {
    const { taskId } = req.params;
    const handled = providerManager.handleWebhookCallback(taskId, req.body);
    res.json({ success: true, handled });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/cover/generate", optionalAuth, async (req, res) => {
  try {
    const {
      title,
      audioInputUrl,
      voiceModelId,
      similarity,
      pitchShift,
      volumeBalance,
      keepOriginalInst,
      separateVocals,
      genre,
      vocalType,
      providerOverride
    } = req.body;
    if (!audioInputUrl) {
      return res.status(400).json({
        success: false,
        error: "Vui l\xF2ng t\u1EA3i l\xEAn file \xE2m thanh ho\u1EB7c nh\u1EADp \u0111\u01B0\u1EDDng d\u1EABn b\xE0i h\xE1t g\u1ED1c h\u1EE3p l\u1EC7."
      });
    }
    const appBase = process.env.APP_URL && process.env.APP_URL.startsWith("https://") ? process.env.APP_URL.replace(/\/$/, "") : "";
    const callbackUrl = appBase ? `${appBase}/api/music/webhook/cover/__TASK_ID__` : void 0;
    const task = await providerManager.createCoverTask({
      title: title || "B\u1EA3n AI Cover M\u1EDBi",
      lyrics: "",
      genre: genre || "Pop",
      promptStyle: `AI Cover with ${voiceModelId}`,
      vocalType: vocalType || "female",
      voiceModelId: voiceModelId || "voice-sontung-ai",
      audioInputUrl,
      similarity: similarity ?? 85,
      pitchShift: pitchShift ?? 0,
      volumeBalance: volumeBalance ?? 70,
      keepOriginalInst: keepOriginalInst ?? true,
      separateVocals: separateVocals ?? true,
      providerOverride,
      callbackUrl,
      userId: req.authUser?.id,
      userName: req.authUser?.name
    });
    if (task.status === "failed") {
      return res.status(400).json({
        success: false,
        error: task.error,
        task
      });
    }
    res.json({
      success: true,
      task
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/cover/tasks/:id", (req, res) => {
  const task = providerManager.getTask(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y t\xE1c v\u1EE5 cover" });
  }
  res.json({ success: true, task });
});
app.get("/api/audio/download", async (req, res) => {
  const audioUrl = req.query.url;
  const filename = req.query.filename || "AIMusicStudio.mp3";
  if (!audioUrl) {
    return res.status(400).send("Missing audio url parameter");
  }
  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return res.status(audioRes.status).send("Failed to fetch audio stream");
    }
    const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    const arrayBuffer = await audioRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(500).send(`Error downloading audio: ${err.message}`);
  }
});
app.post("/api/ai/lyrics", async (req, res) => {
  try {
    const { prompt, genre = "Pop", mood = "Vui t\u01B0\u01A1i", language = "vi" } = req.body;
    if (!ai) {
      return res.status(400).json({
        success: false,
        isMissingKey: true,
        error: "Ch\u01B0a c\u1EA5u h\xECnh GEMINI_API_KEY tr\xEAn m\xE1y ch\u1EE7. H\xE3y th\xEAm GEMINI_API_KEY v\xE0o bi\u1EBFn m\xF4i tr\u01B0\u1EDDng (.env ho\u1EB7c Vercel Environment Variables) \u0111\u1EC3 s\u1EED d\u1EE5ng AI s\xE1ng t\xE1c l\u1EDDi th\u1EF1c t\u1EBF."
      });
    }
    const systemPrompt = `B\u1EA1n l\xE0 m\u1ED9t nh\u1EA1c s\u0129 chuy\xEAn nghi\u1EC7p h\xE0ng \u0111\u1EA7u s\xE1ng t\xE1c l\u1EDDi b\xE0i h\xE1t. 
H\xE3y vi\u1EBFt l\u1EDDi b\xE0i h\xE1t b\u1EB1ng ${language === "vi" ? "Ti\u1EBFng Vi\u1EC7t" : "Ti\u1EBFng Anh"} d\u1EF1a theo c\xE1c th\xF4ng tin:
- Ch\u1EE7 \u0111\u1EC1 / \xDD t\u01B0\u1EDFng: "${prompt || "T\xECnh y\xEAu v\xE0 cu\u1ED9c s\u1ED1ng hi\u1EC7n \u0111\u1EA1i"}"
- Th\u1EC3 lo\u1EA1i nh\u1EA1c: ${genre}
- C\u1EA3m x\xFAc: ${mood}

\u0110\u1ECBnh d\u1EA1ng tr\u1EA3 v\u1EC1 c\xF3 \u0111\u1EA7y \u0111\u1EE7 c\u1EA5u tr\xFAc chu\u1EA9n b\xE0i h\xE1t:
[Verse 1]
[Pre-Chorus]
[Chorus]
[Verse 2]
[Bridge]
[Outro]
Vi\u1EBFt v\u1EA7n \u0111i\u1EC7u chu\u1EA9n \xE2m nh\u1EA1c, t\u1EEB ng\u1EEF chau chu\u1ED1t, gi\xE0u h\xECnh \u1EA3nh v\xE0 gi\xE0u c\u1EA3m x\xFAc.`;
    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: systemPrompt
    });
    const lyricsText = response.text || "Kh\xF4ng th\u1EC3 t\u1EA1o l\u1EDDi b\xE0i h\xE1t.";
    res.json({
      success: true,
      lyrics: lyricsText,
      isDemoFallback: false
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("Error generating lyrics with Gemini:", errMessage);
    res.status(500).json({
      success: false,
      error: "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i Gemini API: " + errMessage
    });
  }
});
app.post("/api/ai/music-style", async (req, res) => {
  try {
    const { description, genre } = req.body;
    if (!ai) {
      return res.status(400).json({
        success: false,
        error: "Ch\u01B0a c\u1EA5u h\xECnh GEMINI_API_KEY \u1EDF backend."
      });
    }
    const prompt = `Ph\xE2n t\xEDch m\xF4 t\u1EA3 phong c\xE1ch \xE2m nh\u1EA1c: "${description}" cho th\u1EC3 lo\u1EA1i "${genre}". 
H\xE3y tr\u1EA3 v\u1EC1 g\u1EE3i \xFD t\u1ED1i \u01B0u prompt t\u1EA1o nh\u1EA1c, BPM khuy\u1EBFn ngh\u1ECB, v\xE0 danh s\xE1ch nh\u1EA1c c\u1EE5 ch\xEDnh ph\xF9 h\u1EE3p.`;
    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt
    });
    res.json({
      success: true,
      analysis: response.text
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
app.get("/api/admin/api-config", requireAdmin, (_req, res) => {
  res.json({
    success: true,
    config: providerManager.getConfig()
  });
});
app.post("/api/admin/api-config", requireAdmin, (req, res) => {
  try {
    const updated = providerManager.updateConfig(req.body);
    res.json({
      success: true,
      config: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/admin/providers/:id/toggle", requireAdmin, (req, res) => {
  try {
    const providerId = req.params.id;
    const enabled = Boolean(req.body?.enabled);
    const updated = providerManager.toggleProviderEnabled(providerId, enabled);
    res.json({
      success: true,
      config: updated
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
app.get("/api/admin/failed-tasks", requireAdmin, (_req, res) => {
  res.json({
    success: true,
    tasks: providerManager.getFailedTasks()
  });
});
app.post("/api/admin/test-connection", requireAdmin, async (req, res) => {
  try {
    const { provider, apiKey, baseUrl } = req.body;
    const result = await providerManager.testConnection(provider, apiKey, baseUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Test connection error: ${err.message}`
    });
  }
});
app.get("/api/admin/logs", requireAdmin, (_req, res) => {
  res.json({
    success: true,
    logs: providerManager.getLogs()
  });
});
app.get("/api/admin/stats", requireAdmin, (_req, res) => {
  const state = db.getState();
  const cfg = providerManager.getConfig();
  const totalDownloads = state.songs.reduce((acc, s) => acc + (s.downloadsCount || 0), 0);
  res.json({
    totalUsers: state.users.length,
    totalSongsGenerated: state.songs.length,
    totalCoversCreated: state.songs.filter((s) => s.isAiCover).length,
    totalDownloads,
    activeVoiceModels: 8,
    apiStatus: !cfg.enabled ? `${cfg.provider.toUpperCase()} Disabled` : cfg.isConfigured ? `Active (${cfg.provider.toUpperCase()} Connected)` : "Unconfigured API Key",
    apiUsage: state.apiUsage,
    storageUsedGb: 0.1
  });
});
app.get("/api/admin/users", requireAdmin, (_req, res) => {
  res.json({
    success: true,
    users: db.getState().users.map(sanitizeUser)
  });
});
app.post("/api/admin/users/:id/toggle-ban", requireAdmin, (req, res) => {
  const user = db.getState().users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y ng\u01B0\u1EDDi d\xF9ng." });
  }
  if (user.id === req.authUser?.id) {
    return res.status(400).json({ success: false, error: "Kh\xF4ng th\u1EC3 t\u1EF1 kh\xF3a t\xE0i kho\u1EA3n c\u1EE7a ch\xEDnh m\xECnh." });
  }
  user.isBanned = !user.isBanned;
  db.save();
  res.json({ success: true, user: sanitizeUser(user) });
});
app.get("/api/admin/ads", requireAdmin, (_req, res) => {
  res.json({
    success: true,
    ads: db.getState().ads
  });
});
app.post("/api/admin/ads", requireAdmin, (req, res) => {
  const { title, description, imageUrl, targetUrl, placement, isActive } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: "Ti\xEAu \u0111\u1EC1 qu\u1EA3ng c\xE1o kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng." });
  }
  const newAd = {
    id: `ad-${Date.now()}`,
    title: String(title),
    description: String(description || ""),
    imageUrl: imageUrl ? String(imageUrl) : void 0,
    targetUrl: String(targetUrl || "#"),
    placement: placement || "home_top",
    isActive: isActive !== false,
    clicksCount: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.getState().ads.unshift(newAd);
  db.save();
  res.json({ success: true, ad: newAd });
});
app.put("/api/admin/ads/:id", requireAdmin, (req, res) => {
  const ad = db.getState().ads.find((a) => a.id === req.params.id);
  if (!ad) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y qu\u1EA3ng c\xE1o." });
  }
  if (req.body.title !== void 0) ad.title = String(req.body.title);
  if (req.body.description !== void 0) ad.description = String(req.body.description);
  if (req.body.imageUrl !== void 0) ad.imageUrl = String(req.body.imageUrl);
  if (req.body.targetUrl !== void 0) ad.targetUrl = String(req.body.targetUrl);
  if (req.body.placement !== void 0) ad.placement = req.body.placement;
  if (req.body.isActive !== void 0) ad.isActive = Boolean(req.body.isActive);
  db.save();
  res.json({ success: true, ad });
});
app.delete("/api/admin/ads/:id", requireAdmin, (req, res) => {
  const state = db.getState();
  const idx = state.ads.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: "Kh\xF4ng t\xECm th\u1EA5y qu\u1EA3ng c\xE1o." });
  }
  state.ads.splice(idx, 1);
  db.save();
  res.json({ success: true });
});
app.get("/api/admin/site-config", requireAdmin, (_req, res) => {
  res.json({
    success: true,
    websiteConfig: db.getState().websiteConfig
  });
});
app.put("/api/admin/site-config", requireAdmin, (req, res) => {
  const cfg = db.getState().websiteConfig;
  Object.assign(cfg, req.body);
  db.save();
  res.json({
    success: true,
    websiteConfig: cfg
  });
});
app.use("/api/*", (_req, res) => {
  res.status(404).json({ success: false, error: "API endpoint not found" });
});
var app_default = app;

// server.ts
var PORT = process.env.PORT || 3e3;
async function startServer() {
  const runningBuiltBundle = process.argv[1]?.endsWith("server.js") || process.env.NODE_ENV === "production";
  const distExists = fs3.existsSync(path3.resolve("./dist/index.html"));
  const isDev = process.env.NODE_ENV === "development" || !runningBuiltBundle && !distExists;
  if (isDev) {
    const vite = await import("vite");
    const viteDevServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app_default.use(viteDevServer.middlewares);
    app_default.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        let template = fs3.readFileSync(path3.resolve("./index.html"), "utf-8");
        template = await viteDevServer.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        viteDevServer.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path3.resolve("./dist");
    app_default.use(express2.static(distPath));
    app_default.get("*", (_req, res) => {
      res.sendFile(path3.join(distPath, "index.html"));
    });
  }
  app_default.listen(PORT, () => {
    console.log(`AI MUSIC STUDIO Server listening on port ${PORT} (${isDev ? "DEV" : "PRODUCTION"})`);
  });
}
startServer();
