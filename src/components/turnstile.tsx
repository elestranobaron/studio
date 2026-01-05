
'use client';

import React, { useEffect, useRef, memo } from 'react';

declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: TurnstileOptions) => string | undefined;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileOptions {
  sitekey: string;
  theme?: 'light' | 'dark' | 'auto';
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
}

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

const Turnstile: React.FC<TurnstileProps> = ({ onSuccess, onExpire, onError }) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    
    const renderTurnstile = () => {
      if (ref.current && window.turnstile && !widgetIdRef.current) {
        const widgetId = window.turnstile.render(ref.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
          theme: 'dark',
          callback: (token) => onSuccess(token),
          'expired-callback': () => {
            onExpire?.();
            widgetIdRef.current = null; // Allow re-rendering
          },
          'error-callback': () => onError?.(),
        });
        if (widgetId) {
          widgetIdRef.current = widgetId;
        }
      }
    };

    if (typeof window.turnstile !== 'undefined') {
      renderTurnstile();
    } else {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
      script.async = true;
      script.defer = true;
      
      window.onloadTurnstileCallback = () => {
        renderTurnstile();
      };

      document.head.appendChild(script);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          console.warn('Error removing Turnstile widget:', error);
        }
      }
      if (script) {
        document.head.removeChild(script);
      }
      if (window.onloadTurnstileCallback) {
        delete window.onloadTurnstileCallback;
      }
    };
  }, [onSuccess, onExpire, onError]);

  return <div ref={ref} />;
};

export default memo(Turnstile);
