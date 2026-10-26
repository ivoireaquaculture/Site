/* Ivoire Aquaculture — interactions du site (sans dépendance). */
(function () {
  'use strict';

  var fmt = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Menu mobile */
  var burger = $('#burger');
  var nav = $('#nav');
  if (burger && nav) {
    var placeNav = function () {
      var h = document.getElementById('header');
      if (h) nav.style.setProperty('--nav-top', Math.max(0, h.getBoundingClientRect().bottom) + 'px');
    };
    window.addEventListener('resize', function () { if (nav.classList.contains('open')) placeNav(); });
    burger.addEventListener('click', function () {
      placeNav();
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { burger.click(); burger.focus(); }
    });
  }

  /* Ombre de l'en-tête au défilement */
  var header = $('#header');
  var onScroll = function () { if (header) header.classList.toggle('scrolled', window.scrollY > 10); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Apparition progressive des blocs */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.section .card, .section .tier, .growth li, .audience li').forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  /* Calculateur d'alevins */
  $$('[data-calc]').forEach(function (box) {
    var input = $('input', box);
    var unit = parseFloat(box.getAttribute('data-unit-price')) || 0;
    var min = parseInt(box.getAttribute('data-min'), 10) || 0;
    var total = $('[data-total]', box);
    var warn = $('[data-warn]', box);
    var link = $('[data-quote-link]', box);
    var base = link ? link.getAttribute('href').split('&quantite=')[0] : '';
    var update = function () {
      var q = Math.max(0, parseInt(input.value, 10) || 0);
      total.textContent = unit ? fmt(q * unit) : 'Sur devis';
      warn.hidden = !(q > 0 && q < min);
      if (link) link.setAttribute('href', base + '&quantite=' + q);
    };
    $$('[data-step]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        input.value = Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(b.getAttribute('data-step'), 10));
        update();
      });
    });
    input.addEventListener('input', update);
    update();
  });

  /* Estimation dans le formulaire de devis */
  var est = $('[data-estimate]');
  if (est) {
    var prices = JSON.parse(est.getAttribute('data-prices') || '{}');
    var mins = JSON.parse(est.getAttribute('data-mins') || '{}');
    var sel = $('#f-product');
    var qty = $('#f-quantity');
    var qtyField = qty && qty.closest('.field');
    var units = { kg: 'kg', 'unités': 'unités', sacs: 'sacs' };
    var refresh = function () {
      var id = sel.value;
      var opt = sel.options[sel.selectedIndex];
      var unit = opt ? opt.getAttribute('data-unit') : '';
      if (qtyField) {
        qtyField.style.display = id && !unit ? 'none' : '';
        qty.required = !(id && !unit);
        var lab = $('label', qtyField);
        if (lab) lab.firstChild.nodeValue = 'Quantité' + (unit ? ' (' + (units[unit] || unit) + ')' : '');
      }
      var q = parseFloat(qty.value) || 0;
      var p = prices[id];
      if (!id || !unit || p == null || !q) { est.hidden = true; return; }
      est.hidden = false;
      $('[data-est-total]', est).textContent = fmt(q * p);
      var w = $('[data-est-warn]', est);
      var m = mins[id];
      w.hidden = !(m && q < m);
      if (m) w.textContent = 'Minimum de référence : ' + m + ' ' + unit + '. Nous étudierons tout de même votre demande.';
    };
    sel.addEventListener('change', refresh);
    qty.addEventListener('input', refresh);
    refresh();
  }

  /* Validation côté navigateur (le serveur revalide toujours) */
  $$('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      var firstBad = null;
      $$('.err[data-js]', form).forEach(function (el) { el.remove(); });
      $$('[required]', form).forEach(function (el) {
        var field = el.closest('.field') || el.closest('.check');
        var bad = el.type === 'checkbox' ? !el.checked : !String(el.value).trim();
        if (!bad && el.type === 'email' && el.value) bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value);
        if (field) field.classList.toggle('has-err', bad);
        if (bad && !firstBad) firstBad = el;
      });
      var group = $('fieldset.field', form);
      if (group && group.querySelector('legend .req')) {
        var any = $$('input[type=checkbox]', group).some(function (c) { return c.checked; });
        group.classList.toggle('has-err', !any);
        if (!any && !firstBad) firstBad = group.querySelector('input');
      }
      if (firstBad) {
        e.preventDefault();
        firstBad.focus();
        return;
      }
      /* Version statique (aperçu) : pas de serveur, la demande part sur WhatsApp. */
      if (document.body.hasAttribute('data-static')) {
        e.preventDefault();
        var lines = [];
        var titles = { devis: 'Demande de devis', partenaire: 'Candidature partenaire', contact: 'Message' };
        lines.push('*' + (titles[form.getAttribute('data-form')] || 'Demande') + ' — site Ivoire Aquaculture*');
        $$('.field', form).forEach(function (f) {
          var lab = $('label, legend', f);
          var label = lab ? lab.textContent.replace('*', '').trim() : '';
          var val;
          var s = $('select', f);
          if (s) val = s.value ? s.options[s.selectedIndex].text : '';
          else if ($('input[type=checkbox]', f)) val = $$('input:checked', f).map(function (c) { return c.parentNode.textContent.trim(); }).join(', ');
          else { var i = $('input, textarea', f); val = i ? i.value.trim() : ''; }
          if (val && f.style.display !== 'none') lines.push(label + ' : ' + val);
        });
        var href = 'https://wa.me/' + (window.SITE && window.SITE.whatsapp) + '?text=' + encodeURIComponent(lines.join('\n'));
        var link = $('[data-wa-send]', form);
        if (!link) {
          link = document.createElement('a');
          link.className = 'btn btn-whatsapp btn-block';
          link.target = '_blank';
          link.rel = 'noopener';
          link.setAttribute('data-wa-send', '');
          link.textContent = 'Ouvrir WhatsApp pour envoyer la demande';
          form.appendChild(link);
        }
        link.href = href;
        link.focus();
      }
    });
  });
})();
