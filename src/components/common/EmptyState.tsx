import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'Belum ada data. Silakan tambahkan data terlebih dahulu.',
  actionButton,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-300 rounded bg-slate-50 text-center my-4">
      <Inbox className="w-10 h-10 text-slate-400 mb-3 stroke-[1.5]" />
      <p className="text-sm text-slate-600 mb-4 font-normal max-w-md">{message}</p>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
};
