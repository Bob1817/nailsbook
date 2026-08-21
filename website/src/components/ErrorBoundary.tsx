import React, { Component, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../i18n/LanguageContext'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />
    }

    return this.props.children
  }
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  const navigate = useNavigate()
  const { t } = useLang()

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="mx-auto w-full max-w-md rounded-[32px] border border-line bg-surface p-8 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <span className="text-4xl">😵</span>
        </div>
        <h2 className="mt-6 text-2xl font-black text-ink">
          {t.errorBoundary?.title || '出错了'}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          {t.errorBoundary?.description || '发生了意外错误，请稍后重试'}
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">
            {error.message}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 min-h-12 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-deep px-6 text-[15px] font-bold text-white shadow-lg shadow-pink-200/50 transition active:scale-[0.98]"
          >
            {t.errorBoundary?.retry || '重试'}
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-surface px-6 text-[15px] font-bold text-ink transition active:scale-[0.98]"
          >
            {t.errorBoundary?.backHome || '返回首页'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>
}
