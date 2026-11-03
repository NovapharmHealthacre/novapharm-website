/**
 * @file founder.js
 * @description Interactive Client Controller for vishal.novapharmhealthcare.com Founder Portfolio.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Controller
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('novapharm_theme', theme);
    if (theme === 'light') {
      themeIcon.textContent = '🌙';
      themeLabel.textContent = 'Dark';
    } else {
      themeIcon.textContent = '☀️';
      themeLabel.textContent = 'Light';
    }
  }

  const savedTheme = localStorage.getItem('novapharm_theme') ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  applyTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  // -------------------------------------------------------------
  // 2. Mobile Responsive Navigation Drawer
  // -------------------------------------------------------------
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNavDrawer = document.getElementById('mobileNavDrawer');

  if (mobileMenuBtn && mobileNavDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileNavDrawer.classList.toggle('open');
      mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
      mobileMenuBtn.textContent = isOpen ? '✕' : '☰';
    });

    mobileNavDrawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileNavDrawer.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenuBtn.textContent = '☰';
      });
    });
  }

  // -------------------------------------------------------------
  // 3. Monograph Executive Synthesis Expanders
  // -------------------------------------------------------------
  const toggleMemoButtons = document.querySelectorAll('.btn-toggle-memo');
  toggleMemoButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const memoId = btn.getAttribute('data-memo');
      const drawer = document.getElementById(`memoDrawer${memoId}`);
      if (!drawer) return;
      const isHidden = drawer.style.display === 'none';
      drawer.style.display = isHidden ? 'block' : 'none';
      btn.textContent = isHidden ? 'Hide Synthesis ↑' : 'Read Synthesis ↓';
    });
  });

  // -------------------------------------------------------------
  // 4. Interactive Design Token Click-to-Copy
  // -------------------------------------------------------------
  const tokenChips = document.querySelectorAll('.token-chip');
  const toastCopy = document.getElementById('toastCopy');
  let toastTimer = null;

  tokenChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const tokenName = chip.querySelector('.token-name')?.textContent || '';
      const tokenHex = chip.querySelector('.token-hex')?.textContent || '';
      const copyPayload = `${tokenName}: ${tokenHex}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyPayload).catch(() => {});
      }

      if (toastCopy) {
        toastCopy.textContent = `✓ Copied: ${tokenName}`;
        toastCopy.style.display = 'block';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          toastCopy.style.display = 'none';
        }, 2200);
      }
    });
  });

  // -------------------------------------------------------------
  // 5. Institutional Service Worker Registration (PWA / Offline)
  // -------------------------------------------------------------
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[NovaPharm Founder PWA] Service Worker registered durably with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[NovaPharm Founder PWA] Service Worker registration skipped:', err);
        });
    });
  }
});
