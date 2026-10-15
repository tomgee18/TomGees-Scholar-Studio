import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Database,
} from 'lucide-react';
import { GlassCard, PrimaryButton, GhostButton } from './ui/GlassComponents';

export interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ScholarStudio:ErrorBoundary] Uncaught application error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyDiagnostics = async () => {
    const { error, errorInfo } = this.state;
    const diagnostics = [
      '=== Scholar Studio Diagnostic Crash Report ===',
      `Timestamp: ${new Date().toISOString()}`,
      `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'Unknown'}`,
      '',
      `Error Name: ${error?.name || 'Unknown'}`,
      `Error Message: ${error?.message || 'No message provided'}`,
      '',
      '=== JavaScript Stack Trace ===',
      error?.stack || 'No stack trace available',
      '',
      '=== React Component Stack ===',
      errorInfo?.componentStack || 'No component stack available',
      '==============================================',
    ].join('\n');

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(diagnostics);
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      }
    } catch (err) {
      console.warn('Failed to copy to clipboard', err);
    }
  };

  handleClearCacheAndReload = () => {
    if (
      typeof window !== 'undefined' &&
      window.confirm(
        'Reset local transient configuration and reload Scholar Studio? Your indexed documents and drafts in IndexedDB will NOT be deleted.'
      )
    ) {
      try {
        localStorage.removeItem('tomgees_scholar_studio_config');
      } catch (e) {
        console.warn('Failed to clear config from localStorage', e);
      }
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, showDetails, copied } = this.state;

      return (
        <div className="min-h-screen bg-obsidian text-white flex items-center justify-center p-4 sm:p-6 select-text">
          <GlassCard className="max-w-2xl w-full p-6 sm:p-8 border-red-500/30 bg-obsidian/90 shadow-2xl relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-500/10 blur-[60px] pointer-events-none rounded-full" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-5 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                Scholar Studio Encountered an Unexpected Error
              </h1>
              <p className="text-sm text-gray-400 max-w-lg mb-6 leading-relaxed">
                The studio safety boundary captured an unhandled interface exception. Your indexed documents,
                drafts, and notes in IndexedDB remain secure.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full mb-6">
                <PrimaryButton onClick={this.handleReload} className="!px-5 !py-2.5 text-xs font-semibold">
                  <RotateCcw className="w-4 h-4" /> Reload Studio
                </PrimaryButton>

                <GhostButton
                  onClick={this.handleReset}
                  className="bg-white/5 hover:bg-white/10 border-white/10 text-xs font-medium !px-4 !py-2.5 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyberLime" /> Try Again
                </GhostButton>

                <button
                  onClick={this.handleCopyDiagnostics}
                  className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Copy error details to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-cyberLime" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" /> Copy Diagnostics
                    </>
                  )}
                </button>

                <button
                  onClick={this.handleClearCacheAndReload}
                  className="px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-xs text-red-400/80 hover:text-red-300 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Clear corrupted settings and reload"
                >
                  <Database className="w-3.5 h-3.5" /> Reset Settings
                </button>
              </div>

              {/* Technical Details Accordion */}
              <div className="w-full text-left border-t border-white/10 pt-4 mt-2">
                <button
                  onClick={() => this.setState({ showDetails: !showDetails })}
                  className="flex items-center justify-between w-full py-1 text-xs font-mono text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                    Technical Diagnostics ({error?.name || 'Error'})
                  </span>
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showDetails && (
                  <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                    <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg">
                      <p className="text-xs font-mono font-semibold text-red-400 break-words">
                        {error?.toString() || 'Unknown Error'}
                      </p>
                    </div>

                    {error?.stack && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-mono tracking-wider text-gray-500">
                          Stack Trace
                        </div>
                        <pre className="p-3 rounded-lg bg-black/60 border border-white/5 font-mono text-[11px] leading-tight text-gray-400 overflow-x-auto max-h-48 custom-scrollbar whitespace-pre-wrap select-all">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {errorInfo?.componentStack && (
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-mono tracking-wider text-gray-500">
                          Component Stack
                        </div>
                        <pre className="p-3 rounded-lg bg-black/60 border border-white/5 font-mono text-[11px] leading-tight text-gray-400 overflow-x-auto max-h-36 custom-scrollbar whitespace-pre-wrap select-all">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}
