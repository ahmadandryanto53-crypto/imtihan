import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SchoolSubject, EducationLevel } from '../../types';
import {
  fetchSubjects,
  createSubject,
  deleteSubject,
  logAudit,
} from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { BookMarked, Plus, Trash2 } from 'lucide-react';

export const SubjectManagement: React.FC = () => {
  const { user, profile } = useAuth();
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel | 'ALL'>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSubjects();
      setSubjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const id = await createSubject({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        educationLevel,
      });

      await logAudit(
        'CREATE_SUBJECT',
        user.uid,
        user.email || '',
        profile?.role || 'admin',
        `Menambahkan mata pelajaran: ${name} (${code})`,
        id
      );

      setIsModalOpen(false);
      setCode('');
      setName('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, subName: string) => {
    if (window.confirm(`Yakin ingin menghapus mata pelajaran "${subName}"?`)) {
      try {
        await deleteSubject(id);
        if (user) {
          await logAudit(
            'DELETE_SUBJECT',
            user.uid,
            user.email || '',
            profile?.role || 'admin',
            `Menghapus mata pelajaran: ${subName}`,
            id
          );
        }
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-2">
            <BookMarked className="w-5 h-5 text-sky-700" />
            <span>Manajemen Mata Pelajaran</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kurikulum mata pelajaran untuk bank soal dan penyelenggaraan ujian.
          </p>
        </div>

        <button
          onClick={() => {
            setCode('');
            setName('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Mata Pelajaran</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat mata pelajaran...
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          message="Belum ada data mata pelajaran. Silakan tambahkan mata pelajaran terlebih dahulu."
          actionButton={
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Tambah Mapel Sekarang
            </button>
          }
        />
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-28">Kode Mapel</th>
                <th className="py-3 px-4">Nama Mata Pelajaran</th>
                <th className="py-3 px-4 w-36">Jenjang Berlaku</th>
                <th className="py-3 px-4 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {subjects.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-mono font-bold text-sky-800">{s.code}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                  <td className="py-3 px-4 font-mono">
                    {s.educationLevel === 'ALL' ? 'Semua Jenjang' : s.educationLevel}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      title="Hapus Mata Pelajaran"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Tambah Mapel */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border border-slate-300 max-w-md w-full p-6 text-slate-900 shadow-xl text-xs">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3 mb-4">
              Tambah Mata Pelajaran
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Kode Mapel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: MTK, BIND, IPA"
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Nama Mata Pelajaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Matematika"
                  required
                  className="w-full p-2.5 border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Jenjang Berlaku
                </label>
                <select
                  value={educationLevel}
                  onChange={(e) => setEducationLevel(e.target.value as EducationLevel | 'ALL')}
                  className="w-full p-2.5 border border-slate-300 bg-white"
                >
                  <option value="ALL">Semua Jenjang (SD, SMP, SMA)</option>
                  <option value="SD">SD</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 bg-white text-slate-700 font-bold uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold uppercase cursor-pointer"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
