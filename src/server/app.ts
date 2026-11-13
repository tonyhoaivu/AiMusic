import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { providerManager } from './providers/manager.js';
import { db, hashPassword, verifyPassword, getUploadsDir } from './db.js';
import {
  signToken,
  optionalAuth,
  requireAuth,
  requireAdmin,
  AuthenticatedRequest,
} from './auth.js';
import { Song, AdBanner } from '../types/index.js';

dotenv.config();

const app = express();

app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// Server-side Gemini API client initialization
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

function sanitizeUser(u: any) {
  const { passwordHash, ...safe } = u;
  return safe;
}

// ==========================================
// HEALTH & PUBLIC SITE CONFIG
// ==========================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!ai,
    musicProviderConfigured: providerManager.getConfig().isConfigured,
    activeProvider: providerManager.getConfig().provider,
    serverless: !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    time: new Date().toISOString(),
  });
});

app.get('/api/music/provider-status', (_req: Request, res: Response) => {
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
    geminiConfigured: !!ai,
  });
});

app.get('/api/site/public', (_req: Request, res: Response) => {
  const state = db.getState();
  res.json({
    success: true,
    websiteConfig: state.websiteConfig,
    ads: state.websiteConfig.adsEnabled ? state.ads.filter((a) => a.isActive) : [],
  });
});

app.post('/api/ads/:id/click', (req: Request, res: Response) => {
  const ad = db.getState().ads.find((a) => a.id === req.params.id);
  if (ad) {
    ad.clicksCount += 1;
    db.save();
  }
  res.json({ success: true });
});

// ==========================================
// AUTHENTICATION & USER PROFILE
// ==========================================
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ Email và Mật khẩu.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const state = db.getState();

    if (state.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ success: false, error: 'Email này đã được đăng ký.' });
    }

    const newUser = {
      id: `user-${Date.now()}`,
      name: String(name || cleanEmail.split('@')[0]).trim(),
      email: cleanEmail,
      role: 'user' as const,
      avatar: '/images/album_cover_lofi_ballad_1794018467443.jpg',
      createdAt: new Date().toISOString(),
      savedSongsCount: 0,
      coversCount: 0,
      isBanned: false,
      downloadsHistory: [],
      passwordHash: hashPassword(String(password)),
    };

    state.users.push(newUser);
    db.save();

    const token = signToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
    });

    res.setHeader(
      'Set-Cookie',
      `aimusic_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}`
    );

    res.json({
      success: true,
      token,
      user: sanitizeUser(newUser),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập Email và Mật khẩu.' });
    }

    const cleanInput = String(email).trim().toLowerCase();
    const state = db.getState();

    // Support 'admin' alias for admin@aimusicstudio.com
    const targetUser = state.users.find(
      (u) =>
        u.email.toLowerCase() === cleanInput ||
        (cleanInput === 'admin' && u.role === 'admin')
    );

    if (!targetUser || !verifyPassword(String(password), targetUser.passwordHash)) {
      return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không chính xác.' });
    }

    if (targetUser.isBanned) {
      return res.status(403).json({ success: false, error: 'Tài khoản này đã bị Quản trị viên khóa.' });
    }

    const token = signToken({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      name: targetUser.name,
    });

    res.setHeader(
      'Set-Cookie',
      `aimusic_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 86400}`
    );

    res.json({
      success: true,
      token,
      user: sanitizeUser(targetUser),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.setHeader('Set-Cookie', 'aimusic_token=; Path=/; HttpOnly; Max-Age=0');
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getState().users.find((u) => u.id === req.authUser?.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
  }
  res.json({ success: true, user: sanitizeUser(user) });
});

app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getState().users.find((u) => u.id === req.authUser?.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
  }
  if (req.body.name) user.name = String(req.body.name).trim();
  if (req.body.avatar) user.avatar = String(req.body.avatar).trim();
  db.save();
  res.json({ success: true, user: sanitizeUser(user) });
});

app.post('/api/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.getState().users.find((u) => u.id === req.authUser?.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
  }
  if (!verifyPassword(String(currentPassword || ''), user.passwordHash)) {
    return res.status(400).json({ success: false, error: 'Mật khẩu hiện tại không đúng.' });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, error: 'Mật khẩu mới phải từ 6 ký tự trở lên.' });
  }
  user.passwordHash = hashPassword(String(newPassword));
  db.save();
  res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập email.' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const user = db.getState().users.find((u) => u.email.toLowerCase() === cleanEmail);
  // Always return a safe response
  res.json({
    success: true,
    message: user
      ? 'Hướng dẫn khôi phục mật khẩu đã được ghi nhận. Nếu cần đặt lại khẩn cấp trên hosting riêng, vui lòng liên hệ Quản trị viên.'
      : 'Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn khôi phục.',
  });
});

// ==========================================
// SONGS LIBRARY & CRUD
// ==========================================
app.get('/api/songs', (_req: Request, res: Response) => {
  res.json({
    success: true,
    songs: db.getState().songs,
  });
});

app.get('/api/songs/:id', (req: Request, res: Response) => {
  const song = db.getState().songs.find((s) => s.id === req.params.id);
  if (!song) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy bài hát.' });
  }
  res.json({ success: true, song });
});

app.post('/api/songs/:id/play', (req: Request, res: Response) => {
  const song = db.getState().songs.find((s) => s.id === req.params.id);
  if (song) {
    song.playsCount += 1;
    db.save();
  }
  res.json({ success: true, playsCount: song?.playsCount || 0 });
});

app.patch('/api/songs/:id', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const song = db.getState().songs.find((s) => s.id === req.params.id);
  if (!song) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy bài hát.' });
  }
  if (typeof req.body.title === 'string' && req.body.title.trim()) {
    song.title = req.body.title.trim();
  }
  if (typeof req.body.isFavorite === 'boolean') {
    song.isFavorite = req.body.isFavorite;
  }
  db.save();
  res.json({ success: true, song });
});

app.delete('/api/songs/:id', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const state = db.getState();
  const idx = state.songs.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy bài hát.' });
  }
  state.songs.splice(idx, 1);
  db.save();
  res.json({ success: true });
});

app.post('/api/songs/:id/download-log', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const state = db.getState();
  const song = state.songs.find((s) => s.id === req.params.id);
  if (song) {
    song.downloadsCount = (song.downloadsCount || 0) + 1;
  }

  const format = String(req.body?.format || 'MP3').toUpperCase();
  if (req.authUser) {
    const user = state.users.find((u) => u.id === req.authUser?.id);
    if (user) {
      if (!user.downloadsHistory) user.downloadsHistory = [];
      user.downloadsHistory.unshift({
        id: `dl-${Date.now()}`,
        songId: song?.id || req.params.id,
        title: song?.title || String(req.body?.title || 'AI Track'),
        audioUrl: song?.audioUrl || String(req.body?.audioUrl || ''),
        format,
        downloadedAt: new Date().toISOString(),
      });
      if (user.downloadsHistory.length > 100) {
        user.downloadsHistory = user.downloadsHistory.slice(0, 100);
      }
    }
  }
  db.save();
  res.json({
    success: true,
    downloadsCount: song?.downloadsCount || 1,
  });
});

// ==========================================
// REAL AUDIO FILE UPLOAD & SERVING
// ==========================================
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { filename, mimeType, base64Data } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu file tải lên.' });
    }

    const maxMb = db.getState().websiteConfig.maxUploadMb || 25;
    const rawBase64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(rawBase64, 'base64');

    if (buffer.length > maxMb * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: `Dung lượng file vượt quá giới hạn ${maxMb}MB cho phép.`,
      });
    }

    const safeName = `${Date.now()}-${String(filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const uploadsDir = getUploadsDir();
    const targetPath = path.join(uploadsDir, safeName);
    fs.writeFileSync(targetPath, buffer);

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const publicBase = process.env.APP_URL || `${proto}://${host}`;
    const relativeUrl = `/api/uploads/${encodeURIComponent(safeName)}`;
    const fullUrl = `${publicBase.replace(/\/$/, '')}${relativeUrl}`;

    res.json({
      success: true,
      filename: safeName,
      mimeType: mimeType || 'audio/mpeg',
      sizeBytes: buffer.length,
      relativeUrl,
      url: fullUrl,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: `Lỗi tải file lên máy chủ: ${err.message}` });
  }
});

app.get('/api/uploads/:filename', (req: Request, res: Response) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(getUploadsDir(), safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  if (safeName.endsWith('.wav')) res.setHeader('Content-Type', 'audio/wav');
  else res.setHeader('Content-Type', 'audio/mpeg');
  res.sendFile(filePath);
});

// ==========================================
// REAL AI MUSIC GENERATION & AI COVER
// ==========================================
app.post('/api/music/generate', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
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
      providerOverride,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Tên bài hát không được để trống' });
    }

    const appBase = process.env.APP_URL && process.env.APP_URL.startsWith('https://')
      ? process.env.APP_URL.replace(/\/$/, '')
      : '';
    const callbackUrl = appBase ? `${appBase}/api/music/webhook/music/__TASK_ID__` : undefined;

    const task = await providerManager.createMusicTask({
      title,
      lyrics: lyrics || '',
      genre: genre || 'Pop',
      promptStyle: promptStyle || genre,
      vocalType: vocalType || 'male',
      vocalLanguage: vocalLanguage || 'vi',
      duration: duration || 120,
      bpm: bpm || 120,
      versionCount: versionCount === 2 ? 2 : 1,
      providerOverride,
      callbackUrl,
      userId: req.authUser?.id,
      userName: req.authUser?.name,
    });

    if (task.status === 'failed') {
      return res.status(400).json({
        success: false,
        error: task.error,
        task,
      });
    }

    res.json({
      success: true,
      task,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/music/tasks/:id', (req: Request, res: Response) => {
  const task = providerManager.getTask(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy tác vụ tạo nhạc' });
  }
  res.json({ success: true, task });
});

app.post('/api/music/stems', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, audioInputUrl } = req.body;
    if (!audioInputUrl) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng tải lên file âm thanh hoặc nhập URL âm thanh để tách vocal & instrumental.',
      });
    }

    const task = await providerManager.createStemsTask({
      title: title || 'Tách Vocal & Instrumental',
      audioInputUrl,
      userId: req.authUser?.id,
      userName: req.authUser?.name,
    });

    if (task.status === 'failed') {
      return res.status(400).json({
        success: false,
        error: task.error,
        task,
      });
    }

    res.json({ success: true, task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/music/webhook/:provider/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const handled = providerManager.handleWebhookCallback(taskId, req.body);
    res.json({ success: true, handled });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/cover/generate', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
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
      providerOverride,
    } = req.body;

    if (!audioInputUrl) {
      return res.status(400).json({
        success: false,
        error: 'Vui lòng tải lên file âm thanh hoặc nhập đường dẫn bài hát gốc hợp lệ.',
      });
    }

    const appBase = process.env.APP_URL && process.env.APP_URL.startsWith('https://')
      ? process.env.APP_URL.replace(/\/$/, '')
      : '';
    const callbackUrl = appBase ? `${appBase}/api/music/webhook/cover/__TASK_ID__` : undefined;

    const task = await providerManager.createCoverTask({
      title: title || 'Bản AI Cover Mới',
      lyrics: '',
      genre: genre || 'Pop',
      promptStyle: `AI Cover with ${voiceModelId}`,
      vocalType: vocalType || 'female',
      voiceModelId: voiceModelId || 'voice-sontung-ai',
      audioInputUrl,
      similarity: similarity ?? 85,
      pitchShift: pitchShift ?? 0,
      volumeBalance: volumeBalance ?? 70,
      keepOriginalInst: keepOriginalInst ?? true,
      separateVocals: separateVocals ?? true,
      providerOverride,
      callbackUrl,
      userId: req.authUser?.id,
      userName: req.authUser?.name,
    });

    if (task.status === 'failed') {
      return res.status(400).json({
        success: false,
        error: task.error,
        task,
      });
    }

    res.json({
      success: true,
      task,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/cover/tasks/:id', (req: Request, res: Response) => {
  const task = providerManager.getTask(req.params.id);
  if (!task) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy tác vụ cover' });
  }
  res.json({ success: true, task });
});

// Audio Download Proxy Endpoint
app.get('/api/audio/download', async (req: Request, res: Response) => {
  const audioUrl = req.query.url as string;
  const filename = (req.query.filename as string) || 'AIMusicStudio.mp3';

  if (!audioUrl) {
    return res.status(400).send('Missing audio url parameter');
  }

  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      return res.status(audioRes.status).send('Failed to fetch audio stream');
    }

    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

    const arrayBuffer = await audioRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).send(`Error downloading audio: ${err.message}`);
  }
});

// ==========================================
// GEMINI AI LYRICS & STYLE ANALYSIS
// ==========================================
app.post('/api/ai/lyrics', async (req: Request, res: Response) => {
  try {
    const { prompt, genre = 'Pop', mood = 'Vui tươi', language = 'vi' } = req.body;

    if (!ai) {
      return res.status(400).json({
        success: false,
        isMissingKey: true,
        error:
          'Chưa cấu hình GEMINI_API_KEY trên máy chủ. Hãy thêm GEMINI_API_KEY vào biến môi trường (.env hoặc Vercel Environment Variables) để sử dụng AI sáng tác lời thực tế.',
      });
    }

    const systemPrompt = `Bạn là một nhạc sĩ chuyên nghiệp hàng đầu sáng tác lời bài hát. 
Hãy viết lời bài hát bằng ${language === 'vi' ? 'Tiếng Việt' : 'Tiếng Anh'} dựa theo các thông tin:
- Chủ đề / Ý tưởng: "${prompt || 'Tình yêu và cuộc sống hiện đại'}"
- Thể loại nhạc: ${genre}
- Cảm xúc: ${mood}

Định dạng trả về có đầy đủ cấu trúc chuẩn bài hát:
[Verse 1]
[Pre-Chorus]
[Chorus]
[Verse 2]
[Bridge]
[Outro]
Viết vần điệu chuẩn âm nhạc, từ ngữ chau chuốt, giàu hình ảnh và giàu cảm xúc.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: systemPrompt,
    });

    const lyricsText = response.text || 'Không thể tạo lời bài hát.';
    res.json({
      success: true,
      lyrics: lyricsText,
      isDemoFallback: false,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error('Error generating lyrics with Gemini:', errMessage);
    res.status(500).json({
      success: false,
      error: 'Không thể kết nối Gemini API: ' + errMessage,
    });
  }
});

app.post('/api/ai/music-style', async (req: Request, res: Response) => {
  try {
    const { description, genre } = req.body;
    if (!ai) {
      return res.status(400).json({
        success: false,
        error: 'Chưa cấu hình GEMINI_API_KEY ở backend.',
      });
    }

    const prompt = `Phân tích mô tả phong cách âm nhạc: "${description}" cho thể loại "${genre}". 
Hãy trả về gợi ý tối ưu prompt tạo nhạc, BPM khuyến nghị, và danh sách nhạc cụ chính phù hợp.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
    });

    res.json({
      success: true,
      analysis: response.text,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ==========================================
// ADMIN PROTECTED ENDPOINTS (SERVER-SIDE RBAC)
// ==========================================
app.get('/api/admin/api-config', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    config: providerManager.getConfig(),
  });
});

app.post('/api/admin/api-config', requireAdmin, (req: Request, res: Response) => {
  try {
    const updated = providerManager.updateConfig(req.body);
    res.json({
      success: true,
      config: updated,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/providers/:id/toggle', requireAdmin, (req: Request, res: Response) => {
  try {
    const providerId = req.params.id as any;
    const enabled = Boolean(req.body?.enabled);
    const updated = providerManager.toggleProviderEnabled(providerId, enabled);
    res.json({
      success: true,
      config: updated,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/failed-tasks', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    tasks: providerManager.getFailedTasks(),
  });
});

app.post('/api/admin/test-connection', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, baseUrl } = req.body;
    const result = await providerManager.testConnection(provider, apiKey, baseUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: `Test connection error: ${err.message}`,
    });
  }
});

app.get('/api/admin/logs', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    logs: providerManager.getLogs(),
  });
});

app.get('/api/admin/stats', requireAdmin, (_req: Request, res: Response) => {
  const state = db.getState();
  const cfg = providerManager.getConfig();
  const totalDownloads = state.songs.reduce((acc, s) => acc + (s.downloadsCount || 0), 0);
  res.json({
    totalUsers: state.users.length,
    totalSongsGenerated: state.songs.length,
    totalCoversCreated: state.songs.filter((s) => s.isAiCover).length,
    totalDownloads,
    activeVoiceModels: 8,
    apiStatus: !cfg.enabled
      ? `${cfg.provider.toUpperCase()} Disabled`
      : cfg.isConfigured
      ? `Active (${cfg.provider.toUpperCase()} Connected)`
      : 'Unconfigured API Key',
    apiUsage: state.apiUsage,
    storageUsedGb: 0.1,
  });
});

app.get('/api/admin/users', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    users: db.getState().users.map(sanitizeUser),
  });
});

app.post('/api/admin/users/:id/toggle-ban', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getState().users.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy người dùng.' });
  }
  if (user.id === req.authUser?.id) {
    return res.status(400).json({ success: false, error: 'Không thể tự khóa tài khoản của chính mình.' });
  }
  user.isBanned = !user.isBanned;
  db.save();
  res.json({ success: true, user: sanitizeUser(user) });
});

app.get('/api/admin/ads', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    ads: db.getState().ads,
  });
});

app.post('/api/admin/ads', requireAdmin, (req: Request, res: Response) => {
  const { title, description, imageUrl, targetUrl, placement, isActive } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: 'Tiêu đề quảng cáo không được để trống.' });
  }
  const newAd: AdBanner = {
    id: `ad-${Date.now()}`,
    title: String(title),
    description: String(description || ''),
    imageUrl: imageUrl ? String(imageUrl) : undefined,
    targetUrl: String(targetUrl || '#'),
    placement: placement || 'home_top',
    isActive: isActive !== false,
    clicksCount: 0,
    createdAt: new Date().toISOString(),
  };
  db.getState().ads.unshift(newAd);
  db.save();
  res.json({ success: true, ad: newAd });
});

app.put('/api/admin/ads/:id', requireAdmin, (req: Request, res: Response) => {
  const ad = db.getState().ads.find((a) => a.id === req.params.id);
  if (!ad) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy quảng cáo.' });
  }
  if (req.body.title !== undefined) ad.title = String(req.body.title);
  if (req.body.description !== undefined) ad.description = String(req.body.description);
  if (req.body.imageUrl !== undefined) ad.imageUrl = String(req.body.imageUrl);
  if (req.body.targetUrl !== undefined) ad.targetUrl = String(req.body.targetUrl);
  if (req.body.placement !== undefined) ad.placement = req.body.placement;
  if (req.body.isActive !== undefined) ad.isActive = Boolean(req.body.isActive);
  db.save();
  res.json({ success: true, ad });
});

app.delete('/api/admin/ads/:id', requireAdmin, (req: Request, res: Response) => {
  const state = db.getState();
  const idx = state.ads.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy quảng cáo.' });
  }
  state.ads.splice(idx, 1);
  db.save();
  res.json({ success: true });
});

app.get('/api/admin/site-config', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    success: true,
    websiteConfig: db.getState().websiteConfig,
  });
});

app.put('/api/admin/site-config', requireAdmin, (req: Request, res: Response) => {
  const cfg = db.getState().websiteConfig;
  Object.assign(cfg, req.body);
  db.save();
  res.json({
    success: true,
    websiteConfig: cfg,
  });
});

// Note: Also provide non-admin read-only fallback status if needed, or return 404 on unknown /api/*
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

export default app;
