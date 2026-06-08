'use client'

import { useState } from 'react'
import { Check, X, Mail, Loader2 } from 'lucide-react'
import { supabase, getSafeErrorMessage } from '@/lib/supabase'

// ── 비밀번호 강도 판정 ──
function getPasswordStrength(pw: string): 'none' | 'weak' | 'medium' | 'strong' {
  if (!pw) return 'none'
  const hasLetter = /[a-zA-Z]/.test(pw)
  const hasNumber = /[0-9]/.test(pw)
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw)
  if (pw.length >= 10 && hasLetter && hasNumber && hasSpecial) return 'strong'
  if (pw.length >= 8 && hasLetter && hasNumber) return 'medium'
  return 'weak'
}

const strengthConfig = {
  weak:   { label: '약함', color: 'bg-red-500', width: 'w-1/3' },
  medium: { label: '중간', color: 'bg-yellow-400', width: 'w-2/3' },
  strong: { label: '강함', color: 'bg-green-500', width: 'w-full' },
}

const SIDO_LIST = [
  '서울특별시','부산광역시','대구광역시','인천광역시','광주광역시',
  '대전광역시','울산광역시','세종특별자치시','경기도','강원특별자치도',
  '충청북도','충청남도','전북특별자치도','전라남도','경상북도',
  '경상남도','제주특별자치도',
]

const ROOM_TIERS = [
  { value: '~20실', label: '~20실 (소형)' },
  { value: '21~40실', label: '21~40실 (중형)' },
  { value: '41실 이상', label: '41실 이상 (대형·다지점)' },
]

const PLAN_MAP: Record<string, { name: string; price: string; tier: string }> = {
  '~20실':      { name: 'BASIC',    price: '30,000', tier: '소형 고시원' },
  '21~40실':    { name: 'STANDARD', price: '50,000', tier: '중형 고시원' },
  '41실 이상':  { name: 'PREMIUM',  price: '70,000', tier: '대형 · 다지점' },
}

// ── 전화번호 자동 하이픈 ──
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

// ── 검사 함수 ──
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const isValidPhone = (v: string) => /^010-\d{4}-\d{4}$/.test(v)

// ── 필드 상태에 따른 보더 클래스 ──
function borderClass(touched: boolean, value: string, isValid: boolean) {
  if (!touched || !value) return 'border-gray-200'
  return isValid ? 'border-green-500' : 'border-red-400'
}

// ── 검사 메시지 컴포넌트 ──
function Hint({ touched, value, isValid, pass, fail }: {
  touched: boolean; value: string; isValid: boolean; pass: string; fail: string
}) {
  if (!touched || !value) return null
  return (
    <p className={`flex items-center gap-1 text-xs mt-1.5 font-bold ${isValid ? 'text-green-600' : 'text-red-500'}`}>
      {isValid ? <Check size={14} /> : <X size={14} />}
      {isValid ? pass : fail}
    </p>
  )
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [region, setRegion] = useState('')
  const [regionSigungu, setRegionSigungu] = useState('')
  const [roomTier, setRoomTier] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)
  const [agreedMarketing, setAgreedMarketing] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [done, setDone] = useState(false)

  // touched 상태
  const [t, setT] = useState<Record<string, boolean>>({})
  const touch = (field: string) => () => setT((prev) => ({ ...prev, [field]: true }))

  const allAgreed = agreedTerms && agreedPrivacy && agreedMarketing
  function toggleAll() {
    const next = !allAgreed
    setAgreedTerms(next)
    setAgreedPrivacy(next)
    setAgreedMarketing(next)
  }

  const strength = getPasswordStrength(password)

  // 검사 결과
  const v = {
    email: isValidEmail(email),
    name: name.length >= 2,
    phone: isValidPhone(phone),
    propertyName: propertyName.length >= 2,
    region: region !== '',
    regionSigungu: regionSigungu.trim() !== '',
    roomTier: roomTier !== '',
  }

  const inputBase = 'w-full px-4 py-3 rounded-2xl border bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-colors duration-150'

  async function handleSubmit() {
    setErrorMsg('')

    // ── 최종 검사: 첫 번째 문제만 표시 ──
    if (!v.email) { setErrorMsg('이메일 형식을 확인해주세요.'); return }
    if (strength === 'none' || strength === 'weak') { setErrorMsg('비밀번호를 영문 + 숫자 조합 8자 이상으로 입력해주세요.'); return }
    if (password !== passwordConfirm) { setErrorMsg('비밀번호가 일치하지 않아요.'); return }
    if (!v.name) { setErrorMsg('성함을 2자 이상 입력해주세요.'); return }
    if (!v.phone) { setErrorMsg('전화번호를 010-0000-0000 형식으로 입력해주세요.'); return }
    if (!v.propertyName) { setErrorMsg('고시원 이름을 2자 이상 입력해주세요.'); return }
    if (!v.region) { setErrorMsg('시·도를 선택해주세요.'); return }
    if (!v.regionSigungu) { setErrorMsg('시·군·구를 입력해주세요.'); return }
    if (!v.roomTier) { setErrorMsg('호실 수를 선택해주세요.'); return }
    if (!agreedTerms) { setErrorMsg('이용약관에 동의해주세요.'); return }
    if (!agreedPrivacy) { setErrorMsg('개인정보 수집·이용에 동의해주세요.'); return }

    // 모든 필드 touched 처리
    setT({ email: true, name: true, phone: true, propertyName: true, region: true, regionSigungu: true, roomTier: true })

    setLoading(true)
    try {
      // 회원가입 + 폼 데이터를 메타데이터로 전달 → 트리거(handle_new_user)가
      // profiles/properties에 한 번에 저장 (SECURITY DEFINER로 RLS·세션 문제 회피)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            property_name: propertyName,
            region,
            region_sigungu: regionSigungu,
            room_tier: roomTier,            // plan은 안 보냄 — 서버(트리거)가 room_tier로 재계산
            agreed_terms: agreedTerms,
            agreed_privacy: agreedPrivacy,
            agreed_marketing: agreedMarketing,
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setErrorMsg('가입할 수 없는 이메일이에요. 다른 이메일을 사용해주세요.')
        } else {
          setErrorMsg(getSafeErrorMessage(authError))
        }
        return
      }

      // 이미 가입된 이메일 감지: Confirm email ON이면 에러 대신 가짜 user가 옴
      // (난독화 user는 identities가 빈 배열)
      if (authData.user?.identities && authData.user.identities.length === 0) {
        setErrorMsg('가입할 수 없는 이메일이에요. 다른 이메일을 사용해주세요.')
        return
      }

      if (!authData.user?.id) {
        setErrorMsg('회원가입 처리 중 문제가 발생했어요. 다시 시도해주세요.')
        return
      }

      setDone(true)
    } catch (err) {
      setErrorMsg(getSafeErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // ── 성공 화면 ──
  if (done) {
    return (
      <div
        className="min-h-screen bg-[#FAFBFC] p-4 md:p-8 flex items-center justify-center"
        style={{ backgroundImage: 'linear-gradient(to right, rgba(147,197,253,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(147,197,253,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      >
        <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl shadow-blue-900/10 p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] mb-6">
            <Mail className="text-white" size={36} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">인증 메일을 발송했어요</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-8" style={{ wordBreak: 'keep-all' }}>
            <span className="font-bold text-[#2563EB]">{email}</span>로<br />
            인증 메일을 보내드렸어요.<br />
            메일함에서 인증을 완료하시면<br />
            로그인하실 수 있어요.
          </p>
          <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-5 py-3 rounded-2xl text-sm font-bold">
            메일이 안 보이면 스팸함도 확인해주세요
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-[#FAFBFC] p-4 md:p-8 flex items-center justify-center"
      style={{ backgroundImage: 'linear-gradient(to right, rgba(147,197,253,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(147,197,253,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
    >
      <div className="w-full max-w-5xl rounded-[40px] overflow-hidden shadow-2xl shadow-blue-900/10 flex flex-col lg:flex-row bg-white max-h-[calc(100vh-4rem)]">
      {/* ── 왼쪽 패널 ── */}
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

      {/* ── 오른쪽 패널 ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-12 lg:py-16">
          <h2 className="text-2xl font-black text-gray-900 mb-2">회원가입</h2>
          <p className="text-sm text-gray-500 mb-10" style={{ wordBreak: 'keep-all' }}>
            원장님의 고시원 정보를 입력해주세요.
          </p>

          {/* ① 이메일 */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={touch('email')}
              placeholder="example@email.com"
              className={`${inputBase} ${borderClass(!!t.email, email, v.email)}`}
            />
            <Hint touched={!!t.email} value={email} isValid={v.email}
              pass="사용 가능한 이메일이에요" fail="이메일 형식이 올바르지 않아요" />
          </div>

          {/* ② 비밀번호 + 강도 바 */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              placeholder="영문 + 숫자 조합 8자 이상"
              className={`${inputBase} border-gray-200`}
            />
            {strength !== 'none' && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strengthConfig[strength].width} ${strengthConfig[strength].color}`} />
                </div>
                <p className={`text-xs mt-1 font-bold ${
                  strength === 'weak' ? 'text-red-500' : strength === 'medium' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  비밀번호 강도: {strengthConfig[strength].label}
                </p>
              </div>
            )}
          </div>

          {/* ③ 비밀번호 확인 */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              비밀번호 확인 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              maxLength={128}
              placeholder="비밀번호를 다시 입력해주세요"
              className={`${inputBase} ${
                !passwordConfirm ? 'border-gray-200' : password === passwordConfirm ? 'border-green-500' : 'border-red-400'
              }`}
            />
            {passwordConfirm && (
              <p className={`flex items-center gap-1 text-xs mt-1.5 font-bold ${
                password === passwordConfirm ? 'text-green-600' : 'text-red-500'
              }`}>
                {password === passwordConfirm
                  ? <><Check size={14} /> 비밀번호가 일치해요</>
                  : <><X size={14} /> 비밀번호가 일치하지 않아요</>}
              </p>
            )}
          </div>

          {/* ④ 원장님 성함 + 전화번호 (한 줄 2칸) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                원장님 성함 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={touch('name')}
                placeholder="홍길동"
                className={`${inputBase} ${borderClass(!!t.name, name, v.name)}`}
              />
              <Hint touched={!!t.name} value={name} isValid={v.name}
                pass="확인했어요" fail="2자 이상 입력해주세요" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                onBlur={touch('phone')}
                placeholder="010-0000-0000"
                className={`${inputBase} ${borderClass(!!t.phone, phone, v.phone)}`}
              />
              <Hint touched={!!t.phone} value={phone} isValid={v.phone}
                pass="올바른 전화번호예요" fail="010-0000-0000 형식으로 입력해주세요" />
            </div>
          </div>

          {/* ⑤ 고시원 이름 + 시·도 + 시·군·구 (한 줄 3칸) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                고시원 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                onBlur={touch('propertyName')}
                placeholder="OO고시원"
                className={`${inputBase} ${borderClass(!!t.propertyName, propertyName, v.propertyName)}`}
              />
              <Hint touched={!!t.propertyName} value={propertyName} isValid={v.propertyName}
                pass="확인했어요" fail="2자 이상 입력해주세요" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                시·도 <span className="text-red-500">*</span>
              </label>
              <select
                value={region}
                onChange={(e) => { setRegion(e.target.value); setT((p) => ({ ...p, region: true })) }}
                onBlur={touch('region')}
                className={`${inputBase} appearance-none ${borderClass(!!t.region, region || (t.region ? '_' : ''), v.region)}`}
              >
                <option value="">선택</option>
                {SIDO_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Hint touched={!!t.region} value={t.region ? (region || '_') : ''} isValid={v.region}
                pass="선택 완료" fail="시·도를 선택해주세요" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                시·군·구 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={regionSigungu}
                onChange={(e) => setRegionSigungu(e.target.value)}
                onBlur={touch('regionSigungu')}
                placeholder="강남구"
                className={`${inputBase} ${borderClass(!!t.regionSigungu, regionSigungu, v.regionSigungu)}`}
              />
              <Hint touched={!!t.regionSigungu} value={regionSigungu} isValid={v.regionSigungu}
                pass="확인했어요" fail="시·군·구를 입력해주세요" />
            </div>
          </div>

          {/* ⑥ 호실 수 드롭다운 */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              호실 수 <span className="text-red-500">*</span>
            </label>
            <select
              value={roomTier}
              onChange={(e) => { setRoomTier(e.target.value); setT((p) => ({ ...p, roomTier: true })) }}
              onBlur={touch('roomTier')}
              className={`${inputBase} appearance-none ${borderClass(!!t.roomTier, roomTier || (t.roomTier ? '_' : ''), v.roomTier)}`}
            >
              <option value="">호실 수를 선택해주세요</option>
              {ROOM_TIERS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Hint touched={!!t.roomTier} value={t.roomTier ? (roomTier || '_') : ''} isValid={v.roomTier}
              pass="선택 완료" fail="호실 수를 선택해주세요" />
          </div>

          {/* ⑦ 자동 플랜 카드 */}
          {roomTier && PLAN_MAP[roomTier] && (
            <div className="mb-8 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] text-white rounded-[32px] p-6 relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#FCD34D]/10 rounded-full blur-3xl" />
              <div className="relative flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs font-black text-yellow-300 tracking-[0.2em] mb-1">
                    {PLAN_MAP[roomTier].name}
                  </div>
                  <div className="text-lg font-black">{PLAN_MAP[roomTier].tier}</div>
                  <div className="text-white/60 text-xs mt-1">{roomTier} · 자동 선택됨</div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tighter">{PLAN_MAP[roomTier].price}</span>
                    <span className="text-sm font-bold opacity-80">원</span>
                    <span className="text-xs opacity-60">/월</span>
                  </div>
                  <div className="inline-flex items-center gap-1 bg-yellow-400 text-[#1E3A8A] px-3 py-1 rounded-lg text-xs font-black mt-2">
                    🎁 베타 무료
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ⑧ 약관 동의 */}
          <div className="mb-8 bg-gray-50 rounded-3xl p-6 border border-gray-100">
            {/* 전체 동의 */}
            <label className="flex items-center gap-3 cursor-pointer pb-4 border-b border-gray-200 mb-4">
              <input
                type="checkbox"
                checked={allAgreed}
                onChange={toggleAll}
                className="w-5 h-5 rounded-md border-gray-300 cursor-pointer accent-[#2563EB]"
              />
              <span className="text-sm font-black text-gray-900">전체 동의</span>
            </label>

            <div className="space-y-3">
              {/* 이용약관 (필수) */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#2563EB]"
                />
                <span className="text-xs font-bold text-red-500">(필수)</span>
                <span className="text-sm text-gray-700">이용약관 동의</span>
                <span className="ml-auto text-xs text-gray-400 underline">준비 중</span>
              </label>

              {/* 개인정보 수집·이용 (필수) */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedPrivacy}
                  onChange={(e) => setAgreedPrivacy(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#2563EB]"
                />
                <span className="text-xs font-bold text-red-500">(필수)</span>
                <span className="text-sm text-gray-700">개인정보 수집·이용 동의</span>
                <span className="ml-auto text-xs text-gray-400 underline">준비 중</span>
              </label>

              {/* 마케팅 수신 동의 (선택) */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedMarketing}
                  onChange={(e) => setAgreedMarketing(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#2563EB]"
                />
                <span className="text-xs font-medium text-gray-400">(선택)</span>
                <span className="text-sm text-gray-700">마케팅 정보 수신 동의</span>
                <span className="ml-auto text-xs text-gray-400 underline">준비 중</span>
              </label>
            </div>
          </div>

          {/* ⑨ 인라인 에러 박스 */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-bold animate-[shake_0.3s_ease-in-out]">
              <X size={18} className="flex-shrink-0 mt-0.5" />
              <span style={{ wordBreak: 'keep-all' }}>{errorMsg}</span>
            </div>
          )}

          {/* ⑩ 가입하기 버튼 */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-base font-black transition-all duration-200 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] text-white hover:from-[#1E3A8A] hover:to-[#1E40AF] hover:shadow-lg hover:shadow-blue-900/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                처리 중...
              </span>
            ) : (
              '가입하기'
            )}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
