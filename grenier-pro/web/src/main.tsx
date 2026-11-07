import { render } from 'preact';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/bricolage-grotesque/700.css';
import './styles.css';
import { App } from './app';
import { interceptLinks } from './lib/router';
import { getLang } from './lib/i18n';

document.documentElement.lang = getLang();
interceptLinks();
render(<App />, document.getElementById('app')!);

// Application installable et utilisable hors ligne (coque mise en cache ; les données /api ne le sont jamais).
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
