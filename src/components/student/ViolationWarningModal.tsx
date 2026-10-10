import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ViolationWarningModalProps {
  violationCount: number;
  maxViolations: number;
  message: string;
  onAcknowledge: () => void;
}

export const ViolationWarningModal: React.FC<ViolationWarningModalProps> = ({
  violationCount,
  maxViolations,
  message,
  onAcknowledge,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-white border-2 border-red-600 max-w-lg w-full p-6 text-slate-900 shadow-xl">
        <div className="flex items-center space-x-3 text-red-600 mb-4 border-b border-red-100 pb-3">
          <AlertTriangle className="w-7 h-7 shrink-0" />
          <h2 className="text-lg font-bold uppercase tracking-wider">
            Peringatan Pelanggaran Ujian!
          </h2>
        </div>

        <div className="space-y-3 text-sm">
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs">
            <span className="font-bold">Indikasi Pelanggaran:</span> {message}
          </div>

          <p className="text-slate-700">
            Sistem mendeteksi aktivitas tidak diizinkan (berpindah tab, keluar dari mode layar penuh, atau kehilangan fokus jendela ujian).
          </p>

          <div className="text-center py-2 bg-slate-100 border border-slate-200 font-mono text-sm">
            Status Pelanggaran: <span className="font-bold text-red-600">{violationCount}</span> dari maksimal{' '}
            <span className="font-bold">{maxViolations}</span> kali toleransi.
          </div>

          {violationCount < maxViolations ? (
            <p className="text-xs text-red-600 font-semibold">
              Perhatian: Pada pelanggaran ke-{maxViolations}, sesi ujian Anda akan otomatis dihentikan dan jawaban saat ini akan langsung dikumpulkan ke server!
            </p>
          ) : (
            <p className="text-xs text-red-700 font-bold">
              Batas toleransi pelanggaran telah tercapai. Ujian dihentikan dan jawaban Anda telah dikirimkan ke guru pengampu.
            </p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onAcknowledge}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Saya Mengerti & Kembali ke Ujian
          </button>
        </div>
      </div>
    </div>
  );
};
