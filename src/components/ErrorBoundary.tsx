import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && parsed.error) {
        readable = `${parsed.error} (${parsed.operationType || 'operasi'} pada ${parsed.path || 'database'})`;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: readable };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111713] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-[#16201A] rounded-2xl border border-[#EAE4DA] dark:border-[#344639] p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-[#FDF4F5] dark:bg-[#D88C94]/15 text-[#C46F79] dark:text-[#F4B4BC] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-[#233126] dark:text-[#F8FAF7] mb-2">
              Terjadi Gangguan Koneksi Data
            </h2>
            <p className="text-sm text-[#616E63] dark:text-[#BCC8BF] mb-6 break-words">
              {this.state.message || 'Sistem mengalami kendala saat memproses data.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5F7D63] text-white text-sm font-medium hover:bg-[#4C6750] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
