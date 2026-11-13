import React, { useState } from 'react';
import {
  User as UserIcon,
  Shield,
  Lock,
  Save,
  Music,
  Mic2,
  CheckCircle2,
  AlertCircle,
  Play,
  LogIn,
  Download,
} from 'lucide-react';
import { User, Song, Language } from '../types';
import { authUpdateProfile, authChangePassword } from '../services/api';

interface ProfileProps {
  user: User | null;
  songs: Song[];
  onUserUpdated: (user: User) => void;
  onPlaySong: (song: Song) => void;
  onOpenSongDetail: (song: Song) => void;
  onOpenAuth: () => void;
  lang: Language;
}

export const Profile: React.FC<ProfileProps> = ({
  user,
  songs,
  onUserUpdated,
  onPlaySong,
  onOpenSongDetail,
  onOpenAuth,
}) => {
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [historyTab, setHistoryTab] = useState<'songs' | 'covers' | 'downloads'>('songs');

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto my-12 shadow-sm">
        <UserIcon className="w-12 h-12 text-purple-500 mx-auto" />
        <h2 className="font-outfit font-extrabold text-2xl text-slate-900 dark:text-white">
          Chưa Đăng Nhập
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Hãy đăng nhập hoặc đăng ký tài khoản miễn phí để quản lý hồ sơ cá nhân, lịch sử sáng tác và danh sách AI Cover của bạn.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng nhập / Đăng ký ngay</span>
        </button>
      </div>
    );
  }

  const userSongs = songs.filter((s) => s.userId === user.id || user.role === 'admin');
  const userCovers = userSongs.filter((s) => s.isAiCover);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    const res = await authUpdateProfile({ name: nameInput });
    if (res.success && res.user) {
      onUserUpdated(res.user);
      setProfileMsg('Đã cập nhật tên hiển thị thành công!');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    const res = await authChangePassword(currentPassword, newPassword);
    if (res.success) {
      setPasswordMsg({ ok: true, text: res.message || 'Đổi mật khẩu thành công!' });
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setPasswordMsg({ ok: false, text: res.error || 'Không thể đổi mật khẩu.' });
    }
  };

  return (
    <div className="space-y-8 pb-24 max-w-5xl mx-auto">
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
        <img
          src={user.avatar || '/images/album_cover_lofi_ballad_1794018467443.jpg'}
          alt={user.name}
          className="w-24 h-24 rounded-full object-cover ring-4 ring-purple-500/30"
        />
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="font-outfit font-extrabold text-2xl text-slate-900 dark:text-white">
              {user.name}
            </h1>
            {user.role === 'admin' && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                <Shield className="w-3 h-3" />
                ADMIN
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{user.email}</p>
          <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-2 text-xs">
            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-300 font-semibold">
              <Music className="w-4 h-4" />
              {userSongs.length} bài hát
            </span>
            <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-300 font-semibold">
              <Mic2 className="w-4 h-4" />
              {userCovers.length} AI Cover
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300 font-semibold">
              <Download className="w-4 h-4" />
              {user.downloadsHistory?.length || 0} file đã tải
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Info */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm"
        >
          <h2 className="font-outfit font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-purple-500" />
            <span>Thông Tin Cá Nhân</span>
          </h2>

          {profileMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên hiển thị
            </label>
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Hồ Sơ</span>
          </button>
        </form>

        {/* Change Password */}
        <form
          onSubmit={handleChangePassword}
          className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm"
        >
          <h2 className="font-outfit font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-500" />
            <span>Đổi Mật Khẩu</span>
          </h2>

          {passwordMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                passwordMsg.ok
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-700 dark:text-rose-300'
              }`}
            >
              {passwordMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mật khẩu mới (tối thiểu 6 ký tự)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-purple-900/40 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs inline-flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Cập Nhật Mật Khẩu</span>
          </button>
        </form>
      </div>

      {/* User's Creation History, AI Covers & Downloads Management */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-purple-900/30 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-outfit font-bold text-lg text-slate-900 dark:text-white">
            Thư Viện Cá Nhân & Quản Lý File Tải Xuống
          </h2>

          <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setHistoryTab('songs')}
              className={`px-3 py-1.5 rounded-lg ${
                historyTab === 'songs'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Sáng tác ({userSongs.length})
            </button>
            <button
              onClick={() => setHistoryTab('covers')}
              className={`px-3 py-1.5 rounded-lg ${
                historyTab === 'covers'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              AI Cover ({userCovers.length})
            </button>
            <button
              onClick={() => setHistoryTab('downloads')}
              className={`px-3 py-1.5 rounded-lg ${
                historyTab === 'downloads'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Đã tải ({user.downloadsHistory?.length || 0})
            </button>
          </div>
        </div>

        {historyTab === 'downloads' ? (
          <div className="divide-y divide-slate-100 dark:divide-purple-900/20">
            {user.downloadsHistory && user.downloadsHistory.length > 0 ? (
              user.downloadsHistory.map((dl) => (
                <div
                  key={dl.id}
                  className="py-3 flex items-center justify-between gap-4 px-2 rounded-xl"
                >
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {dl.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Định dạng: {dl.format} • {new Date(dl.downloadedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {dl.audioUrl && (
                    <a
                      href={`/api/audio/download?url=${encodeURIComponent(dl.audioUrl)}&filename=${encodeURIComponent(dl.title)}.${dl.format.toLowerCase()}`}
                      className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-1 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Tải lại
                    </a>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                Chưa có lịch sử tải file âm thanh nào.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-purple-900/20">
            {(historyTab === 'covers' ? userCovers : userSongs).map((song) => (
              <div
                key={song.id}
                onClick={() => onOpenSongDetail(song)}
                className="py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/30 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <img
                    src={song.coverUrl || '/images/album_cover_vinahouse_1794018465637.jpg'}
                    alt={song.title}
                    className="w-11 h-11 rounded-lg object-cover shrink-0"
                  />
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {song.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {song.genre} • {new Date(song.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaySong(song);
                  }}
                  className="p-2 rounded-full bg-purple-100 dark:bg-purple-600/30 text-purple-600 dark:text-purple-300"
                >
                  <Play className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
