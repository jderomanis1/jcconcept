'use strict';
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
