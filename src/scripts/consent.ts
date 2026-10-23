import {
  CONSENT_STORAGE_KEY,
  isAnalyticsEvent,
  isSafeAnalyticsLocation,
  makeConsent,
  parseConsent,
  type ConsentChoice,
} from '../lib/analytics';

type ConsentSignal = {
  analytics_Storage: 'granted' | 'denied';
  ad_Storage: 'denied';
};
type ClarityCall = ['consentv2', ConsentSignal] | ['event', string];
type Clarity = ((...args: ClarityCall) => void) & { q?: ClarityCall[] };
type AnalyticsWindow = Window & { clarity?: Clarity };

const root = document.querySelector<HTMLElement>('[data-consent-root]');
const browser = window as AnalyticsWindow;

if (root && root.dataset['initialized'] !== 'true') {
  root.dataset['initialized'] = 'true';
  const projectId = root.dataset['projectId'] ?? '';
  const enabled =
    root.dataset['enabled'] === 'true' && /^[a-z0-9]{6,20}$/i.test(projectId);
  const banner = document.querySelector<HTMLElement>('#consent-banner');
  const dialog = document.querySelector<HTMLDialogElement>(
    '#consent-preferences',
  );
  const status = document.querySelector<HTMLElement>('#consent-status');
  let choice: ConsentChoice | null = null;
  let started = false;
  let loaded = false;
  let failed = false;
  let opener: HTMLElement | null = null;
  const resetParameter = 'privacy-reset';
  let resetRequired =
    new URL(location.href).searchParams.get(resetParameter) === '1';

  function clearResetMarker() {
    resetRequired = false;
    const url = new URL(location.href);
    url.searchParams.delete(resetParameter);
    history.replaceState(history.state, '', url);
    document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
      const destination = new URL(link.href);
      if (
        destination.origin === location.origin &&
        destination.searchParams.has(resetParameter)
      ) {
        destination.searchParams.delete(resetParameter);
        link.href = destination.href;
      }
    });
  }

  function preserveResetMarker() {
    // This flag can only disable tracking. It prevents a failed storage write
    // from reviving an old acceptance after refresh or an internal navigation.
    resetRequired = true;
    const current = new URL(location.href);
    current.searchParams.set(resetParameter, '1');
    history.replaceState(history.state, '', current);
    document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
      const url = new URL(link.href);
      if (
        url.origin === location.origin &&
        !link.hasAttribute('download') &&
        (url.pathname.endsWith('/') || url.pathname.endsWith('.html'))
      ) {
        url.searchParams.set(resetParameter, '1');
        link.href = url.href;
      }
    });
  }

  try {
    if (resetRequired) {
      choice = 'rejected';
      localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify(makeConsent('rejected', projectId)),
      );
      if (
        parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY), projectId)
          ?.choice === 'rejected'
      )
        clearResetMarker();
    } else {
      const saved = localStorage.getItem(CONSENT_STORAGE_KEY);
      const record = parseConsent(saved, projectId);
      // Do not resume an old grant if browser storage can no longer be updated.
      // A new explicit choice can still be session-only.
      if (record?.choice === 'accepted' && saved) {
        localStorage.setItem(CONSENT_STORAGE_KEY, saved);
      }
      choice = record?.choice ?? null;
    }
  } catch {
    // Storage can be disabled. A fresh visit always defaults to no tracking.
    if (resetRequired) choice = 'rejected';
  }
  if (resetRequired) preserveResetMarker();

  function setStatus(message: string) {
    if (status) status.textContent = message;
  }

  function announceState() {
    root!.dataset['choice'] = choice ?? 'unset';
    if (!enabled) {
      setStatus(
        'Optional analytics is currently disabled. No Clarity script is loaded.',
      );
    } else if (failed) {
      setStatus(
        'Optional analytics is unavailable. All website features still work.',
      );
    } else if (choice === 'accepted') {
      setStatus(
        isSafeAnalyticsLocation(location.href, document.referrer)
          ? 'Optional analytics accepted. You can withdraw consent at any time.'
          : 'Optional analytics is paused on this page to protect URL privacy.',
      );
    } else if (choice === 'rejected') {
      setStatus('Optional analytics rejected. No optional tracking runs.');
    } else {
      setStatus('Optional analytics is off until you choose to accept it.');
    }
    if (banner) banner.hidden = !enabled || choice !== null;
  }

  function signal(granted: boolean) {
    try {
      browser.clarity?.('consentv2', {
        analytics_Storage: granted ? 'granted' : 'denied',
        ad_Storage: 'denied',
      });
    } catch {
      // Analytics is never allowed to interrupt an action or consent choice.
    }
  }

  function start() {
    if (
      !enabled ||
      choice !== 'accepted' ||
      started ||
      !isSafeAnalyticsLocation(location.href, document.referrer)
    )
      return;

    started = true;
    const queue: Clarity = (...args: ClarityCall) => {
      queue.q?.push(args);
    };
    queue.q = [];
    browser.clarity = queue;
    signal(true);
    try {
      const script = document.createElement('script');
      script.id = 'folio-clarity-script';
      script.async = true;
      script.src = `https://www.clarity.ms/tag/${projectId}`;
      script.referrerPolicy = 'no-referrer';
      script.dataset['status'] = 'loading';
      script.addEventListener(
        'load',
        () => {
          loaded = true;
          script.dataset['status'] = 'loaded';
        },
        { once: true },
      );
      script.addEventListener(
        'error',
        () => {
          failed = true;
          script.dataset['status'] = 'failed';
          queue.q = [];
          delete browser.clarity;
          announceState();
        },
        { once: true },
      );
      document.head.append(script);
    } catch {
      failed = true;
      queue.q = [];
      delete browser.clarity;
      announceState();
    }
  }

  function eraseClarityCookies() {
    // Only this origin's Clarity cookies are accessible; browser-owned third-party
    // cookies cannot be deleted by this site. Never clear unrelated site cookies.
    const hostParts = location.hostname.split('.');
    const domains = ['', location.hostname];
    for (let index = 0; index < hostParts.length - 1; index += 1) {
      domains.push(`.${hostParts.slice(index).join('.')}`);
    }
    const pathParts = location.pathname.split('/').filter(Boolean);
    const paths = new Set(['/']);
    for (let index = 1; index <= pathParts.length; index += 1) {
      paths.add(`/${pathParts.slice(0, index).join('/')}/`);
    }
    for (const name of ['_clck', '_clsk']) {
      for (const path of paths) {
        for (const domain of domains) {
          try {
            document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax${domain ? `; Domain=${domain}` : ''}`;
          } catch {
            // Cookie restrictions must never prevent the recorder reset/reload.
          }
        }
      }
    }
  }

  function stop(rejectionPersisted = true) {
    eraseClarityCookies();
    if (!rejectionPersisted) preserveResetMarker();
    if (!started) return;
    signal(false);
    document.querySelector('#folio-clarity-script')?.remove();
    // Removing a downloaded script cannot stop its timers/listeners. Reloading
    // destroys the active recorder; the persisted rejection prevents reloading it.
    location.reload();
  }

  function closePreferences() {
    dialog?.close();
    opener?.focus();
  }

  function choose(next: ConsentChoice) {
    if (!enabled) return;
    choice = next;
    let saved = false;
    try {
      localStorage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify(makeConsent(next, projectId)),
      );
      saved =
        parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY), projectId)
          ?.choice === next;
    } catch {
      // A session-only choice remains valid; it is never assumed on a new visit.
      if (next === 'rejected') {
        try {
          localStorage.removeItem(CONSENT_STORAGE_KEY);
        } catch {
          // An unreadable/unwritable stored grant cannot resume on startup.
        }
      }
    }
    if (resetRequired && (saved || next === 'accepted')) clearResetMarker();
    announceState();
    closePreferences();
    if (next === 'accepted') {
      start();
    } else stop(saved);
  }

  document
    .querySelectorAll<HTMLElement>('[data-consent-open]')
    .forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () => {
        opener = button;
        announceState();
        dialog?.showModal();
      });
    });

  root
    .querySelectorAll<HTMLButtonElement>('[data-consent-choice]')
    .forEach((button) => {
      button.disabled = !enabled;
      button.addEventListener('click', () => {
        const next = button.dataset['consentChoice'];
        if (next === 'accepted' || next === 'rejected') choose(next);
      });
    });

  root
    .querySelector('[data-consent-close]')
    ?.addEventListener('click', closePreferences);
  dialog?.addEventListener('close', () => opener?.focus());
  window.addEventListener('storage', (event) => {
    if (event.key !== CONSENT_STORAGE_KEY && event.key !== null) return;
    const incoming = parseConsent(event.newValue, projectId)?.choice ?? null;
    if (incoming !== 'accepted') {
      choice = incoming;
      announceState();
      stop();
    }
  });

  document.addEventListener('click', (event) => {
    if (!enabled || choice !== 'accepted' || !loaded || failed) return;
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-analytics-event]')
        : null;
    const name = target?.dataset['analyticsEvent'];
    if (!name || !isAnalyticsEvent(name)) return;
    try {
      // One delegated listener, one named event per activation, no event payload.
      browser.clarity?.('event', name);
    } catch {
      // Navigation, downloads and contacts do not depend on analytics delivery.
    }
  });

  announceState();
  if (choice === 'rejected') eraseClarityCookies();
  start();
}
