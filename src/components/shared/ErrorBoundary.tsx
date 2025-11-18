"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <React.Fragment>{this.props.fallback}</React.Fragment>;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#1e1e1e] p-6">
          <div className="glass-panel max-w-md border border-[#4CAF50]/40 p-8 text-center">
            <h2 className="text-2xl font-bold text-[#4CAF50] mb-4">Произошла ошибка</h2>
            <p className="text-[#cccccc] mb-6">
              {String(this.state.error?.message || "Неизвестная ошибка")}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-xl bg-[#4CAF50] px-6 py-3 font-semibold text-white transition-all duration-300 hover:bg-[#45a049]"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    // Явно оборачиваем children в Fragment для правильной обработки в Next.js
    return <React.Fragment>{this.props.children}</React.Fragment>;
  }
}
