import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        // 루트('/') 요청을 정적 랜딩(public/index.html)으로 연결.
        // beforeFiles라서 app/page.tsx(로딩중 바운서)보다 먼저 적용 → 이를 가림.
        { source: '/', destination: '/index.html' },
      ],
    }
  },
};

export default nextConfig;
