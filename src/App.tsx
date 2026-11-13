import { useState, useEffect } from 'react';
import { Song, User, Language, VoiceModel, ThemeMode, AdBanner, WebsiteConfig } from './types';
import { INITIAL_SONGS, INITIAL_VOICE_MODELS } from './services/mockData';
import {
  authGetMe,
  fetchSongs,
  updateSongApi,
  deleteSongApi,
  recordSongPlay,
  fetchPublicSiteData,
} from './services/api';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { MusicPlayer } from './components/MusicPlayer';
import { AuthModal } from './components/AuthModal';

// Pages (Deployment guide intentionally excluded from public website UI)
import { Home } from './pages/Home';
import { CreateMusic } from './pages/CreateMusic';
import { AICover } from './pages/AICover';
import { AITools } from './pages/AITools';
import { Library } from './pages/Library';
import { SongDetail } from './pages/SongDetail';
import { Profile } from './pages/Profile';
import { AdminDashboard } from './pages/AdminDashboard';

export default function App() {
  const [lang, setLang] = useState<Language>('vi');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('aimusic_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State collections loaded from backend
  const [songs, setSongs] = useState<Song[]>(INITIAL_SONGS);
  const [voiceModels] = useState<VoiceModel[]>(INITIAL_VOICE_MODELS);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [ads, setAds] = useState<AdBanner[]>([]);
  const [websiteConfig, setWebsiteConfig] = useState<WebsiteConfig | null>(null);

  // Audio Playback state
  const [currentSong, setCurrentSong] = useState<Song | null>(INITIAL_SONGS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Apply light/dark mode class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('aimusic_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Bootstrap songs, site config, auth user, and URL path/query routing
  const refreshPublicSite = async () => {
    const data = await fetchPublicSiteData();
    setAds(data.ads);
    setWebsiteConfig(data.websiteConfig);
  };

  useEffect(() => {
    authGetMe().then((me) => {
      if (me) setUser(me);
    });

    fetchSongs().then((loadedSongs) => {
      if (loadedSongs.length > 0) {
        setSongs(loadedSongs);
        setCurrentSong(loadedSongs[0]);
      }
    });

    refreshPublicSite();

    // Support URL route /?song=<id> or path (/create, /cover, /library, /admin, /profile)
    const params = new URLSearchParams(window.location.search);
    const qSong = params.get('song');
    if (qSong) {
      setSelectedSongId(qSong);
      setCurrentTab('songDetail');
    } else {
      const path = window.location.pathname.replace(/^\//, '').toLowerCase();
      if (['create', 'cover', 'tools', 'library', 'history', 'profile', 'admin'].includes(path)) {
        setCurrentTab(path);
      }
    }
  }, []);

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'vi' ? 'en' : 'vi'));
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handlePlaySong = (song: Song) => {
    if (currentSong?.id === song.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSong(song);
      setIsPlaying(true);
      recordSongPlay(song.id);
    }
  };

  const handleOpenSongDetail = (song: Song) => {
    setSelectedSongId(song.id);
    setCurrentTab('songDetail');
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextTrack = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    if (!currentSong || songs.length === 0) return;
    const currentIndex = songs.findIndex((s) => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
    setIsPlaying(true);
  };

  const handleToggleFavorite = async (id: string) => {
    const target = songs.find((s) => s.id === id);
    const nextFav = !target?.isFavorite;
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, isFavorite: nextFav } : s)));
    await updateSongApi(id, { isFavorite: nextFav });
  };

  const handleSongCreated = (newSong: Song) => {
    setSongs((prev) => [newSong, ...prev]);
  };

  const handleDeleteSong = async (id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
    if (currentSong?.id === id) {
      setCurrentSong(null);
      setIsPlaying(false);
    }
    await deleteSongApi(id);
  };

  const handleRenameSong = async (id: string, newTitle: string) => {
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s)));
    await updateSongApi(id, { title: newTitle });
  };

  const filteredGlobalSongs = searchQuery.trim()
    ? songs.filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q)
        );
      })
    : songs;

  const activeDetailSong =
    songs.find((s) => s.id === selectedSongId) || currentSong || songs[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090814] text-slate-900 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-200">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        lang={lang}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        savedCount={songs.length}
        currentUser={user}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <Navbar
        lang={lang}
        onToggleLang={handleToggleLang}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setCurrentTab('profile')}
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <main
        className={`flex-1 transition-all duration-300 pt-20 px-4 md:px-8 max-w-7xl w-full mx-auto ${
          isSidebarCollapsed ? 'md:pl-24' : 'md:pl-72'
        }`}
      >
        {currentTab === 'home' && (
          <Home
            songs={filteredGlobalSongs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlaySong={handlePlaySong}
            onOpenSongDetail={handleOpenSongDetail}
            onToggleFavorite={handleToggleFavorite}
            onNavigate={setCurrentTab}
            lang={lang}
            ads={ads}
            websiteConfig={websiteConfig}
          />
        )}

        {currentTab === 'create' && (
          <CreateMusic
            onSongCreated={handleSongCreated}
            onSongsCreated={(newSongs) => setSongs((prev) => [...newSongs, ...prev])}
            onPlaySong={handlePlaySong}
            onToggleFavorite={handleToggleFavorite}
            onNavigate={setCurrentTab}
            lang={lang}
          />
        )}

        {currentTab === 'cover' && (
          <AICover
            onSongCreated={handleSongCreated}
            onPlaySong={handlePlaySong}
            onNavigate={setCurrentTab}
            lang={lang}
          />
        )}

        {currentTab === 'tools' && (
          <AITools
            onSongCreated={handleSongCreated}
            onPlaySong={handlePlaySong}
            lang={lang}
          />
        )}

        {(currentTab === 'library' || currentTab === 'history') && (
          <Library
            songs={filteredGlobalSongs}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlaySong={handlePlaySong}
            onOpenSongDetail={handleOpenSongDetail}
            onToggleFavorite={handleToggleFavorite}
            onDeleteSong={handleDeleteSong}
            onRenameSong={handleRenameSong}
            lang={lang}
          />
        )}

        {currentTab === 'songDetail' && activeDetailSong && (
          <SongDetail
            song={activeDetailSong}
            isPlaying={isPlaying && currentSong?.id === activeDetailSong.id}
            onPlaySong={handlePlaySong}
            onToggleFavorite={handleToggleFavorite}
            onRenameSong={handleRenameSong}
            onDeleteSong={handleDeleteSong}
            onBack={() => setCurrentTab('home')}
            lang={lang}
          />
        )}

        {currentTab === 'profile' && (
          <Profile
            user={user}
            songs={songs}
            onUserUpdated={(updated) => setUser(updated)}
            onPlaySong={handlePlaySong}
            onOpenSongDetail={handleOpenSongDetail}
            onOpenAuth={() => setIsAuthOpen(true)}
            lang={lang}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            currentUser={user}
            songs={songs}
            voiceModels={voiceModels}
            onDeleteSong={handleDeleteSong}
            onOpenAuth={() => setIsAuthOpen(true)}
            onSiteConfigUpdated={refreshPublicSite}
            lang={lang}
          />
        )}
      </main>

      <MusicPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        lang={lang}
        playlist={songs}
        onSelectSong={handlePlaySong}
        onOpenSongDetail={handleOpenSongDetail}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        onLogin={(u) => setUser(u)}
        onLogout={() => setUser(null)}
        onOpenProfile={() => setCurrentTab('profile')}
        lang={lang}
      />
    </div>
  );
}
