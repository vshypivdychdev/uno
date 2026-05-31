import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaInstall {
  canInstall: boolean;
  isInstalled: boolean;
  triggerInstall: () => Promise<void>;
}

function isInstallPromptEvent(e: Event): e is BeforeInstallPromptEvent {
  return typeof (e as BeforeInstallPromptEvent).prompt === 'function';
}

/**
 * Captures the browser's beforeinstallprompt event so we can trigger
 * the PWA install dialog from a button click instead of waiting for
 * the browser to auto-prompt (which can take multiple visits).
 */
export function usePwaInstall(): PwaInstall {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches,
  );

  useEffect(() => {
    if (isInstalled) return;

    function onBeforeInstallPrompt(e: Event): void {
      e.preventDefault();
      if (isInstallPromptEvent(e)) {
        setInstallEvent(e);
      }
    }

    function onAppInstalled(): void {
      setIsInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [isInstalled]);

  async function triggerInstall(): Promise<void> {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === 'accepted') {
        setInstallEvent(null);
      }
    } catch (err) {
      console.error('[PWA] Install prompt failed:', err);
    }
  }

  return { canInstall: installEvent !== null, isInstalled, triggerInstall };
}
