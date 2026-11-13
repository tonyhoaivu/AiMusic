import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  Mail,
  Shield,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { User, Language } from '../types';
import { translations } from '../utils/translations';
import { authLogin, authRegister, authLogout, authForgotPassword } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
  onOpenProfile?: () => void;
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  onOpenProfile,
  lang,
}) => {
  const t = translations[lang].user;
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessToast(null);
    setIsLoading(true);

    try {
      if (mode === 'forgot') {
        const res = await authForgotPassword(email);
        if (res.success) {
          setSuccessToast(res.message || 'Đã ghi nhận yêu cầu đặt lại mật khẩu.');
        } else {
          setAuthError(res.error || 'Không thể xử lý yêu cầu.');
        }
        return;
      }

      if (mode === 'register') {
        const res = await authRegister(name, email, password);
        if (res.success && res.user) {
          setSuccessToast('Đăng ký tài khoản miễn phí thành công!');
          onLogin(res.user);
          setTimeout(onClose, 400);
        } else {
          setAuthError(res.error || 'Đăng ký thất bại.');
        }
        return;
      }

      const res = await authLogin(email, password);
      if (res.success && res.user) {
        setSuccessToast(
          res.user.role === 'admin'
            ? 'Đăng nhập Quản Trị Viên (Admin) thành công!'
            : 'Đăng nhập thành công!'
        );
        onLogin(res.user);
        setTimeout(onClose, 350);
      } else {
        setAuthError(res.error || 'Email hoặc mật khẩu không chính xác.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminQuickLogin = async () => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const adminPass = '0927099940@Phv';
      setEmail('admin@aimusicstudio.com');
      setPassword(adminPass);
      const res = await authLogin('admin@aimusicstudio.com', adminPass);
      if (res.success && res.user) {
        setSuccessToast('Đăng nhập Admin thành công!');
        onLogin(res.user);
        setTimeout(onClose, 350);
      } else {
        setAuthError(res.error || 'Không thể đăng nhập Admin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    await authLogout();
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#100d26] border border-slate-200 dark:border-purple-500/30 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {currentUser ? (
          <div className="space-y-6 text-center">
            <div className="relative inline-block">
              <img
                src={currentUser.avatar || '/images/album_cover_lofi_ballad_1794018467443.jpg'}
                alt={currentUser.name}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-purple-500/40 mx-auto"
              />
              {currentUser.role === 'admin' && (
                <span className="absolute bottom-0 right-0 bg-amber-500 text-slate-950 p-1.5 rounded-full ring-2 ring-white dark:ring-[#100d26]">
                  <Shield className="w-4 h-4" />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-center gap-2">
                <h3 className="font-outfit font-bold text-xl text-slate-900 dark:text-white">
                  {currentUser.name}
                </h3>
                {currentUser.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentUser.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-600/40 text-xs font-semibold text-purple-700 dark:text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>
                  {currentUser.role === 'admin' ? 'Tài Khoản Toàn Quyền Quản Trị' : t.freeMember}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {onOpenProfile && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-colors"
                >
                  Xem Hồ Sơ Cá Nhân
                </button>
              )}

              <button
                onClick={handleLogoutClick}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
              >
                {t.logout}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <h3 className="font-outfit font-extrabold text-2xl text-slate-900 dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-cyan-300 dark:bg-clip-text dark:text-transparent">
                {mode === 'register'
                  ? t.register
                  : mode === 'forgot'
                  ? 'Quên mật khẩu'
                  : t.login}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                AI MUSIC STUDIO – Nền Tảng Âm Nhạc AI Chuyên Nghiệp
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {successToast && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{successToast}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Họ & Tên
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nguyễn Văn Âm Nhạc"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-purple-900/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email hoặc Tên đăng nhập
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@domain.com hoặc admin"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-purple-900/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Mật khẩu
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-purple-900/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {mode === 'register'
                    ? t.register
                    : mode === 'forgot'
                    ? 'Gửi yêu cầu khôi phục'
                    : t.login}
                </span>
              </button>
            </form>

            {mode === 'login' && (
              <div className="pt-2 border-t border-slate-200 dark:border-purple-900/30 space-y-2">
                <button
                  type="button"
                  onClick={handleAdminQuickLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Đăng nhập Quản trị Admin (admin@aimusicstudio.com)</span>
                </button>
              </div>
            )}

            <div className="pt-1 text-center text-xs space-x-3">
              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setAuthError(null);
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                >
                  Chưa có tài khoản? Đăng ký miễn phí
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setAuthError(null);
                  }}
                  className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                >
                  Quay lại Đăng nhập
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
