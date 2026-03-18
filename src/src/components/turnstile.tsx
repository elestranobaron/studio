
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

const SCRIPT_ID = 'cloudflare-turnstile-script';

const Turnstile: React.FC<TurnstileProps> = ({ onSuccess, onExpire, onError }) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    
    const renderTurnstile = () => {
      if (ref.current && window.turnstile && !widgetIdRef.current) {
        try {
          const widgetId = window.turnstile.render(ref.current, {
            sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
            theme: 'dark',
            callback: (token) => onSuccess(token),
            'expired-callback': () => {
              onExpire?.();
              if (widgetIdRef.current) {
                  window.turnstile.reset(widgetIdRef.current);
              }
            },
            'error-callback': () => onError?.(),
          });
          if (widgetId) {
            widgetIdRef.current = widgetId;
          }
        } catch (e) {
          console.warn('Turnstile render error:', e);
        }
      }
    };

    // 1. Si l'objet métier est déjà là, on rend directement
    if (typeof window.turnstile !== 'undefined') {
      renderTurnstile();
    } 
    // 2. Sinon, on vérifie si le script (la commande) est déjà dans le DOM
    else {
      const existingScript = document.getElementById(SCRIPT_ID);
      
      if (existingScript) {
        // Le script est déjà en train de charger, on attend qu'il finisse
        const oldCallback = window.onloadTurnstileCallback;
        window.onloadTurnstileCallback = () => {
          if (oldCallback) oldCallback();
          renderTurnstile();
        };
      } else {
        // On crée le script pour la première fois
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
        script.async = true;
        script.defer = true;
        
        window.onloadTurnstileCallback = () => {
          renderTurnstile();
        };

        document.head.appendChild(script);
      }
    }

    return () => {
        // On ne supprime plus le script global du head pour éviter les re-chargements inutiles
        // On se contente de supprimer l'instance du widget pour cette page
        if (widgetIdRef.current && window.turnstile) {
            try {
                window.turnstile.remove(widgetIdRef.current);
            } catch (error) {
                // Ignore silent errors on unmount
            }
        }
        widgetIdRef.current = null;
    };
  }, [onSuccess, onExpire, onError]);

  return <div ref={ref} />;
};

export default memo(Turnstile);
