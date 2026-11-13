import React from 'react';
import {
  Home,
  Wand2,
  Mic2,
  Sliders,
  Library,
  History,
  ShieldAlert,
  PlusCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  X,
} from 'lucide-react';
import { Language, User } from '../types';
import { translations } from '../utils/translations';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  lang: Language;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  savedCount: number;
  currentUser: User | null;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  lang,
  isCollapsed,
  onToggleCollapse,
  savedCount,
  currentUser,
  isMobileOpen,
  onCloseMobile,
}) => {
  const t = translations[lang].nav;

  const navItems = [
    { id: 'home', label: t.home, icon: Home },
    { id: 'create', label: t.createMusic, icon: Wand2, badge: 'AI' },
    { id: 'cover', label: t.aiCover, icon: Mic2, badge: 'RVC' },
    { id: 'tools', label: t.aiTools, icon: Sliders },
    { id: 'library', label: t.library, icon: Library, count: savedCount },
    { id: 'history', label: t.history, icon: History },
    { id: 'profile', label: lang === 'vi' ? 'Hồ sơ cá nhân' : 'Profile', icon: UserIcon },
    {
      id: 'admin',
      label: t.admin,
      icon: ShieldAlert,
      highlight: currentUser?.role === 'admin',
    },
  ];

  const handleSelect = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-white/95 dark:bg-[#0d0b1a]/95 backdrop-blur-md border-r border-slate-200 dark:border-purple-900/30 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-purple-900/20 shrink-0">
          <div
            onClick={() => handleSelect('home')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-purple-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-white dark:bg-[#0d0b1a] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>

            {(!isCollapsed || isMobileOpen) && (
              <div className="truncate">
                <h1 className="font-outfit font-extrabold text-base tracking-wider text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-cyan-300 dark:bg-clip-text dark:text-transparent truncate">
                  AI MUSIC
                </h1>
                <span className="text-[10px] font-semibold tracking-widest text-purple-600 dark:text-purple-400/90 uppercase block -mt-1">
                  STUDIO
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden md:block p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-purple-900/30 transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-3">
          <button
            onClick={() => handleSelect('create')}
            className={`w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold py-2.5 px-3 rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
              isCollapsed && !isMobileOpen ? 'px-0' : ''
            }`}
          >
            <PlusCircle className="w-5 h-5 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span className="text-sm truncate">{t.createMusic}</span>}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const expanded = !isCollapsed || isMobileOpen;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-purple-100 dark:bg-gradient-to-r dark:from-purple-900/60 dark:to-purple-800/20 text-purple-900 dark:text-white border border-purple-300 dark:border-purple-500/40 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-purple-900/20'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-colors ${
                    isActive
                      ? 'text-purple-600 dark:text-purple-400'
                      : item.highlight
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-300'
                  }`}
                />

                {expanded && <span className="truncate flex-1 text-left">{item.label}</span>}

                {expanded && item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                    {item.badge}
                  </span>
                )}

                {expanded && typeof item.count === 'number' && item.count > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-200 dark:bg-slate-800 text-purple-700 dark:text-purple-300">
                    {item.count}
                  </span>
                )}

                {!expanded && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="p-4 border-t border-slate-200 dark:border-purple-900/20 text-xs text-slate-500 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>AI Music Studio</span>
              <span className="text-purple-600 dark:text-cyan-400 font-mono text-[10px]">Production Ready</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">Suno & MusicAI Inspired</p>
          </div>
        )}
      </aside>
    </>
  );
};
