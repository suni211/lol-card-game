import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: { theme: string; size: string; width: number; text: string; logo_alignment: string }) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (response: { credential: string }) => void;
  text?: 'signin_with' | 'signup_with';
}

export default function GoogleSignInButton({ onCredential, text = 'signin_with' }: GoogleSignInButtonProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
      setError('Google 로그인 설정이 없습니다. 관리자에게 문의하세요.');
      return;
    }
    let canceled = false;
    const initialize = () => {
      if (canceled || !window.google?.accounts?.id || !elementRef.current) return;
      try {
        elementRef.current.replaceChildren();
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callbackRef.current(response),
        });
        window.google.accounts.id.renderButton(elementRef.current, {
          theme: 'outline',
          size: 'large',
          width: Math.min(360, Math.max(240, window.innerWidth - 80)),
          text,
          logo_alignment: 'left',
        });
        setError('');
      } catch {
        setError('Google 로그인 버튼을 불러오지 못했습니다.');
      }
    };
    if (window.google?.accounts?.id) {
      initialize();
    } else {
      let script = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', initialize);
      script.addEventListener('error', () => !canceled && setError('Google 로그인 서버에 연결하지 못했습니다.'));
      const timer = window.setTimeout(() => {
        if (!canceled && !window.google?.accounts?.id) setError('Google 로그인 버튼 로딩이 지연되고 있습니다. 새로고침해 주세요.');
      }, 12000);
      return () => {
        canceled = true;
        window.clearTimeout(timer);
        script?.removeEventListener('load', initialize);
      };
    }
    return () => { canceled = true; };
  }, [clientId, text]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={elementRef} className="flex w-full min-h-10 justify-center" />
      {error && <p role="alert" className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
