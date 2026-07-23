/*
 * layout.js – Injects the shared site header and footer.
 *
 * Loads site settings from data/site-config.json via site-config.js before rendering.
 * Load site-config.js before this file on every page.
 */

function buildHeaderHtml() {
  const { name, logo, logoAlt } = SITE;

  return `
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="logo-link">
        <img src="${logo}" alt="${logoAlt}">
<!--        <span class="logo-text">${name}</span>-->
      </a>

      <nav aria-label="Main navigation">
        <ul class="nav-list">
          <li><a href="/">Home</a></li>
          <li><a href="/pages/announcements.html">Announcements</a></li>
          <li><a href="/pages/about.html">About Us</a></li>
          <li><a href="/pages/contact.html">Contact</a></li>
        </ul>
      </nav>
    </div>
  </header>
`;
}

function buildFooterHtml() {
  const { email, phone, phoneTel, social } = SITE;

  return `
  <footer class="site-footer">
    <div class="container footer-inner">

      <section class="footer-section">
        <h4>About</h4>
        <ul>
          <li><a href="/pages/about.html">Our Story</a></li>
          <li><a href="/pages/staff.html">Staff &amp; Staff Directory</a></li>
          <li><a href="/pages/faq.html">FAQ</a></li>
        </ul>
      </section>

      <section class="footer-section">
        <h4>Contact</h4>
        <ul>
          <li>Email: <a href="mailto:${email}">${email}</a></li>
          <li>Phone: <a href="tel:${phoneTel}">${phone}</a></li>
          <li><a href="/pages/contact.html">Contact Form</a></li>
        </ul>
      </section>

      <section class="footer-section">
        <h4>Follow Us</h4>
        <ul class="social-links">
          <!--<li><a href="${social.twitter}">Twitter</a></li>-->
          <li><a href="${social.facebook}">Facebook</a></li>
          <!--<li><a href="${social.instagram}">Instagram</a></li>-->
        </ul>
      </section>

    </div>
  </footer>
`;
}

function injectLayout() {
  const headerSlot = document.getElementById('site-header');
  if (headerSlot) {
    headerSlot.innerHTML = buildHeaderHtml();
    markActiveNavLink(headerSlot);
  }

  const footerSlot = document.getElementById('site-footer');
  if (footerSlot) {
    footerSlot.innerHTML = buildFooterHtml();
  }
}

function markActiveNavLink(scope) {
  const here = window.location.pathname;
  scope.querySelectorAll('.nav-list a').forEach((link) => {
    if (link.getAttribute('href') === here) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

async function initLayout() {
  if (typeof loadSiteConfig === 'function') {
    await loadSiteConfig();
  }
  injectLayout();
  if (typeof applySiteFields === 'function') applySiteFields();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLayout);
} else {
  initLayout();
}
