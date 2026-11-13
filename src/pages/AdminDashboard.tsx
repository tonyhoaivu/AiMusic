import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Music,
  Mic2,
  Key,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  Activity,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  Terminal,
  Megaphone,
  Globe,
  Plus,
  LogIn,
  Power,
  XCircle,
} from 'lucide-react';
import {
  Song,
  User,
  VoiceModel,
  Language,
  AIProviderId,
  ProviderConfig,
  TaskLog,
  AdBanner,
  WebsiteConfig,
  ApiUsageSummary,
  MusicGenerationTask,
} from '../types';
import { translations } from '../utils/translations';
import {
  requestAdminStats,
  getAdminApiConfig,
  updateAdminApiConfig,
  toggleAdminProvider,
  fetchAdminFailedTasks,
  testAdminConnection,
  getAdminLogs,
  fetchAdminUsers,
  toggleBanAdminUser,
  fetchAdminAds,
  createAdminAd,
  updateAdminAd,
  deleteAdminAd,
  fetchAdminSiteConfig,
  updateAdminSiteConfig,
} from '../services/api';

interface AdminDashboardProps {
  currentUser: User | null;
  songs: Song[];
  voiceModels: VoiceModel[];
  onDeleteSong: (id: string) => void;
  onOpenAuth: () => void;
  onSiteConfigUpdated: () => void;
  lang: Language;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  songs,
  voiceModels,
  onDeleteSong,
  onOpenAuth,
  onSiteConfigUpdated,
  lang,
}) => {
  const t = translations[lang].admin;

  const [activeTab, setActiveTab] = useState<
    'api' | 'failed' | 'ads' | 'site' | 'users' | 'songs' | 'logs' | 'covers'
  >('api');

  const [stats, setStats] = useState<{
    totalUsers: number;
    totalSongsGenerated: number;
    totalCoversCreated: number;
    totalDownloads?: number;
    activeVoiceModels: number;
    apiStatus: string;
    apiUsage?: ApiUsageSummary;
    storageUsedGb: number;
  }>({
    totalUsers: 0,
    totalSongsGenerated: songs.length,
    totalCoversCreated: songs.filter((s) => s.isAiCover).length,
    totalDownloads: 0,
    activeVoiceModels: voiceModels.length,
    apiStatus: 'Checking...',
    storageUsedGb: 0,
  });

  // API Config State
  const [apiConfig, setApiConfig] = useState<ProviderConfig | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>('suno');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [baseUrlInput, setBaseUrlInput] = useState<string>('https://api.sunoapi.org');
  const [modelInput, setModelInput] = useState<string>('V3_5');

  // Connection Test State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    statusCode?: number;
  } | null>(null);

  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [failedTasks, setFailedTasks] = useState<MusicGenerationTask[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [adsList, setAdsList] = useState<AdBanner[]>([]);
  const [siteConfig, setSiteConfig] = useState<WebsiteConfig | null>(null);

  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdDesc, setNewAdDesc] = useState('');
  const [newAdTarget, setNewAdTarget] = useState('#create');
  const [newAdImage, setNewAdImage] = useState('/images/hero_studio_banner_1794018467147.jpg');

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (currentUser?.role !== 'admin') return;

    const [st, cfg, l, ft, u, adRes, sc] = await Promise.all([
      requestAdminStats(),
      getAdminApiConfig(),
      getAdminLogs(),
      fetchAdminFailedTasks(),
      fetchAdminUsers(),
      fetchAdminAds(),
      fetchAdminSiteConfig(),
    ]);

    if (st) setStats(st);
    if (cfg) {
      setApiConfig(cfg);
      setSelectedProvider(cfg.provider);
      setBaseUrlInput(cfg.baseUrl);
      setModelInput(cfg.model);
    }
    setLogs(l);
    setFailedTasks(ft);
    setUsersList(u);
    setAdsList(adRes);
    if (sc) setSiteConfig(sc);
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id, currentUser?.role]);

  const handleProviderChange = (newProvider: AIProviderId) => {
    setSelectedProvider(newProvider);
    const item = apiConfig?.providers?.[newProvider];
    if (item) {
      setBaseUrlInput(item.baseUrl);
      setModelInput(item.model);
    } else if (newProvider === 'suno') {
      setBaseUrlInput('https://api.sunoapi.org');
      setModelInput('V3_5');
    } else if (newProvider === 'replicate') {
      setBaseUrlInput('https://api.replicate.com/v1');
      setModelInput('meta/musicgen');
    } else if (newProvider === 'minimax') {
      setBaseUrlInput('https://api.minimax.chat/v1');
      setModelInput('music-01');
    } else if (newProvider === 'fal') {
      setBaseUrlInput('https://queue.fal.run');
      setModelInput('fal-ai/stable-audio');
    }
    setTestResult(null);
  };

  const handleToggleProvider = async (providerId: AIProviderId, nextEnabled: boolean) => {
    const res = await toggleAdminProvider(providerId, nextEnabled);
    if (res.success && res.config) {
      setApiConfig(res.config);
      setSaveMessage(
        `Đã ${nextEnabled ? 'BẬT' : 'TẮT'} nhà cung cấp ${providerId.toUpperCase()}.`
      );
      loadData();
    } else {
      alert(res.error || 'Không thể cập nhật trạng thái nhà cung cấp.');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setSaveMessage(null);

    try {
      const res = await updateAdminApiConfig({
        provider: selectedProvider,
        apiKey: apiKeyInput ? apiKeyInput : undefined,
        baseUrl: baseUrlInput,
        model: modelInput,
      });

      if (res.success) {
        setApiConfig(res.config);
        setApiKeyInput('');
        setSaveMessage('Đã lưu cấu hình API thành công!');
        loadData();
      } else {
        alert(res.error || 'Không thể lưu cấu hình API.');
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu cấu hình: ${err.message}`);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAdminConnection(
        selectedProvider,
        apiKeyInput || undefined,
        baseUrlInput || undefined
      );
      setTestResult(res);
      loadData();
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: `Lỗi kết nối: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleBan = async (userId: string) => {
    const res = await toggleBanAdminUser(userId);
    if (res.success) {
      setUsersList((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
    } else {
      alert(res.error || 'Không thể thay đổi trạng thái người dùng.');
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim()) return;
    const res = await createAdminAd({
      title: newAdTitle.trim(),
      description: newAdDesc.trim(),
      targetUrl: newAdTarget.trim(),
      imageUrl: newAdImage.trim() || undefined,
      placement: 'home_top',
      isActive: true,
    });
    if (res.success && res.ad) {
      setAdsList((prev) => [res.ad, ...prev]);
      setNewAdTitle('');
      setNewAdDesc('');
      onSiteConfigUpdated();
    }
  };

  const handleToggleAd = async (ad: AdBanner) => {
    const res = await updateAdminAd(ad.id, { isActive: !ad.isActive });
    if (res.success && res.ad) {
      setAdsList((prev) => prev.map((a) => (a.id === ad.id ? res.ad : a)));
      onSiteConfigUpdated();
    }
  };

  const handleDeleteAd = async (id: string) => {
    const res = await deleteAdminAd(id);
    if (res.success) {
      setAdsList((prev) => prev.filter((a) => a.id !== id));
      onSiteConfigUpdated();
    }
  };

  const handleSaveSiteConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteConfig) return;
    const res = await updateAdminSiteConfig(siteConfig);
    if (res.success) {
      setSiteConfig(res.websiteConfig);
      onSiteConfigUpdated();
      alert('Đã lưu cấu hình website thành công!');
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-amber-300 dark:border-amber-500/40 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="font-outfit font-extrabold text-2xl text-slate-900 dark:text-white">
          Truy Cập Bị Hạn Chế (Yêu cầu Admin)
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Trang quản trị này được bảo vệ bởi phân quyền máy chủ (RBAC). Vui lòng đăng nhập bằng tài khoản Quản Trị Viên để cấu hình API, quảng cáo và thành viên.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng Nhập Admin Ngay</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-purple-900/30 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-outfit font-extrabold text-2xl md:text-3xl text-slate-900 dark:text-white">
              {t.title}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
              Quản lý API tạo nhạc thật, chi phí, quảng cáo, cấu hình website và thành viên
            </p>
          </div>
        </div>

        <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-purple-900/40 rounded-2xl text-xs font-semibold gap-1">
          {[
            { id: 'api', label: 'AI Music API' },
            { id: 'failed', label: `Lỗi tạo nhạc (${failedTasks.length})` },
            { id: 'ads', label: `Quảng cáo (${adsList.length})` },
            { id: 'site', label: 'Cấu hình Web' },
            { id: 'users', label: `Thành viên (${usersList.length})` },
            { id: 'songs', label: `Bài hát (${songs.length})` },
            { id: 'logs', label: `Nhật ký (${logs.length})` },
            { id: 'covers', label: 'Giọng Cover' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.totalUsers}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.totalUsers}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.totalSongsGenerated}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.totalSongs}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-3 rounded-xl bg-pink-100 dark:bg-pink-600/20 text-pink-600 dark:text-pink-400">
            <Mic2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {stats.totalCoversCreated}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.totalCovers}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              ${(stats.apiUsage?.estimatedCostUsd || 0).toFixed(2)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chi phí API ({stats.apiUsage?.totalRequests || 0} req)
            </p>
          </div>
        </div>
      </div>

      {/* Tab: API Management */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          {apiConfig?.isServerless && (
            <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-500/40 text-xs text-cyan-900 dark:text-cyan-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Đang chạy trên môi trường Serverless (Vercel / Lambda)</p>
                <p className="opacity-90 mt-0.5">
                  Để API Key được lưu vĩnh viễn sau mỗi lần Serverless khởi động lại (cold start), hãy thêm các biến{' '}
                  <code>SUNO_API_KEY</code>, <code>REPLICATE_API_TOKEN</code>, <code>MINIMAX_API_KEY</code>, <code>FAL_KEY</code>,{' '}
                  <code>GEMINI_API_KEY</code> và <code>SESSION_SECRET</code> vào Vercel Environment Variables.
                </p>
              </div>
            </div>
          )}

          {/* Per-Provider Enable/Disable Switchboard */}
          {apiConfig?.providers && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="font-outfit font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Power className="w-5 h-5 text-emerald-500" />
                <span>Bật / Tắt Từng Nhà Cung Cấp AI (Provider Switchboard)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(apiConfig.providers).map((prov) => {
                  const isActiveDefault = apiConfig.provider === prov.id;
                  return (
                    <div
                      key={prov.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                        isActiveDefault
                          ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-500'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-purple-900/30'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {prov.name}
                          </span>
                          {isActiveDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">
                              Mặc định
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {prov.capabilities.notes}
                        </p>
                        <div className="text-[10px] font-mono pt-1 flex flex-wrap gap-2">
                          <span
                            className={
                              prov.isConfigured
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }
                          >
                            {prov.isConfigured ? `Key: ${prov.apiKeyMasked || 'OK'}` : 'Chưa nhập Key'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-purple-900/20">
                        <button
                          type="button"
                          onClick={() => handleToggleProvider(prov.id, !prov.enabled)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                            prov.enabled
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{prov.enabled ? 'Đang Bật' : 'Đã Tắt'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleProviderChange(prov.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-[11px] font-semibold transition-colors"
                        >
                          Cấu hình / Chọn
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-purple-900/30 pb-4">
              <div className="flex items-center gap-3">
                <Key className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white">
                    Cấu Hình Nhà Cung Cấp AI Music & AI Cover Thực Tế
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hỗ trợ Suno, Replicate MusicGen/RVC, MiniMax và FAL.ai. Bảo mật tuyệt đối ở Backend.
                  </p>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                  apiConfig?.isConfigured
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiConfig?.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
                <span>{apiConfig?.isConfigured ? 'Đã kích hoạt API' : 'Chưa nhập API Key'}</span>
              </div>
            </div>

            {saveMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                    1. Nhà Cung Cấp AI Music (API Provider)
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={(e) => handleProviderChange(e.target.value as AIProviderId)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="suno">Suno API (Suno v3.5 - Lời + Giọng Hát Full Track)</option>
                    <option value="replicate">Replicate (Meta MusicGen & Demucs / RVC AI Cover)</option>
                    <option value="minimax">MiniMax Music-01 (Tạo Nhạc & Giọng Ca Sĩ Trực Tiếp)</option>
                    <option value="fal">FAL.ai (Stable Audio Queue)</option>
                    <option value="custom">Custom Webhook / Self-Hosted Music Server</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                    2. AI Model Version
                  </label>
                  <input
                    type="text"
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                    3. API Key / Secret Token
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={
                      apiConfig?.apiKeyMasked
                        ? `Hiện tại: ${apiConfig.apiKeyMasked}`
                        : 'Dán API Key tại đây (sk-...)'
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2">
                    4. API Endpoint / Base URL
                  </label>
                  <input
                    type="text"
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-purple-900/20">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  {isTesting ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                  ) : (
                    <Activity className="w-4 h-4 text-cyan-500" />
                  )}
                  <span>{isTesting ? 'Đang kiểm tra kết nối...' : 'Kiểm tra API (Test Connection)'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingConfig ? 'Đang lưu...' : 'Lưu Cấu Hình API'}</span>
                </button>
              </div>
            </form>

            {testResult && (
              <div
                className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-500/50 text-rose-800 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    )}
                    <span>{testResult.success ? 'Kết nối thành công!' : 'Kết nối thất bại'}</span>
                  </span>
                  <span className="font-mono text-[11px]">{testResult.latencyMs}ms</span>
                </div>
                <p className="font-mono text-[11px]">{testResult.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Failed Music Generation Tasks */}
      {activeTab === 'failed' && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-500" />
              <span>Theo Dõi Lỗi Tạo Nhạc & AI Cover ({failedTasks.length})</span>
            </h3>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>

          {failedTasks.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">
              Chưa ghi nhận lỗi tạo nhạc hoặc lỗi kết nối API nào.
            </p>
          ) : (
            <div className="space-y-3">
              {failedTasks.map((ft) => (
                <div
                  key={ft.id}
                  className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold uppercase">
                        {ft.type}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-xs font-mono font-bold">
                        {ft.provider.toUpperCase()}
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {ft.title}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {new Date(ft.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold">
                    Nguyên nhân: {ft.error || 'Lỗi không xác định'}
                  </p>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Task ID: {ft.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Ads & Google AdSense */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateAd}
            className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm"
          >
            <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-purple-500" />
              <span>Thêm Quảng Cáo Mới Trên Trang Chủ</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                required
                value={newAdTitle}
                onChange={(e) => setNewAdTitle(e.target.value)}
                placeholder="Tiêu đề banner quảng cáo..."
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newAdTarget}
                onChange={(e) => setNewAdTarget(e.target.value)}
                placeholder="Link đích (VD: #create hoặc https://...)"
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newAdDesc}
                onChange={(e) => setNewAdDesc(e.target.value)}
                placeholder="Mô tả ngắn hiển thị trên banner..."
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={newAdImage}
                onChange={(e) => setNewAdImage(e.target.value)}
                placeholder="Đường dẫn ảnh (/images/...)"
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Quảng Cáo</span>
            </button>
          </form>

          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white">
              Danh Sách Banner Quảng Cáo ({adsList.length})
            </h3>
            <div className="space-y-3">
              {adsList.map((ad) => (
                <div
                  key={ad.id}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {ad.imageUrl && (
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {ad.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {ad.description}
                      </p>
                      <span className="text-[11px] font-mono text-purple-600 dark:text-cyan-400">
                        Clicks: {ad.clicksCount} • Target: {ad.targetUrl}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleAd(ad)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        ad.isActive
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {ad.isActive ? 'Đang bật' : 'Đang tắt'}
                    </button>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Website Config */}
      {activeTab === 'site' && siteConfig && (
        <form
          onSubmit={handleSaveSiteConfig}
          className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-5 shadow-sm"
        >
          <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-500" />
            <span>Cấu Hình Website & Google AdSense</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Tên Website
              </label>
              <input
                type="text"
                value={siteConfig.siteName}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Tagline
              </label>
              <input
                type="text"
                value={siteConfig.siteTagline}
                onChange={(e) => setSiteConfig({ ...siteConfig, siteTagline: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Thông báo đầu trang (Announcement Banner)
              </label>
              <input
                type="text"
                value={siteConfig.announcementText}
                onChange={(e) =>
                  setSiteConfig({ ...siteConfig, announcementText: e.target.value })
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Google AdSense Publisher ID (ca-pub-...)
              </label>
              <input
                type="text"
                value={siteConfig.adsenseClientId}
                onChange={(e) =>
                  setSiteConfig({ ...siteConfig, adsenseClientId: e.target.value })
                }
                placeholder="ca-pub-xxxxxxxxxxxxxxxx"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Google AdSense Slot ID
              </label>
              <input
                type="text"
                value={siteConfig.adsenseSlotId}
                onChange={(e) => setSiteConfig({ ...siteConfig, adsenseSlotId: e.target.value })}
                placeholder="1234567890"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                Giới hạn dung lượng upload (MB)
              </label>
              <input
                type="number"
                value={siteConfig.maxUploadMb}
                onChange={(e) =>
                  setSiteConfig({ ...siteConfig, maxUploadMb: Number(e.target.value) || 25 })
                }
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col justify-center gap-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteConfig.showAnnouncement}
                  onChange={(e) =>
                    setSiteConfig({ ...siteConfig, showAnnouncement: e.target.checked })
                  }
                />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Hiển thị thanh thông báo đầu trang
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteConfig.adsEnabled}
                  onChange={(e) => setSiteConfig({ ...siteConfig, adsEnabled: e.target.checked })}
                />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  Bật hệ thống Quảng cáo & AdSense
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs"
          >
            Lưu Cấu Hình Website
          </button>
        </form>
      )}

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-500" />
              <span>Nhật Ký Xử Lý API Thời Gian Thực</span>
            </h3>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>

          <div className="bg-slate-950 rounded-2xl p-4 border border-purple-900/40 max-h-96 overflow-y-auto space-y-2 font-mono text-xs">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 py-1 border-b border-purple-900/20 text-[11px]"
                >
                  <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] shrink-0 ${
                      log.level === 'success'
                        ? 'bg-emerald-950 text-emerald-300'
                        : log.level === 'error'
                        ? 'bg-rose-950 text-rose-300'
                        : 'bg-slate-800 text-cyan-300'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-slate-400 shrink-0 font-bold">[{log.provider}]</span>
                  <span className="text-slate-200 leading-relaxed break-all">{log.message}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">Chưa có nhật ký tác vụ nào.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <span>Danh Sách Thành Viên ({usersList.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-bold uppercase border-b border-slate-200 dark:border-purple-900/30">
                <tr>
                  <th className="p-3">Thành viên</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Quyền hạn</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-purple-900/20">
                {usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20">
                    <td className="p-3 flex items-center gap-2.5">
                      <img
                        src={user.avatar || '/images/album_cover_lofi_ballad_1794018467443.jpg'}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {user.name}
                      </span>
                    </td>
                    <td className="p-3 font-mono">{user.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-purple-700 dark:text-purple-300 font-semibold uppercase">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {user.isBanned ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold">
                          Đã bị khóa
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                          Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => handleToggleBan(user.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 ${
                            user.isBanned
                              ? 'bg-emerald-100 dark:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white'
                              : 'bg-rose-100 dark:bg-rose-600/30 text-rose-700 dark:text-rose-300 hover:bg-rose-600 hover:text-white'
                          }`}
                        >
                          {user.isBanned ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Mở khóa</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Khóa</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Songs */}
      {activeTab === 'songs' && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-cyan-500" />
            <span>Quản Lý Bài Hát ({songs.length})</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {songs.map((song) => (
              <div
                key={song.id}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 truncate">
                  <img
                    src={song.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg'}
                    alt={song.title}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div className="truncate">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {song.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {song.artist}
                    </p>
                    <span className="text-[10px] text-purple-600 dark:text-purple-300 font-mono">
                      {song.genre}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Xóa bài hát "${song.title}"?`)) {
                      onDeleteSong(song.id);
                    }
                  }}
                  className="p-2 rounded-xl bg-rose-100 dark:bg-rose-600/20 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white transition-colors"
                  title="Xóa bài hát"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Voice Models */}
      {activeTab === 'covers' && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="font-outfit font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-pink-500" />
            <span>Mô Hình Giọng Hát AI Cấp Phép ({voiceModels.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {voiceModels.map((model) => (
              <div
                key={model.id}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-4 text-center space-y-2"
              >
                <img
                  src={model.avatarUrl}
                  alt={model.name}
                  className="w-14 h-14 rounded-full object-cover mx-auto ring-2 ring-purple-500/40"
                />
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                  {model.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {model.description}
                </p>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold inline-block">
                  Licensed AI Voice Model
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
