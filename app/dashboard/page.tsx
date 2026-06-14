'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import './dashboard.css'

// ── 호실 상태 정의 ──
type RoomState = 'occupied' | 'overdue' | 'vacant' | 'clean'
const ROOM_OVERRIDES: Record<string, RoomState> = {
  '105': 'vacant', '203': 'clean', '205': 'overdue',
  '302': 'overdue', '307': 'vacant', '405': 'vacant',
}
const STATE_LABEL: Record<RoomState, string> = { occupied: '입주', overdue: '미납', vacant: '공실', clean: '정리' }
const STATE_COLOR: Record<RoomState, string> = { occupied: '#3B82F6', overdue: '#EF4444', vacant: '#D1D5DB', clean: '#FBBF24' }
const FLOORS = 4
const PER = 7
const FILTERS: { key: 'all' | RoomState; label: string }[] = [
  { key: 'all', label: '전체' }, { key: 'occupied', label: '입주' },
  { key: 'overdue', label: '미납' }, { key: 'vacant', label: '공실' }, { key: 'clean', label: '정리' },
]

// ── 사이드바 메뉴 (데모: '홈'만 활성) ──
const NAV = [
  { icon: '🏠', label: '홈', active: true },
  { icon: '👥', label: '입주자 관리', badge: '24', badgeClass: 'bg-yellow-400 text-yellow-900' },
  { icon: '🔔', label: '자동 알림' },
  { icon: '💰', label: '미납 관리', badge: '2', badgeClass: 'bg-red-500 text-white' },
  { icon: '📈', label: '매출 대시보드' },
  { icon: '⚙️', label: '설정' },
]

// ── 데모 데이터 (시안 값 그대로) ──
const BRANCHES = [
  { name: '행복 고시원 본점', rooms: '28실' },
  { name: '행복 고시원 2호점', rooms: '40실' },
  { name: '행복 고시원 3호점', rooms: '22실' },
]
const WEEK_ALERTS = [
  { room: '101호 김민수', fee: '입실료 35만원', date: '5/15 (화)' },
  { room: '102호 박지영', fee: '입실료 35만원', date: '5/16 (수)' },
  { room: '205호 이철수', fee: '입실료 40만원', date: '5/17 (목)' },
]
const MOVEOUTS = [
  { name: '401호 이정민 님', desc: '6/19 (금) 퇴실 · 보증금 정산 예정', badge: 'D-7', badgeClass: 'badge-pending' },
  { name: '203호 김하늘 님', desc: '퇴실 완료 · 호실 정리 중', badge: '정리 중', badgeClass: 'badge-new' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  // 호실 현황판 상태
  const [filter, setFilter] = useState<'all' | RoomState>('all')
  const [closedFloors, setClosedFloors] = useState<Set<number>>(new Set())
  // 지점 드롭다운 상태
  const [branchOpen, setBranchOpen] = useState(false)
  const [branchName, setBranchName] = useState('행복 고시원 본점')
  const branchRef = useRef<HTMLDivElement>(null)
  // 사이드바 접기/펼치기
  const [collapsed, setCollapsed] = useState(false)

  // 호실 생성 (4층 × 7호)
  const rooms = useMemo(() => {
    const arr: { no: string; floor: number; state: RoomState }[] = []
    for (let f = 1; f <= FLOORS; f++) {
      for (let n = 1; n <= PER; n++) {
        const no = `${f}0${n}`
        arr.push({ no, floor: f, state: ROOM_OVERRIDES[no] || 'occupied' })
      }
    }
    return arr
  }, [])

  // 카운트 / 입실률 파생
  const counts = useMemo(() => {
    const c: Record<RoomState, number> = { occupied: 0, overdue: 0, vacant: 0, clean: 0 }
    rooms.forEach((r) => { c[r.state]++ })
    const total = rooms.length
    const rate = Math.round(((c.occupied + c.overdue) / total) * 100)
    return { ...c, total, rate }
  }, [rooms])

  // ── 인증 가드 (getUser) ──
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (error || !data.user) {
        router.replace('/login')
        return
      }
      setUser(data.user)
      const d = new Date()
      const days = ['일', '월', '화', '수', '목', '금', '토']
      setToday(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}. ${days[d.getDay()]}요일`)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [router])

  // ── 지점 메뉴 바깥 클릭 시 닫기 ──
  useEffect(() => {
    if (!branchOpen) return
    function onClick(e: MouseEvent) {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) setBranchOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [branchOpen])

  function toggleFloor(f: number) {
    setClosedFloors((prev) => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f); else next.add(f)
      return next
    })
  }

  async function handleLogout() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // ── 로딩 화면 ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="w-9 h-9 border-[3px] border-gray-200 border-t-[#2563EB] rounded-full animate-spin" />
          <p className="text-sm font-bold">불러오는 중...</p>
        </div>
      </div>
    )
  }

  const emailInitial = (user?.email?.[0] || 'O').toUpperCase()

  return (
    <div
      className="dash-root h-screen overflow-hidden bg-[#FAFBFC] p-4 md:p-8"
      style={{ backgroundImage: 'linear-gradient(to right, rgba(147,197,253,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(147,197,253,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
    >
      <div className="max-w-7xl mx-auto h-full bg-white rounded-3xl strong-shadow overflow-hidden">
        <div className="flex h-full">
          {/* ── 사이드바 (고정 + 접기/펼치기) ── */}
          <div className={`sidebar-container text-white flex flex-col h-full flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-[72px]' : 'w-60'}`}>
            <div className={`p-4 border-b border-white/10 flex items-center gap-2 ${collapsed ? 'flex-col' : 'justify-between'}`}>
              <div className="brand">
                <span className="inline-flex items-center justify-center bg-white rounded-xl flex-shrink-0" style={{ width: 42, height: 42 }}>
                  <img src="/logo.png" alt="AI 총무" className="object-contain" style={{ width: 30, height: 30 }} />
                </span>
                {!collapsed && (
                  <div className="text-left">
                    <div className="brand-name">AI 총무</div>
                    <div className="brand-sub">BY GOSHI</div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                title={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition flex-shrink-0 text-sm"
              >
                {collapsed ? '☰' : '◀'}
              </button>
            </div>
            <nav className="flex-1 py-3 overflow-y-auto">
              {NAV.map((item) => (
                <div
                  key={item.label}
                  title={collapsed ? item.label : undefined}
                  className={`sidebar-item py-3 flex items-center gap-3 ${item.active ? 'active' : ''} ${collapsed ? 'px-0 justify-center' : 'px-5'}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!collapsed && <span className={`text-sm ${item.active ? 'font-bold' : ''}`}>{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-bold ${item.badgeClass}`}>{item.badge}</span>
                  )}
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-white/10">
              <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                <div className="w-9 h-9 bg-yellow-400 rounded-full flex items-center justify-center text-[#1E3A8A] font-black flex-shrink-0" title={collapsed ? (user?.email || '') : undefined}>{emailInitial}</div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate">{user?.email}</div>
                    <div className="text-[10px] opacity-70">행복 고시원</div>
                  </div>
                )}
              </div>
              {collapsed ? (
                <button title="카톡 상담" className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold">💬</button>
              ) : (
                <button className="mt-3 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold">💬 카톡 상담</button>
              )}
            </div>
          </div>

          {/* ── 메인 (헤더 고정 + 본문만 스크롤) ── */}
          <div className="flex-1 flex flex-col bg-[#FAFBFC] min-w-0 overflow-hidden">
            {/* 헤더 (상단 고정) */}
            <div className="bg-white border-b border-gray-100 px-6 md:px-8 py-4 flex items-center justify-between gap-3 flex-wrap flex-shrink-0">
              <div>
                <div className="text-sm text-gray-500 flex items-center gap-2 font-semibold">
                  <span className="live-dot" /><span>{today}</span>
                </div>
                <h2 className="t-page" style={{ wordBreak: 'keep-all' }}>
                  안녕하세요! <span className="text-[#2563EB]">{user?.email}</span> 원장님! 👋
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button className="relative w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-base">🔔</span>
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">3</span>
                </button>
                <button className="px-4 py-2 bg-[#1E3A8A] text-white rounded-lg text-xs font-bold">+ 신규 입주</button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="px-4 py-2 border-2 border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-60"
                >
                  {signingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              {/* 지표 카드 4개 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="stat-card bg-white rounded-2xl p-4 border border-gray-100 soft-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">👥</span>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+2</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900">24<span className="text-sm text-gray-500 font-medium">명</span></div>
                  <div className="text-xs text-gray-500">입주자</div>
                </div>
                <div className="stat-card bg-white rounded-2xl p-4 border border-gray-100 soft-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">🚪</span>
                    <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">대기</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900">3<span className="text-sm text-gray-500 font-medium">개</span></div>
                  <div className="text-xs text-gray-500">공실</div>
                </div>
                <div className="stat-card bg-white rounded-2xl p-4 border border-red-100 soft-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">⚠️</span>
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">조치</span>
                  </div>
                  <div className="text-2xl font-black text-red-600">2<span className="text-sm text-red-400 font-medium">건</span></div>
                  <div className="text-xs text-gray-500">미납</div>
                </div>
                <div className="stat-card rounded-2xl p-4 text-white soft-shadow" style={{ background: 'linear-gradient(135deg, #1E3A8A, #3B82F6)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">💰</span>
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">+8%</span>
                  </div>
                  <div className="text-2xl font-black">840<span className="text-sm opacity-80 font-medium">만</span></div>
                  <div className="text-xs opacity-80">이번 달 매출</div>
                </div>
              </div>

              {/* 오늘 처리할 일 */}
              <div className="bg-white rounded-2xl p-6 soft-shadow border border-gray-100 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="t-section">⚡ 오늘 처리할 일</h3>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">3건</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100 flex-wrap">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">!</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900">302호 정수진 - 미납 3일째</div>
                      <div className="text-xs text-gray-500">입실료 38만원 · 5월 7일 납부 예정이었음</div>
                    </div>
                    <button className="btn-primary bg-[#1E3A8A] text-white px-3 py-1.5 rounded-lg text-xs font-bold">카톡 보내기</button>
                    <button className="border-2 border-green-600 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-50">✓ 입금 확인</button>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100 flex-wrap">
                    <div className="w-8 h-8 bg-yellow-500 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">📅</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900">405호 신규 입주 예정</div>
                      <div className="text-xs text-gray-500">김영수 · 내일 오후 2시 도착 예정</div>
                    </div>
                    <button className="border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold">상세</button>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100 flex-wrap">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold flex-shrink-0">🧹</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900">청소 일정 - 203호, 405호</div>
                      <div className="text-xs text-gray-500">퇴실 후 청소 필요</div>
                    </div>
                    <button className="border border-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold">완료</button>
                  </div>
                </div>
              </div>

              {/* 호실 현황판 */}
              <div className="bg-white rounded-2xl p-6 soft-shadow border border-gray-100 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="t-section">🏢 호실 현황판</h3>
                    {/* 지점 드롭다운 (PREMIUM 전용 · 데모) */}
                    <div className="relative" ref={branchRef}>
                      <button
                        onClick={() => setBranchOpen((o) => !o)}
                        className="flex items-center gap-1.5 bg-blue-50 text-[#1E3A8A] font-extrabold text-sm px-3 py-1.5 rounded-xl hover:bg-blue-100 transition"
                      >
                        <span>🏬</span><span>{branchName}</span><span className="text-xs">▼</span>
                        <span className="ml-1 text-[10px] bg-[#1E3A8A] text-white px-1.5 py-0.5 rounded-full font-black">PREMIUM</span>
                      </button>
                      {branchOpen && (
                        <div className="branch-menu">
                          <div className="px-3 py-1.5 text-[11px] font-black text-gray-400">지점 선택 (총 3곳)</div>
                          {BRANCHES.map((b) => (
                            <div
                              key={b.name}
                              className={`branch-item ${branchName === b.name ? 'on' : ''}`}
                              onClick={() => { setBranchName(b.name); setBranchOpen(false) }}
                            >
                              <span>{b.name}</span><span className="text-xs text-gray-400 font-bold">{b.rooms}</span>
                            </div>
                          ))}
                          <div className="border-t border-gray-100 mt-1 pt-1">
                            <div className="branch-item text-[#1E3A8A]" onClick={() => alert('새 지점 추가는 실제 버전에서 지원됩니다.')}>
                              <span>+ 지점 추가</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 필터 버튼 */}
                  <div className="flex flex-wrap gap-1.5">
                    {FILTERS.map((ft) => (
                      <button key={ft.key} onClick={() => setFilter(ft.key)} className={`fbtn ${filter === ft.key ? 'on' : ''}`}>
                        {ft.label} {ft.key === 'all' ? counts.total : counts[ft.key]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 한눈 요약 막대 */}
                <div className="mt-3 mb-1 seg">
                  {(['occupied', 'overdue', 'clean', 'vacant'] as RoomState[])
                    .filter((k) => counts[k] > 0)
                    .map((k) => (
                      <div key={k} title={`${STATE_LABEL[k]} ${counts[k]}`} style={{ width: `${(counts[k] / counts.total) * 100}%`, background: STATE_COLOR[k] }} />
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-gray-500 mb-5">
                  <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#3B82F6' }} />입주 <b className="text-gray-800">{counts.occupied}</b></span>
                  <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#EF4444' }} />미납 <b className="text-gray-800">{counts.overdue}</b></span>
                  <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#D1D5DB' }} />공실 <b className="text-gray-800">{counts.vacant}</b></span>
                  <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#FBBF24' }} />정리 <b className="text-gray-800">{counts.clean}</b></span>
                  <span className="ml-auto text-[#1E3A8A]">입실률 <b>{counts.rate}%</b></span>
                </div>

                {/* 층별 (위가 높은 층, 아래가 1층 → 역순) */}
                <div className="space-y-1">
                  {[4, 3, 2, 1].map((f) => {
                    const fr = rooms.filter((r) => r.floor === f)
                    const va = fr.filter((r) => r.state === 'vacant').length
                    const ov = fr.filter((r) => r.state === 'overdue').length
                    const closed = closedFloors.has(f)
                    return (
                      <div key={f}>
                        <div className="floor-head" onClick={() => toggleFloor(f)}>
                          <div className="flex items-center gap-2">
                            <span className={`chev text-gray-400 text-sm ${closed ? 'closed' : ''}`}>▼</span>
                            <b className="text-gray-900">{f}층</b>
                            <span className="text-xs text-gray-400 font-bold">{fr.length}실</span>
                          </div>
                          <div className="flex gap-1.5">
                            {va > 0 && <span className="floor-chip" style={{ background: '#F3F4F6', color: '#6B7280' }}>공실 {va}</span>}
                            {ov > 0 && <span className="floor-chip" style={{ background: '#FEE2E2', color: '#991B1B' }}>미납 {ov}</span>}
                            {va === 0 && ov === 0 && <span className="floor-chip" style={{ background: '#D1FAE5', color: '#065F46' }}>정상</span>}
                          </div>
                        </div>
                        {!closed && (
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-1 pb-2">
                            {fr.map((r) => {
                              const dim = filter !== 'all' && r.state !== filter
                              return (
                                <div key={r.no} className={`room room-${r.state}${dim ? ' dim' : ''}`}>
                                  <b>{r.no}</b><span>{STATE_LABEL[r.state]}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <p className="text-xs text-gray-500 mt-4">💡 호실을 누르면 입주자 상세로 이동해요. 층 제목을 누르면 접거나 펼칠 수 있어요. (호실이 많아도 깔끔하게 관리됩니다)</p>
              </div>

              {/* 하단 3열 */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* 이번 주 자동 알림 */}
                <div className="bg-white rounded-2xl p-5 soft-shadow border border-gray-100">
                  <h3 className="t-section">📅 이번 주 자동 알림 예정</h3>
                  <div className="space-y-2 mt-2">
                    {WEEK_ALERTS.map((a, i) => (
                      <div key={a.room} className={`flex items-center justify-between py-2 ${i < WEEK_ALERTS.length - 1 ? 'border-b border-gray-50' : ''}`}>
                        <div>
                          <div className="font-bold text-sm text-gray-900">{a.room}</div>
                          <div className="text-xs text-gray-500">{a.fee}</div>
                        </div>
                        <div className="text-xs font-bold text-blue-600">{a.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 이번 달 퇴실 예정 */}
                <div className="bg-white rounded-2xl p-5 soft-shadow border border-gray-100">
                  <h3 className="t-section">🚪 이번 달 퇴실 예정</h3>
                  <div className="space-y-2 mt-2">
                    {MOVEOUTS.map((m, i) => (
                      <div key={m.name} className={`flex items-center justify-between py-2 ${i < MOVEOUTS.length - 1 ? 'border-b border-gray-50' : ''}`}>
                        <div>
                          <div className="font-bold text-sm text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-500">{m.desc}</div>
                        </div>
                        <span className={`badge ${m.badgeClass}`}>{m.badge}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">퇴실 7일 전, 확인 카톡이 자동 발송됩니다.</p>
                </div>
                {/* 이번 달 목표 달성률 */}
                <div className="bg-white rounded-2xl p-5 soft-shadow border border-gray-100">
                  <h3 className="t-section">🎯 이번 달 목표 달성률</h3>
                  <div className="mb-3 mt-2">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-600">목표: 1,200만원</span>
                      <span className="font-black text-gray-900">70%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="progress-bar h-full rounded-full" style={{ width: '70%' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="text-center p-2.5 bg-green-50 rounded-xl">
                      <div className="text-[10px] text-gray-600">수납 완료</div>
                      <div className="font-black text-green-700 text-sm">840만</div>
                    </div>
                    <div className="text-center p-2.5 bg-yellow-50 rounded-xl">
                      <div className="text-[10px] text-gray-600">미수금</div>
                      <div className="font-black text-yellow-700 text-sm">360만</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
