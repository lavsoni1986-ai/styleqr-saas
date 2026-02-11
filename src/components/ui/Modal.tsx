"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children, footer }: ModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.pointerEvents = "none";
    } else {
      document.body.style.overflow = "unset";
      document.body.style.pointerEvents = "auto";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.pointerEvents = "auto";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      style={{ pointerEvents: "auto" }}
      onClick={onClose}
    >
      <div
        className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-xl font-semibold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 text-zinc-300 dark-theme-inputs">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-white/10 flex-shrink-0 bg-white/5">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
};
