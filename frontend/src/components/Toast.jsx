import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    warning: (msg) => addToast(msg, "warning"),
    info: (msg) => addToast(msg, "info"),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-lg text-xs font-semibold backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 duration-200 ${
              t.type === "success"
                ? "bg-emerald-50/95 border-emerald-300 text-emerald-900"
                : t.type === "error"
                ? "bg-rose-50/95 border-rose-300 text-rose-900"
                : t.type === "warning"
                ? "bg-amber-50/95 border-amber-300 text-amber-900"
                : "bg-sky-50/95 border-sky-300 text-sky-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              {t.type === "error" && <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
              {t.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />}
              {t.type === "info" && <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />}
              <span className="leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg) => console.log("Toast success:", msg),
      error: (msg) => console.log("Toast error:", msg),
      warning: (msg) => console.log("Toast warning:", msg),
      info: (msg) => console.log("Toast info:", msg),
    };
  }
  return context;
}
