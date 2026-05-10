'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // index.html로 자동 리다이렉트
    window.location.href = '/index.html';
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'sans-serif'
    }}>
      <p>로딩 중...</p>
    </div>
  );
}