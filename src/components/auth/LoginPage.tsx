import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, LogIn, Lock, Mail, ShieldAlert, ExternalLink, ArrowRight } from 'lucide-react';
import firebaseConfig from '../../../firebase-applet-config.json';

export const LoginPage: React.FC = () => {
  const { loginWithEmail, loginWithGoogle, loading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEnableGuide, setShowEnableGuide] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Harap isi username/email dan password.');
      return;
    }

    setError(null);
    setShowEnableGuide(false);
    setIsSubmitting(true);
    try {
      await loginWithEmail(identifier, password);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setShowEnableGuide(true);
        setError('Metode login Email/Password belum diaktifkan di Firebase Console.');
      } else if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-email'
      ) {
        setError('Kredensial login tidak cocok. Pastikan username/email dan password sudah benar.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat lagi.');
      } else {
        setError(err.message || 'Gagal masuk. Periksa kembali informasi akun Anda.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setError(null);
    setShowEnableGuide(false);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Gagal masuk dengan akun Google.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const firebaseAuthUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm p-8 rounded-none">
        {/* Header Identitas */}
        <div className="text-center mb-6 border-b border-slate-100 pb-5">
          <h1 className="text-3xl font-bold tracking-tight text-sky-700 font-['Courier_Prime',monospace]">
            إمتحان
          </h1>
          <p className="text-sm font-semibold text-slate-800 tracking-wide mt-1 uppercase">
            Sistem Ujian Online
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Platform CBT Terintegrasi Jenjang SD, SMP, dan SMA
          </p>
        </div>

        {/* Petunjuk Operasional Jika Email/Password Belum Aktif di Firebase Console */}
        {showEnableGuide && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-none space-y-2">
            <div className="flex items-center space-x-2 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Aktivasi Provider Email/Password di Firebase:</span>
            </div>
            <p className="leading-relaxed">
              Di Firebase Authentication, provider <strong>Google Login</strong> sudah aktif secara otomatis, sedangkan <strong>Email/Password</strong> harus diaktifkan secara manual di Firebase Console proyek Anda.
            </p>
            <div className="pt-2 border-t border-amber-200/60 space-y-2">
              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={isSubmitting || loading}
                className="w-full py-2 px-3 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase tracking-wider text-[11px] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Masuk Sekarang dengan Akun Google</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <a
                href={firebaseAuthUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 bg-white hover:bg-amber-100/50 border border-amber-300 text-amber-900 font-bold uppercase tracking-wider text-[11px] flex items-center justify-center space-x-1.5 cursor-pointer text-center"
              >
                <span>Buka Firebase Console &gt; Sign-in Method</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Error Alert Standar */}
        {error && !showEnableGuide && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-none flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Masuk dengan Google - Pilihan Utama yang Sudah Aktif Otomatis */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleGoogleSubmit}
            disabled={isSubmitting || loading}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-sky-600 text-slate-800 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 rounded-none cursor-pointer disabled:opacity-60 shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Masuk dengan Akun Google</span>
          </button>
          <div className="text-[10px] text-center text-slate-400 mt-1.5 font-mono">
            (Rekomendasi untuk Guru, Administrator, & Akun Google Workspace)
          </div>
        </div>

        <div className="my-5 flex items-center">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-3 text-[11px] text-slate-400 uppercase tracking-widest font-mono">
            atau gunakan nis / email
          </span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {/* Form Login Username / Password */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Username, NIS, atau Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan NIS, NIP, atau Email"
                required
                disabled={isSubmitting || loading}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-none focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kata Sandi / Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                disabled={isSubmitting || loading}
                className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-none focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full mt-2 py-2.5 px-4 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 rounded-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Memproses...</span>
              </span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Sistem</span>
              </>
            )}
          </button>
        </form>

        {/* Catatan Keamanan */}
        <div className="mt-8 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500 leading-normal">
            Registrasi publik tidak disediakan. Akun siswa dan guru didaftarkan secara resmi oleh Administrator Sekolah.
          </p>
        </div>
      </div>
    </div>
  );
};

