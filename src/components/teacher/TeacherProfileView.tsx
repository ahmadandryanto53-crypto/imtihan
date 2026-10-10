import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateTeacher } from '../../services/db';
import { UserCheck, Save, Mail, Award, BookOpen } from 'lucide-react';

export const TeacherProfileView: React.FC = () => {
  const { user, profile, teacher, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(teacher?.fullName || profile?.fullName || '');
  const [nip, setNip] = useState(teacher?.nip || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMsg(null);
    try {
      await updateTeacher(user.uid, {
        fullName,
        nip,
      });
      await refreshProfile();
      setMsg('Profil berhasil diperbarui.');
    } catch (err: any) {
      setMsg(err.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace] max-w-2xl">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-2">
          <UserCheck className="w-5 h-5 text-sky-700" />
          <span>Profil Guru Pengampu</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Informasi identitas akun pengajar dan pengesahan penilaian ujian.
        </p>
      </div>

      {msg && (
        <div className="p-3 bg-sky-50 border border-sky-200 text-sky-800 text-xs">{msg}</div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 space-y-4 text-xs">
        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">Nama Lengkap</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full p-2.5 border border-slate-300 bg-white"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">
            Nomor Induk Pegawai (NIP)
          </label>
          <input
            type="text"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            placeholder="Contoh: 198501012010011001"
            className="w-full p-2.5 border border-slate-300 bg-white font-mono"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">Email Akun</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full p-2.5 border border-slate-200 bg-slate-50 text-slate-500 font-mono"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase tracking-wider text-xs cursor-pointer flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Perbarui Profil'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
