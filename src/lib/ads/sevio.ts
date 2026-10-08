export interface SevioBannerConfig {
  zone: string;
  inventoryId: string;
  accountId: string;
  width: number;
  height: number;
}

interface SevioPreferences {
  zone: string;
  adType: 'banner';
  inventoryId: string;
  accountId: string;
}

declare global {
  interface Window {
    sevioads?: SevioPreferences[][] | { push: (preferences: SevioPreferences[]) => void };
  }
}

export const SEVIO_ASSET_BANNER: SevioBannerConfig = {
  zone: '31bdaf64-ec75-4a6b-98d0-4d4187e44796',
  inventoryId: 'c225e8c0-7180-4408-b66c-259269994812',
  accountId: '74de1d7c-8015-4163-9bf7-4480c2e517b1',
  width: 300,
  height: 250,
};

export const SEVIO_HOME_BANNER: SevioBannerConfig = {
  zone: '244ab501-7b0f-436c-99f1-4fde4da9367c',
  inventoryId: 'c225e8c0-7180-4408-b66c-259269994812',
  accountId: '74de1d7c-8015-4163-9bf7-4480c2e517b1',
  width: 728,
  height: 90,
};

export const SEVIO_HOME_MOBILE_BANNER: SevioBannerConfig = {
  zone: '2c581890-eeb1-43f3-ad91-05e4dd601f41',
  inventoryId: 'c225e8c0-7180-4408-b66c-259269994812',
  accountId: '74de1d7c-8015-4163-9bf7-4480c2e517b1',
  width: 320,
  height: 100,
};

const SCRIPT_ID = 'sevio-ads-loader';
const SCRIPT_URL = 'https://cdn.adx.ws/scripts/loader.js';
let scriptPromise: Promise<void> | null = null;

export function loadSevioScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing?.dataset.state === 'loaded') return Promise.resolve();

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = existing ?? document.createElement('script');
    const timeout = window.setTimeout(handleError, 20_000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    }

    function handleLoad() {
      cleanup();
      script.dataset.state = 'loaded';
      resolve();
    }

    function handleError() {
      cleanup();
      script.remove();
      scriptPromise = null;
      reject(new Error('Sevio advertising script is unavailable.'));
    }

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!script.isConnected) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.dataset.state = 'loading';
      document.head.appendChild(script);
    }
  });
  return scriptPromise;
}

export function registerSevioBanner(config: SevioBannerConfig): void {
  window.sevioads = window.sevioads ?? [];
  window.sevioads.push([{
    zone: config.zone,
    adType: 'banner',
    inventoryId: config.inventoryId,
    accountId: config.accountId,
  }]);
}
