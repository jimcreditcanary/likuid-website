/* Likuid shared JS — mobile menu, tab switchers, lead-capture form, motion. */
(function () {
  // ---- Header strengthens on scroll ----
  var header = document.querySelector('header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ---- Scroll-reveal (sections fade/slide in) ----
  try {
    document.documentElement.classList.add('js-reveal');
    var targets = [];
    document.querySelectorAll('main > section').forEach(function (s, i) { if (i > 0) targets.push(s); });
    var footer = document.querySelector('body > footer');
    if (footer) targets.push(footer);
    if ('IntersectionObserver' in window && targets.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
      targets.forEach(function (t) { t.classList.add('reveal'); io.observe(t); });
    } else {
      document.documentElement.classList.remove('js-reveal');
    }
  } catch (e) { document.documentElement.classList.remove('js-reveal'); }

  // ---- Mobile menu ----
  var btn = document.getElementById('mobile-menu-btn');
  var menu = document.getElementById('mobile-menu');
  var hIcon = document.getElementById('hamburger-icon');
  var cIcon = document.getElementById('close-icon');
  if (btn && menu) {
    btn.addEventListener('click', function () {
      menu.classList.toggle('hidden');
      if (hIcon) hIcon.classList.toggle('hidden');
      if (cIcon) cIcon.classList.toggle('hidden');
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        menu.classList.add('hidden');
        if (hIcon) hIcon.classList.remove('hidden');
        if (cIcon) cIcon.classList.add('hidden');
      });
    });
  }

  // ---- AI agents tab switcher (home) ----
  window.switchAgent = function (id) {
    document.querySelectorAll('.ai-panel').forEach(function (p) { p.style.display = 'none'; p.classList.remove('active'); });
    document.querySelectorAll('.ai-tab').forEach(function (b) { b.classList.remove('active'); });
    var panel = document.getElementById('panel-' + id);
    if (panel) { panel.style.display = 'grid'; panel.classList.add('active'); }
    var match = "switchAgent('" + id + "')";
    document.querySelectorAll('.ai-tab').forEach(function (b) { if (b.getAttribute('onclick') === match) b.classList.add('active'); });
  };

  // ---- Module feature tab switcher (platform) ----
  window.switchFeat = function (id) {
    document.querySelectorAll('.feat-panel').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.feat-tab').forEach(function (b) { b.classList.remove('active'); });
    var panel = document.getElementById('feat-' + id);
    if (panel) panel.classList.add('active');
    var match = "switchFeat('" + id + "')";
    document.querySelectorAll('.feat-tab').forEach(function (b) { if (b.getAttribute('onclick') === match) b.classList.add('active'); });
  };

  // ---- Lead capture → /api/subscribe (Veepveep CRM) ----
  var form = document.getElementById('lead-form');
  if (!form) return;
  var msg = document.getElementById('lead-message');
  var submit = document.getElementById('lead-submit');
  var success = document.getElementById('lead-success');   // takeover panel (optional)
  var again = document.getElementById('lead-again');        // "submit another" button (optional)

  function val(n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; }

  if (again && success) {
    again.addEventListener('click', function () {
      success.classList.add('hidden');
      form.classList.remove('hidden');
      form.reset();
      var first = form.querySelector('input:not([type=hidden]):not([tabindex="-1"])');
      if (first) first.focus();
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      firstName: val('firstName'), lastName: val('lastName'), jobTitle: val('jobTitle'),
      company: val('company'), email: val('email'), mobile: val('mobile'),
      notes: val('notes'),
      website: val('website'),
      source: form.getAttribute('data-source') || 'likuid-website',
      asset: form.getAttribute('data-asset') || 'Website enquiry',
      url: window.location.href
    };
    var required = ['firstName', 'lastName', 'jobTitle', 'company', 'email', 'mobile'];
    for (var i = 0; i < required.length; i++) {
      if (!data[required[i]]) { if (msg) { msg.textContent = 'Please complete all fields.'; msg.style.color = '#fda4af'; } return; }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { if (msg) { msg.textContent = 'Please enter a valid email address.'; msg.style.color = '#fda4af'; } return; }
    submit.disabled = true; submit.style.opacity = '0.6';
    if (msg) { msg.textContent = 'Sending…'; msg.style.color = '#8a8f98'; }
    fetch('/api/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) {
          if (msg) msg.textContent = '';
          form.reset();
          if (success) { form.classList.add('hidden'); success.classList.remove('hidden'); success.scrollIntoView({ block: 'nearest' }); }
          else if (msg) { msg.textContent = "Thanks — we'll be in touch shortly."; msg.style.color = '#44D9DE'; }
        } else if (msg) {
          msg.textContent = (res.d && res.d.error) || 'Something went wrong. Please email hello@likuid.ai.'; msg.style.color = '#fda4af';
        }
      }).catch(function () {
        if (msg) { msg.textContent = 'Something went wrong. Please email hello@likuid.ai.'; msg.style.color = '#fda4af'; }
      }).finally(function () { submit.disabled = false; submit.style.opacity = '1'; });
  });
})();

/* ---- Cookie consent banner (site-wide, injected once) ---- */
(function () {
  var KEY = 'likuid_cookie_consent';
  function getConsent() {
    var m = document.cookie.match(new RegExp('(?:^|; )' + KEY + '=([^;]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function setConsent(v) {
    document.cookie = KEY + '=' + v + ';path=/;max-age=31536000;SameSite=Lax';
  }
  if (getConsent()) return;

  var bar = document.createElement('div');
  bar.id = 'cookie-banner';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Cookie consent');
  bar.style.cssText = 'position:fixed;left:0;bottom:0;z-index:60;max-width:22rem;transform:translateY(140%);transition:transform .5s cubic-bezier(.16,1,.3,1);';
  bar.innerHTML =
    '<div class="m-3 sm:m-4 rounded-xl hairline p-4" style="background:rgba(16,17,19,0.94);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 12px 36px -16px rgba(0,0,0,.6);">' +
      '<p class="text-xs text-slate-400 leading-relaxed mb-3">We use cookies to understand how this site is used. See our <a href="/privacy" class="text-brand-blue hover:underline">Privacy Policy</a>.</p>' +
      '<div class="flex gap-2">' +
        '<button type="button" id="cookie-decline" class="text-xs font-semibold px-3 py-1.5 rounded-lg" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.4);color:#fff;">Decline</button>' +
        '<button type="button" id="cookie-accept" class="btn-primary text-xs font-semibold px-3 py-1.5 rounded-lg">Accept</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(bar);
  requestAnimationFrame(function () { requestAnimationFrame(function () { bar.style.transform = 'translateY(0)'; }); });

  function dismiss(choice) {
    setConsent(choice);
    bar.style.transform = 'translateY(120%)';
    setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 500);
  }
  bar.querySelector('#cookie-accept').addEventListener('click', function () { dismiss('accepted'); });
  bar.querySelector('#cookie-decline').addEventListener('click', function () { dismiss('rejected'); });
})();
