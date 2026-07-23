/*
 * site-config.js – Loads site-wide settings from static JSON and applies them to the page.
 *
 * Settings are edited in the local admin panel and exported to data/site-config.json.
 * Falls back to built-in defaults if the file is unavailable.
 */

const SITE_CONFIG_URL = '/data/site-config.json';

const SITE_DEFAULTS = {
  name: 'Community Theater',
  tagline: 'Community performances, local talent, and unforgettable nights out.',
  logo: '/images/logo.png',
  logoAlt: 'Theater logo',
  email: 'boxoffice@example-theater.test',
  phone: '(555) 010-0200',
  phoneTel: '+15550100200',
  address: '400 Center Street, Maplebrook, ST 00000',
  boxOfficeHours: 'Tue–Fri 12–6 PM · Sat 10 AM–2 PM · 1 hr before showtime',
  social: {
    twitter: 'https://example.com/theater-social',
    facebook: 'https://example.com/theater-social',
    instagram: 'https://example.com/theater-social',
  },
};

let SITE = { ...SITE_DEFAULTS };
let siteConfigReady = null;

function applySiteFields() {
  document.querySelectorAll('[data-site]').forEach((el) => {
    const key = el.dataset.site;
    const value = SITE[key];
    if (value !== undefined && value !== null) {
      el.textContent = value;
    }
  });

  document.querySelectorAll('[data-site-href]').forEach((el) => {
    const key = el.dataset.siteHref;
    if (key === 'email') el.href = `mailto:${SITE.email}`;
    else if (key === 'phone') el.href = `tel:${SITE.phoneTel}`;
    else if (SITE.social?.[key]) el.href = SITE.social[key];
  });

  const titleEl = document.querySelector('title[data-page-title]');
  if (titleEl) {
    const page = titleEl.getAttribute('data-page-title');
    document.title = page ? `${page} – ${SITE.name}` : SITE.name;
  }
}

async function loadSiteConfig() {
  if (!siteConfigReady) {
    siteConfigReady = fetch(SITE_CONFIG_URL)
      .then((res) => (res.ok ? res.json() : SITE_DEFAULTS))
      .then((data) => {
        SITE = { ...SITE_DEFAULTS, ...data, social: { ...SITE_DEFAULTS.social, ...data.social } };
        window.SITE = SITE;
        return SITE;
      })
      .catch(() => {
        SITE = { ...SITE_DEFAULTS };
        window.SITE = SITE;
        return SITE;
      });
  }
  return siteConfigReady;
}

window.SITE = SITE;
window.applySiteFields = applySiteFields;
window.loadSiteConfig = loadSiteConfig;
window.invalidateSiteConfigCache = () => {
  siteConfigReady = null;
};
