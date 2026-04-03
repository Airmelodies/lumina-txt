'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── PWA Install Hook ────────────────────────────────────────
// Handles service worker registration and the browser's
// `beforeinstallprompt` event so users can install Lumina TXT
// as a desktop/mobile app.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getStandaloneStatus(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(getStandaloneStatus);
  const installedRef = useRef(getStandaloneStatus());

  useEffect(() => {
    // ── Register the service worker ──
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[LXT] Service worker registered:', registration.scope);

          // Check for updates on reload
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'activated' &&
                  navigator.serviceWorker.controller
                ) {
                  console.log('[LXT] New service worker activated — refresh available');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[LXT] Service worker registration failed:', err);
        });
    }

    // ── Listen for the install prompt ──
    const handleBeforeInstall = (e: Event) => {
      // Prevent the mini-infobar on mobile
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    // ── Check if already installed ──
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      console.log('[LXT] App installed as PWA');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Standalone status is initialized from getStandaloneStatus() above,
    // avoiding a synchronous setState in this effect.

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
      return true;
    }
    return false;
  };

  return {
    canInstall: !!installPrompt,
    isInstalled,
    promptInstall,
  };
}
