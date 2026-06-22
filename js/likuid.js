/* Likuid shared JS — mobile menu + lead-capture form. */
(function () {
  // Mobile menu
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

  // Lead capture → /api/subscribe (Veepveep CRM). Any page with #lead-form.
  var form = document.getElementById('lead-form');
  if (!form) return;
  var msg = document.getElementById('lead-message');
  var submit = document.getElementById('lead-submit');
  function val(n) { var el = form.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ''; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      firstName: val('firstName'), lastName: val('lastName'), jobTitle: val('jobTitle'),
      company: val('company'), email: val('email'), mobile: val('mobile'),
      website: val('website'),
      source: form.getAttribute('data-source') || 'likuid-website',
      asset: form.getAttribute('data-asset') || 'Website enquiry',
      url: window.location.href
    };
    var required = ['firstName', 'lastName', 'jobTitle', 'company', 'email', 'mobile'];
    for (var i = 0; i < required.length; i++) {
      if (!data[required[i]]) { msg.textContent = 'Please complete all fields.'; msg.style.color = '#fda4af'; return; }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { msg.textContent = 'Please enter a valid email address.'; msg.style.color = '#fda4af'; return; }
    submit.disabled = true; submit.style.opacity = '0.6';
    msg.textContent = 'Sending…'; msg.style.color = '#8a8f98';
    fetch('/api/subscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          msg.textContent = form.getAttribute('data-success') || 'Thanks — we\'ll be in touch shortly.';
          msg.style.color = '#44D9DE';
          if (form.getAttribute('data-mode') === 'rapid') { setTimeout(function () { msg.textContent = ''; var f = form.querySelector('input'); if (f) f.focus(); }, 1800); }
        } else {
          msg.textContent = (res.d && res.d.error) || 'Something went wrong. Please email hello@likuid.ai.'; msg.style.color = '#fda4af';
        }
      }).catch(function () {
        msg.textContent = 'Something went wrong. Please email hello@likuid.ai.'; msg.style.color = '#fda4af';
      }).finally(function () { submit.disabled = false; submit.style.opacity = '1'; });
  });
})();
