// Ajoute « Terrain » et « Contrôle » au menu de l'application principale (interface Angular précompilée).
// Les liens sont des pages autonomes (/terrain/, /controle/) : navigation classique, sans passer par le routeur Angular.
(() => {
  const ICONS = {
    terrain: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    controle: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  };
  let role = null, asked = false;
  async function whoAmI() {
    if (asked) return; asked = true;
    let token = null; try { token = localStorage.getItem('grenier.token'); } catch { return; }
    if (!token) { asked = false; return; }
    try {
      const r = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      if (r.ok) { const me = await r.json(); role = me.user.role; role = me.company.features?.coop ? role : role + ':nocoop'; } else asked = false;
    } catch { asked = false; }
  }
  function link(model, key, href, label) {
    const a = model.cloneNode(true);
    a.classList.remove('active'); a.removeAttribute('aria-current'); a.removeAttribute('routerlinkactive');
    a.href = href; a.dataset.extra = key;
    const svg = a.querySelector('svg');
    a.textContent = '';
    if (svg) { svg.innerHTML = ICONS[key]; const host = model.querySelector('app-icon')?.cloneNode(false); if (host) { host.appendChild(svg); a.appendChild(host); } else a.appendChild(svg); }
    a.appendChild(document.createTextNode(label));
    return a;
  }
  function inject() {
    const nav = document.querySelector('nav.nav');
    if (!nav || !role) return;
    if (nav.querySelector('[data-extra]')) return;
    const model = nav.querySelector('a.navlink');
    if (!model) return;
    const [r, nocoop] = role.split(':');
    if (!nocoop && ['owner', 'manager', 'coop_agent', 'storekeeper', 'accountant'].includes(r)) nav.appendChild(link(model, 'terrain', '/terrain/', 'Terrain'));
    if (['owner', 'manager'].includes(r)) nav.appendChild(link(model, 'controle', '/controle/', 'Contrôle'));
  }
  const obs = new MutationObserver(() => { if (document.querySelector('nav.nav')) { if (!role) whoAmI().then(inject); else inject(); } else { role = null; asked = false; } });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
