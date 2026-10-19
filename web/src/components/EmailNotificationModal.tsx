'use client';

import React from 'react';
import { X, Mail, Calendar, CheckCircle2, FileText } from 'lucide-react';
import { StoredNotification } from '@/lib/email-service';

interface EmailNotificationModalProps {
  notification: StoredNotification;
  onClose: () => void;
}

export default function EmailNotificationModal({ notification, onClose }: EmailNotificationModalProps) {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F223A]/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-[#E5E3DE] flex flex-col font-sans">
        {/* Header */}
        <div className="bg-[#0F223A] text-white p-5 flex items-center justify-between border-b border-[#1E3A5B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B89C66]/20 border border-[#B89C66]/40 flex items-center justify-center text-[#B89C66]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#B89C66] uppercase tracking-wider block">
                Hòm Thư Điện Tử • Elite Living Mail Box
              </span>
              <h2 className="text-sm font-bold text-white truncate max-w-md">
                {notification.subject}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sender & Recipient Bar */}
        <div className="bg-[#F8F8F6] px-6 py-3 border-b border-[#E5E3DE] text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span>Người nhận: </span>
            <strong className="text-[#0F223A]">{notification.recipientName}</strong> &lt;{notification.recipientEmail}&gt;
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(notification.sentAt).toLocaleString('vi-VN')}</span>
          </div>
        </div>

        {/* HTML Email Body Container */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div
            className="prose prose-sm max-w-none text-slate-800"
            dangerouslySetInnerHTML={{ __html: notification.contentHtml }}
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8F8F6] border-t border-[#E5E3DE] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0F223A] hover:bg-[#1E3A5B] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Đóng Hòm Thư
          </button>
        </div>
      </div>
    </div>
  );
}
