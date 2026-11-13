import React from 'react';
import {
  Wand2,
  Mic2,
  FileText,
  Music,
  Play,
  Heart,
  Sparkles,
  Flame,
  Clock,
  Radio,
  Download,
  ExternalLink,
  Megaphone,
  Info,
} from 'lucide-react';
import { Song, Language, AdBanner, WebsiteConfig } from '../types';
import { translations } from '../utils/translations';
import { trackAdClick } from '../services/api';

interface HomeProps {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song) => void;
  onOpenSongDetail: (song: Song) => void;
  onToggleFavorite: (id: string) => void;
  onNavigate: (tab: string) => void;
  lang: Language;
  ads: AdBanner[];
  websiteConfig: WebsiteConfig | null;
}

export const Home: React.FC<HomeProps> = ({
  songs,
  currentSong,
  isPlaying,
  onPlaySong,
  onOpenSongDetail,
  onToggleFavorite,
  onNavigate,
  lang,
  ads,
  websiteConfig,
}) => {
  const t = translations[lang].home;

  const featuredSongs = songs.slice(0, 4);
  const newestSongs = songs.slice().reverse();
  const favoriteSongs = songs.filter((s) => s.isFavorite);

  const handleDownloadTrack = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!song.audioUrl) {
      alert(
        lang === 'vi'
          ? 'Bài hát showcase chưa có file audio thật. Hãy tạo nhạc mới với API Key thực tế!'
          : 'Showcase item has no real audio file yet.'
      );
      return;
    }
    const url = song.audioUrl.startsWith('/')
      ? song.audioUrl
      : `/api/audio/download?url=${encodeURIComponent(song.audioUrl)}&filename=${encodeURIComponent(song.title)}.mp3`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title.replace(/\s+/g, '_')}_AIMusicStudio.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleAdClick = (ad: AdBanner) => {
    trackAdClick(ad.id);
    if (ad.targetUrl.startsWith('#')) {
      const targetTab = ad.targetUrl.replace('#', '');
      onNavigate(targetTab || 'create');
    } else if (ad.targetUrl && ad.targetUrl !== '#') {
      window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const topAds = ads.filter((a) => a.placement === 'home_top' || a.placement === 'home_mid');

  return (
    <div className="space-y-8 pb-24">
      {/* Site Announcement Banner */}
      {websiteConfig?.showAnnouncement && websiteConfig.announcementText && (
        <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-500/30 text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2.5">
          <Megaphone className="w-4 h-4 text-purple-600 dark:text-cyan-400 shrink-0" />
          <span className="leading-relaxed">{websiteConfig.announcementText}</span>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-purple-500/30 shadow-2xl min-h-[320px] flex items-center">
        <img
          src="/images/hero_studio_banner_1794018467147.jpg"
          alt="AI Music Studio Banner"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090814] via-[#090814]/88 to-transparent"></div>

        <div className="relative z-10 max-w-2xl p-8 md:p-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/70 border border-purple-500/40 text-xs font-semibold text-purple-200">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{websiteConfig?.siteName || 'AI MUSIC STUDIO'}</span>
          </div>

          <h1 className="font-outfit font-extrabold text-3xl md:text-5xl tracking-tight leading-tight text-white">
            {t.bannerTitle}
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed">{t.bannerSub}</p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('create')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-95"
            >
              <Wand2 className="w-4 h-4" />
              <span>{t.btnCreate}</span>
            </button>

            <button
              onClick={() => onNavigate('cover')}
              className="px-6 py-3 rounded-xl bg-slate-900/85 border border-purple-500/40 hover:bg-purple-900/60 text-purple-100 font-bold text-sm flex items-center gap-2 transition-all"
            >
              <Mic2 className="w-4 h-4 text-cyan-400" />
              <span>{t.btnCover}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Quick Feature Launchers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('create')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 hover:border-purple-500 transition-all text-left group shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Wand2 className="w-5 h-5" />
          </div>
          <h3 className="font-outfit font-bold text-slate-900 dark:text-slate-100 text-sm">
            {t.btnCreate}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sáng tác từ lời & phong cách
          </p>
        </button>

        <button
          onClick={() => onNavigate('cover')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 hover:border-cyan-500 transition-all text-left group shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-600/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Mic2 className="w-5 h-5" />
          </div>
          <h3 className="font-outfit font-bold text-slate-900 dark:text-slate-100 text-sm">
            {t.btnCover}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tách giọng & ghép giọng AI RVC
          </p>
        </button>

        <button
          onClick={() => onNavigate('create')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 hover:border-pink-500 transition-all text-left group shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-600/20 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-outfit font-bold text-slate-900 dark:text-slate-100 text-sm">
            {t.btnLyrics}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Viết lời bài hát với Gemini AI
          </p>
        </button>

        <button
          onClick={() => onNavigate('tools')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 hover:border-emerald-500 transition-all text-left group shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Music className="w-5 h-5" />
          </div>
          <h3 className="font-outfit font-bold text-slate-900 dark:text-slate-100 text-sm">
            {t.btnInstrumental}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Công cụ tách nhạc & Beat AI
          </p>
        </button>
      </div>

      {/* Active Admin Managed Ad Banners / AdSense */}
      {websiteConfig?.adsEnabled && topAds.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topAds.map((ad) => (
            <div
              key={ad.id}
              onClick={() => handleAdClick(ad)}
              className="rounded-2xl bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-950/50 dark:to-slate-900/80 border border-purple-200 dark:border-purple-500/30 p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-purple-500 transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {ad.imageUrl && (
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-16 h-16 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-cyan-400">
                    Sponsored
                  </span>
                  <h4 className="font-outfit font-bold text-sm text-slate-900 dark:text-white truncate">
                    {ad.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {ad.description}
                  </p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-purple-500 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Google AdSense Container (renders if configured in Admin) */}
      {websiteConfig?.adsEnabled && websiteConfig.adsenseClientId && (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-purple-800/40 p-4 text-center text-xs text-slate-500">
          <ins
            className="adsbygoogle block"
            data-ad-client={websiteConfig.adsenseClientId}
            data-ad-slot={websiteConfig.adsenseSlotId || ''}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
          <span>Google AdSense Slot ({websiteConfig.adsenseClientId})</span>
        </div>
      )}

      {/* Featured Tracks Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            <h2 className="font-outfit font-extrabold text-xl text-slate-900 dark:text-white">
              {t.featuredTracks}
            </h2>
          </div>
          <button
            onClick={() => onNavigate('library')}
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline transition-colors"
          >
            {t.playAll} →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredSongs.map((song) => {
            const isCurrent = currentSong?.id === song.id;
            const isThisPlaying = isCurrent && isPlaying && Boolean(song.audioUrl);

            return (
              <div
                key={song.id}
                onClick={() => onPlaySong(song)}
                className="group relative bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 hover:border-purple-500/60 rounded-2xl p-4 transition-all cursor-pointer shadow-sm hover:shadow-lg flex flex-col justify-between"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-3">
                  <img
                    src={song.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg'}
                    alt={song.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      {isThisPlaying ? (
                        <span className="font-bold text-[10px]">PAUSE</span>
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </div>
                  </div>

                  <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded-md bg-black/75 text-purple-200 border border-purple-500/30">
                    {song.genre}
                  </span>

                  {song.audioUrl ? (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-600/90 text-white">
                      MP3 Ready
                    </span>
                  ) : (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-900/85 text-slate-300">
                      Showcase
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                    {song.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {song.artist}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-purple-900/20 text-xs text-slate-500">
                  <span className="font-mono">
                    {Math.floor(song.duration / 60)}:
                    {(song.duration % 60).toString().padStart(2, '0')}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSongDetail(song);
                      }}
                      className="p-1 text-slate-400 hover:text-purple-500 transition-colors"
                      title="Chi tiết bài hát"
                    >
                      <Info className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(song.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          song.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>

                    <button
                      onClick={(e) => handleDownloadTrack(song, e)}
                      className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      title="Download MP3"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Newest Releases & Favorites */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
            <h2 className="font-outfit font-extrabold text-xl text-slate-900 dark:text-white">
              {t.newestTracks}
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-purple-900/30 rounded-2xl divide-y divide-slate-100 dark:divide-purple-900/20 shadow-sm">
            {newestSongs.map((song) => {
              const isCurrent = currentSong?.id === song.id;

              return (
                <div
                  key={song.id}
                  onClick={() => onOpenSongDetail(song)}
                  className={`p-3.5 flex items-center justify-between gap-4 hover:bg-purple-50/70 dark:hover:bg-purple-950/40 transition-colors cursor-pointer group ${
                    isCurrent ? 'bg-purple-50 dark:bg-purple-900/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={song.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg'}
                      alt={song.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="truncate">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-300 truncate">
                        {song.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline-block px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {song.genre}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(song.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          song.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySong(song);
                      }}
                      className="p-2 rounded-full bg-purple-100 dark:bg-purple-600/30 text-purple-600 dark:text-purple-300 group-hover:bg-purple-600 group-hover:text-white transition-colors"
                    >
                      <Play className="w-4 h-4 ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-500 dark:text-rose-400" />
            <h2 className="font-outfit font-extrabold text-xl text-slate-900 dark:text-white">
              {t.favoritesTitle}
            </h2>
          </div>

          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-purple-900/30 rounded-2xl p-4 space-y-3 shadow-sm">
            {favoriteSongs.length > 0 ? (
              favoriteSongs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => onOpenSongDetail(song)}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 truncate">
                    <img
                      src={song.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg'}
                      alt={song.title}
                      className="w-9 h-9 rounded-lg object-cover shrink-0"
                    />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                        {song.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {song.artist}
                      </p>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-purple-500 shrink-0" />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">
                Chưa có bài hát yêu thích. Bấm nút trái tim để lưu!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
