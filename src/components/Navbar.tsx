import React from 'react';
import { Search, Globe, User as UserIcon, Shield, Sun, Moon, Menu } from 'lucide-react';
import { Language, User, ThemeMode } from '../types';
import { translations } from '../utils/translations';

interface NavbarProps {
  lang: Language;
  onToggleLang: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  user: User | null;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  isSidebarCollapsed: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onToggleLang,
  theme,
  onToggleTheme,
  user,
  onOpenAuth,
  onOpenProfile,
  onSearch,
  searchQuery,
  isSidebarCollapsed,
  onToggleMobileMenu,
}) => {
  const t = translations[lang];

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-30 h-16 bg-white/85 dark:bg-[#090814]/85 backdrop-blur-md border-b border-slate-200 dark:border-purple-900/20 px-4 md:px-6 flex items-center justify-between gap-3 transition-all duration-300 ${
        isSidebarCollapsed ? 'md:left-20' : 'md:left-64'
      }`}
    >
      {/* Mobile Menu Button + Search Input */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-purple-900/30"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={
              lang === 'vi'
                ? 'Tìm bài hát, phong cách, ca sĩ AI...'
                : 'Search songs, styles, AI vocalists...'
            }
            className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-full pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-purple-900/30 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white hover:border-purple-500 transition-all"
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-600" />}
        </button>

        {/* Language Switcher */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-purple-900/30 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-purple-500 transition-all"
        >
          <Globe className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <span>{lang.toUpperCase()}</span>
        </button>

        {/* User Profile / Auth Button */}
        {user ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-gradient-to-r dark:from-purple-900/60 dark:to-slate-900 border border-purple-200 dark:border-purple-500/30 hover:border-purple-500 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-all"
              title={lang === 'vi' ? 'Hồ sơ cá nhân' : 'Profile'}
            >
              <img
                src={user.avatar || '/images/album_cover_lofi_ballad_1794018467443.jpg'}
                alt={user.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-purple-400"
              />
              <span className="hidden md:inline max-w-[120px] truncate">{user.name}</span>
              {user.role === 'admin' && (
                <span title="Admin Account">
                  <Shield className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                </span>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/25 transition-all"
          >
            <UserIcon className="w-4 h-4" />
            <span>{t.user.login}</span>
          </button>
        )}
      </div>
    </header>
  );
};
