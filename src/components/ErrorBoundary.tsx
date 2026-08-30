import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // If it's a dynamic module import failure, trigger auto reload once
    const isDynamicImportError =
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.name === 'ChunkLoadError';

    if (isDynamicImportError) {
      const pageHasBeenForceRefreshed = JSON.parse(
        window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
      );
      if (!pageHasBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    window.sessionStorage.removeItem('page-has-been-force-refreshed');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 sm:p-8 text-center backdrop-blur-md shadow-2xl">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
              Something went wrong
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mb-6">
              A new update might have been deployed or a network issue occurred. Please refresh the page.
            </p>

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-slate-100 font-medium rounded-xl transition-all duration-300 shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
