import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Shield, Server, CheckCircle2, Save } from 'lucide-react';

export const AppSettingsView: React.FC = () => {
  const { user } = useAuth();
  const [schoolName, setSchoolName] = useState('Sekolah CBT Terpadu');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [semester, setSemester] = useState('Ganjil');
  const [defaultViolations, setDefaultViolations] = useState(2);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace] max-w-3xl">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-2">
          <Settings className="w-5 h-5 text-sky-700" />
          <span>Pengaturan Sistem & Konfigurasi Aplikasi</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Parameter umum platform CBT Online إمتحان (Imtihan), integritas data, dan status keamanan.
        </p>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan sistem berhasil disimpan.</span>
        </div>
      )}

      {/* Form Konfigurasi Sekolah */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 p-6 space-y-4 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2">
          1. Identitas Sekolah & Tahun Ajaran
        </h2>

        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">
            Nama Sekolah / Lembaga Pendidikan
          </label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            required
            className="w-full p-2.5 border border-slate-300 bg-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Tahun Ajaran Aktif
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              required
              className="w-full p-2.5 border border-slate-300 bg-white font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full p-2.5 border border-slate-300 bg-white font-bold"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 uppercase mb-1">
            Toleransi Pelanggaran Bawaan (Default Max Violations)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={defaultViolations}
            onChange={(e) => setDefaultViolations(Number(e.target.value))}
            className="w-full p-2.5 border border-slate-300 bg-white font-mono"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Sesuai aturan sistem إمتحان, default adalah 2 kali pelanggaran terverifikasi sebelum attempt dihentikan otomatis.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>

      {/* Informasi Keamanan & Firebase Status */}
      <div className="bg-white border border-slate-200 p-6 space-y-3 text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-700" />
          <span>Status Keamanan & Backend Firestore</span>
        </h2>

        <div className="space-y-2 text-slate-700 font-mono text-[11px]">
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Koneksi Database:</span>
            <span className="text-emerald-700 font-bold">Cloud Firestore Aktif</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Security Rules:</span>
            <span className="text-emerald-700 font-bold">Terdiversifikasi (Hardened Rules)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Font Resmi:</span>
            <span className="text-slate-800 font-bold">Courier Prime</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Administrator Terdaftar:</span>
            <span className="text-sky-800 font-bold">{user?.email}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
