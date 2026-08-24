'use strict';

function loadGoogleFonts() {
  document.querySelector('link[rel="preload"][href*="assets/fonts/"]')?.remove();
  if (document.querySelector('link[data-cimo-google-fonts]')) return;

  const preconnectGoogle = document.createElement('link');
  preconnectGoogle.rel = 'preconnect';
  preconnectGoogle.href = 'https://fonts.googleapis.com';

  const preconnectStatic = document.createElement('link');
  preconnectStatic.rel = 'preconnect';
  preconnectStatic.href = 'https://fonts.gstatic.com';
  preconnectStatic.crossOrigin = 'anonymous';

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&display=swap';
  stylesheet.dataset.cimoGoogleFonts = 'true';

  document.head.append(preconnectGoogle, preconnectStatic, stylesheet);
}

loadGoogleFonts();

(async () => {
  for (const src of ['site.js', 'studio-core.js', 'studio-ui.js', 'estimate.js']) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.append(script);
    });
  }
})().catch((error) => console.error('Cimo site initialization failed', error));
