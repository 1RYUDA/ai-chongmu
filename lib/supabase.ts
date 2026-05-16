/**
 * ============================================================================
 * AI 총무 - Supabase 클라이언트 (앱 전체 공용 연결 도구)
 * ============================================================================
 * 본인 앱의 어느 화면에서든 이 파일의 `supabase` 를 가져다 쓰면
 * Supabase 데이터베이스/인증에 연결됩니다.
 *
 *   import { supabase } from '@/lib/supabase'
 *
 * 🔒 보안 설계 원칙 (요청하신 4·5·6·7번 반영):
 *   1) 환경변수만 사용 — URL·키를 코드에 직접 적지 않음 (하드코딩 금지)
 *   2) publishable(공개용) 키만 사용 — service_role 비밀키는 절대 import 안 함
 *   3) 환경변수 누락 시 즉시 명확한 에러 (조용한 오작동 방지)
 *   4) 싱글톤 — 실행 환경당 클라이언트 인스턴스 1개 (세션 충돌 방지)
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// ── 1. 환경변수 읽기 ────────────────────────────────────────────────
// process.env.NEXT_PUBLIC_* 값은 "빌드 시점"에 코드에 박혀 들어갑니다.
// ⚠️ .env.local 을 만들거나 수정한 뒤에는 반드시 개발 서버를 재시작해야
//    값이 반영됩니다! (Ctrl+C 로 끈 뒤 npm run dev 다시 실행)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ── 2. 환경변수 검증 (보안: 잘못된 설정으로 "조용히" 동작하는 것 방지) ──
// 값이 없으면 여기서 즉시 멈추고, 본인이 원인을 바로 알 수 있게 안내합니다.
// (50~60대 사장님이 쓰는 서비스이므로, 설정 실수가 운영 중에 터지지 않고
//  본인 개발 단계에서 잡히도록 일부러 강하게 막습니다.)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    [
      '🚨 [AI 총무] Supabase 환경변수가 설정되지 않았습니다.',
      '',
      '아래를 순서대로 확인하세요:',
      '  1) 프로젝트 최상위 폴더에 .env.local 파일이 있나요?',
      '  2) 그 안에 아래 두 줄이 정확히 있나요? (오타 주의)',
      '       NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co',
      '       NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_....',
      '  3) .env.local 을 만들/수정한 뒤 개발 서버를 재시작했나요?',
      '       → Ctrl+C 로 끄고 → npm run dev 다시 실행',
      '',
      '※ 이 메시지는 개발자(본인)용입니다. 실사용자에겐 노출되지 않습니다.',
    ].join('\n')
  )
}
// 위 if 에서 throw 했으므로, 여기부터 두 값은 100% string 임이 보장됩니다.
// (TypeScript 가 자동으로 "값이 있다"고 인식 → 타입 안전)

// ── 3. 싱글톤 클라이언트 생성 ───────────────────────────────────────
// "싱글톤" = 인스턴스를 1개만 만들어 재사용.
// ES 모듈은 처음 import 될 때 딱 한 번만 실행되고 그 결과가 캐시됩니다.
// 따라서 아래 `supabase` 는 각 실행 환경(브라우저 1개 / 서버 1개)에서
// 자동으로 단일 인스턴스가 됩니다.
//   → "Multiple GoTrueClient instances detected" 경고 및
//     로그인 세션 꼬임(충돌)을 예방합니다.
// (참고: 서버와 브라우저는 물리적으로 다른 환경이라 각자 1개씩 갖습니다.
//  "지구상에 단 1개"가 아니라 "환경당 1개"가 정확한 표현입니다.)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// ── 4. 안전한 에러 처리 도우미 (요청 7번) ──────────────────────────
// Supabase 에러 원문에는 내부 구조·쿼리 등 민감 정보가 섞일 수 있습니다.
// 이걸 화면에 그대로 띄우면 (1) 사장님이 겁먹고 (2) 공격자에게 힌트가 됩니다.
// → 콘솔에는 원문 전체(개발자만 봄), 사용자에겐 순화된 한 줄만 반환합니다.
export function getSafeErrorMessage(
  error: unknown,
  userMessage = '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'
): string {
  // 개발자(본인)만 보는 상세 로그 — 브라우저/서버 콘솔에 출력
  console.error('[AI 총무] Supabase 오류 상세 (개발자용):', error)
  // 사용자(50~60대 사장님)에게 보여줄 안전한 일반 메시지
  return userMessage
}

/* ────────────────────────────────────────────────────────────────────
 * 📖 향후 사용법 예시 (요청 3번 — 본인 참고용, 실제 작동 코드)
 *
 *   import { supabase, getSafeErrorMessage } from '@/lib/supabase'
 *
 *   // (1) 회원가입
 *   const { data, error } = await supabase.auth.signUp({
 *     email: '사장님이메일', password: '비밀번호',
 *   })
 *
 *   // (2) 로그인
 *   const { data, error } = await supabase.auth.signInWithPassword({
 *     email: '사장님이메일', password: '비밀번호',
 *   })
 *
 *   // (3) 내 고시원 목록 조회 — RLS 정책이 "내 데이터만" 자동 필터링
 *   const { data, error } = await supabase.from('properties').select('*')
 *
 *   // (4) 에러를 안전하게 사용자에게 표시
 *   if (error) {
 *     const 메시지 = getSafeErrorMessage(error) // 사용자에겐 일반 문구만
 *     // 화면에 `메시지` 표시 (원문은 콘솔에만 남음)
 *   }
 * ──────────────────────────────────────────────────────────────────── */
