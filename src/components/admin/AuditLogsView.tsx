import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../../types';
import { fetchAuditLogs } from '../../services/db';
import { EmptyState } from '../common/EmptyState';
import { formatDateIndo } from '../../utils/format';
import { ScrollText, RefreshCw, ShieldCheck } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6 font-['Courier_Prime',monospace]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-2">
            <ScrollText className="w-5 h-5 text-sky-700" />
            <span>Audit Trail & Log Keamanan Sistem</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Catatan permanen dan tidak dapat diubah (append-only) untuk seluruh aktivitas administratif dan interaksi penting.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang Log</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400 font-mono">
          Memuat catatan audit...
        </div>
      ) : logs.length === 0 ? (
        <EmptyState message="Belum ada riwayat audit log tercatat di sistem." />
      ) : (
        <div className="bg-white border border-slate-200 overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4 w-44">Waktu Kejadian</th>
                <th className="py-3 px-4 w-44">Aksi / Operasi</th>
                <th className="py-3 px-4 w-44">Pelaku (Actor)</th>
                <th className="py-3 px-4 w-28">Role</th>
                <th className="py-3 px-4">Rincian Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {logs.map((log, idx) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-center text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 text-slate-500">{formatDateIndo(log.timestamp)}</td>
                  <td className="py-3 px-4 font-bold text-sky-800">{log.action}</td>
                  <td className="py-3 px-4 text-slate-800">{log.actorEmail || log.actorUid}</td>
                  <td className="py-3 px-4 uppercase text-[11px] font-bold text-slate-600">
                    {log.actorRole}
                  </td>
                  <td className="py-3 px-4 font-normal text-slate-800">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
