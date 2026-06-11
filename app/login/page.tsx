'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { supabase, getSafeErrorMessage } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [keepLoggedIn, setKeepLoggedIn] = useState(true)  // 베타: UI만 (정교한 세션 제어는 정식 때)

  const inputBase = 'w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors duration-150'

  async function handleSubmit() {
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        // 이메일 미인증 사용자는 안내, 그 외는 보안상 통일 메시지
        if (error.code === 'email_not_confirmed' || error.message.includes('Email not confirmed')) {
          setErrorMsg('이메일 인증이 먼저 필요해요. 메일함에서 인증을 완료해주세요.')
        } else if (error.code === 'invalid_credentials' || error.message.includes('Invalid login credentials')) {
          setErrorMsg('이메일 또는 비밀번호가 올바르지 않아요.')
        } else {
          setErrorMsg(getSafeErrorMessage(error))
        }
        return
      }

      // 성공 → 홈으로 (대시보드는 추후)
      router.push('/')
    } catch (err) {
      setErrorMsg(getSafeErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-[#FAFBFC] p-4 md:p-8 flex items-center justify-center"
      style={{ backgroundImage: 'linear-gradient(to right, rgba(147,197,253,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(147,197,253,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
    >
      <div className="w-full max-w-5xl rounded-[40px] overflow-hidden shadow-2xl shadow-blue-900/10 flex flex-col lg:flex-row bg-white max-h-[calc(100vh-4rem)]">
      {/* ── 왼쪽 패널 (회원가입과 동일) ── */}
      <div className="lg:w-[420px] flex-shrink-0 bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#1E40AF] text-white px-8 py-12 lg:py-0 lg:flex lg:flex-col lg:justify-center lg:px-12 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#FCD34D]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="inline-block bg-white rounded-2xl p-2 shadow-lg shadow-black/10 mb-6">
            <img src="/logo.png" alt="AI 총무" className="h-28 block" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-black leading-snug mb-5" style={{ wordBreak: 'keep-all', letterSpacing: '-0.5px' }}>
            공실·미납 관리,<br />
            <span className="text-[#FCD34D]">더 쉽고 편리하게</span>
          </h1>
          <p className="text-white/80 text-sm lg:text-base leading-relaxed mb-8" style={{ wordBreak: 'keep-all' }}>
            AI 총무가 입실부터 정산까지 도와드려요.<br />
            베타 기간 동안 모든 기능을 무료로 체험하세요.
          </p>
          <div className="inline-flex items-center gap-2 bg-[#FCD34D] text-[#1E3A8A] px-5 py-2.5 rounded-full text-sm font-black shadow-lg">
            🎁 베타 기간 100% 무료
          </div>
        </div>
      </div>

      {/* ── 오른쪽 패널 (로그인 폼) ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-12 lg:py-16 flex flex-col justify-center min-h-full">
          <h2 className="text-2xl font-black text-gray-900 mb-2">로그인</h2>
          <p className="text-sm text-gray-500 mb-10" style={{ wordBreak: 'keep-all' }}>
            원장님, 다시 오신 걸 환영해요.
          </p>

          {/* 이메일 */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className={inputBase}
            />
          </div>

          {/* 비밀번호 */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              placeholder="비밀번호를 입력해주세요"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              className={inputBase}
            />
          </div>

          {/* 로그인 상태 유지 (베타: UI용 — Supabase 기본 세션 유지) */}
          <label className="flex items-center gap-2 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={keepLoggedIn}
              onChange={(e) => setKeepLoggedIn(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#2563EB]"
            />
            <span className="text-sm text-gray-700">로그인 상태 유지</span>
          </label>

          {/* 인라인 에러 박스 */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-bold">
              <X size={18} className="flex-shrink-0 mt-0.5" />
              <span style={{ wordBreak: 'keep-all' }}>{errorMsg}</span>
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-base font-black transition-all duration-200 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white hover:from-[#1E3A8A] hover:to-[#1E40AF] hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                로그인 중...
              </span>
            ) : (
              '로그인'
            )}
          </button>

          {/* 회원가입 링크 */}
          <p className="text-center text-sm text-gray-500 mt-6">
            아직 회원이 아니신가요?{' '}
            <Link href="/signup" className="font-bold text-[#2563EB] hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}
