/**
 * ============================================================================
 * AI 총무 - Supabase 데이터베이스 타입 정의
 * ============================================================================
 * Supabase 테이블 구조를 TypeScript 타입으로 정의합니다.
 *
 * 🔒 [보안 의미] 타입을 엄격히 정의하면:
 *   - 존재하지 않는 컬럼/테이블 접근 코드를 "작성 단계"에서 빨간줄로 차단
 *   - 잘못된 형식의 데이터 입력을 컴파일 시점에 차단
 *   → 의도치 않은 데이터 접근·오염을 사전 예방합니다 (타입 안전성 = 보안)
 *
 * ⚠️ [중요 - 본인 확인 필요] 아래 타입은 본인이 알려주신 "컬럼 이름"만으로
 *   추론한 것입니다. 실제 Supabase의 정확한 자료형(특히 null 허용 여부,
 *   plan 컬럼의 실제 값 종류)과 다를 수 있습니다.
 *   → Phase A 후반에 아래 명령으로 "실제 DB에서" 정확한 타입을 뽑는 것을
 *     강력 권장합니다 (100% 정확):
 *       npx supabase gen types typescript --project-id <프로젝트ID> > lib/database.types.ts
 * ============================================================================
 */

// Supabase의 timestamptz(시간) 컬럼은 JS에서 ISO 문자열로 들어옵니다.
// 예: "2026-05-16T09:30:00.000Z"
type Timestamp = string

export type Database = {
  public: {
    Tables: {
      // ── profiles : 회원(사장님) 프로필 ─────────────────────────────
      // 회원가입 시 트리거가 auth.users → profiles 행을 자동 생성합니다.
      profiles: {
        // Row : SELECT(조회)했을 때 돌아오는 모양
        Row: {
          id: string // UUID, auth.users.id 와 동일 (기본키)
          name: string | null // 사장님 성함 (가입 직후엔 비어있을 수 있음)
          phone: string | null // 연락처
          email: string // 로그인 이메일
          plan: string // 요금제 (예: 'free'|'beta'|'pro') ※실제 값 확인 필요
          is_beta: boolean // 베타 사용자 여부
          created_at: Timestamp // 생성 시각 (DB가 자동 기록)
          updated_at: Timestamp // 수정 시각 (DB가 자동 기록)
        }
        // Insert : INSERT(추가)할 때 넣는 모양. id/시간은 DB 자동 → 선택적(?)
        Insert: {
          id: string
          name?: string | null
          phone?: string | null
          email: string
          plan?: string
          is_beta?: boolean
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        // Update : UPDATE(수정)할 때 넣는 모양. 전부 선택적(?)
        Update: {
          id?: string
          name?: string | null
          phone?: string | null
          email?: string
          plan?: string
          is_beta?: boolean
          created_at?: Timestamp
          updated_at?: Timestamp
        }
      }

      // ── properties : 고시원(매물) 정보 ─────────────────────────────
      properties: {
        Row: {
          id: string // UUID (기본키)
          user_id: string // 소유 사장님 (profiles.id 참조) — RLS 기준 컬럼
          name: string // 고시원 이름
          region: string // 지역 (예: 서울 관악구)
          address: string // 상세 주소
          room_count: number // 방 개수
          created_at: Timestamp
          updated_at: Timestamp
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          region: string
          address: string
          room_count: number
          created_at?: Timestamp
          updated_at?: Timestamp
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          region?: string
          address?: string
          room_count?: number
          created_at?: Timestamp
          updated_at?: Timestamp
        }
      }
    }
    // 아직 사용 안 함 (Supabase 자동 생성 형식과 호환되도록 비워둠)
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
  }
}
