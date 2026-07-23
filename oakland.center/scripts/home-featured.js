/* home-featured.js – Home page event spotlight + announcements carousel.
 * Depends on announcements-common.js (date formatting + carousel/lightbox),
 * which must be loaded first. */

const HOME_ANNOUNCEMENTS_URL = '/data/announcements.json';
const featuredRoot = document.getElementById('home-featured-event');
const carouselRoot = document.getElementById('home-announcements-carousel');
const HOME_CAROUSEL_COUNT = 6;

/*
 * Pick the event to spotlight: the soonest event that hasn't happened yet,
 * or — if every event is in the past — the most recent one. Returns
 * { entry, isUpcoming } or null if there are no events at all.
 */
function pickFeaturedEvent(announcements) {
  const events = announcements.filter((entry) => entry.type === 'event' && entry.date);
  if (events.length === 0) return null;

  const todayKey = toDateKey(new Date());

  const upcoming = events
    .filter((entry) => entry.date >= todayKey)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (upcoming.length > 0) return { entry: upcoming[0], isUpcoming: true };

  const past = events.sort((a, b) => new Date(b.date) - new Date(a.date));
  return { entry: past[0], isUpcoming: false };
}

function renderFeaturedEvent(announcements) {
  if (!featuredRoot) return;

  const picked = pickFeaturedEvent(announcements);
  if (!picked) {
    featuredRoot.hidden = true;
    return;
  }

  const { entry, isUpcoming } = picked;
  featuredRoot.innerHTML = '';
  featuredRoot.hidden = false;

  const card = document.createElement('article');
  card.className = 'featured-event';

  if (Array.isArray(entry.images) && entry.images.length > 0) {
    const media = document.createElement('div');
    media.className = 'featured-event-media';
    media.appendChild(createCarousel(entry.images));
    card.appendChild(media);
  }

  const body = document.createElement('div');
  body.className = 'featured-event-body';

  const badge = document.createElement('span');
  badge.className = `featured-event-badge ${isUpcoming ? 'is-upcoming' : 'is-past'}`;
  badge.textContent = isUpcoming ? 'Upcoming Event' : 'Most Recent Event';

  const h2 = document.createElement('h2');
  h2.className = 'featured-event-title';
  h2.textContent = entry.title;

  const time = document.createElement('time');
  time.className = 'featured-event-date';
  if (entry.date) time.setAttribute('datetime', entry.date);
  time.textContent = formatDateLine(entry);

  body.append(badge, h2, time);

  if (entry.description) {
    const p = document.createElement('p');
    p.className = 'featured-event-text';
    p.textContent = entry.description;
    body.appendChild(p);
  }

  if (Array.isArray(entry.links) && entry.links.length > 0) {
    const ul = document.createElement('ul');
    ul.className = 'featured-event-links';
    entry.links.forEach((link) => {
      if (!link.label || !link.text) return;
      const li = document.createElement('li');
      const label = document.createElement('strong');
      label.textContent = link.label;
      let content;
      if (link.url) {
        content = document.createElement('a');
        content.href = link.url;
        content.target = '_blank';
        content.rel = 'noopener noreferrer';
      } else {
        content = document.createElement('span');
      }
      content.textContent = link.text;
      li.append(label, ' ', content);
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }

  const viewAll = document.createElement('a');
  viewAll.className = 'featured-event-view-all';
  viewAll.href = entry.id != null
    ? `/pages/announcements.html#announcement-${entry.id}`
    : '/pages/announcements.html';
  viewAll.textContent = 'View full details';
  body.appendChild(viewAll);

  card.appendChild(body);
  featuredRoot.appendChild(card);
}

/* ----------------------------------------------------------------------
 * Horizontal announcements carousel
 * -------------------------------------------------------------------- */

function createMiniCard(entry) {
  const card = document.createElement('article');
  card.className = 'home-announcement-card';

  const link = document.createElement('a');
  link.className = 'home-announcement-link';
  link.href = entry.id != null
    ? `/pages/announcements.html#announcement-${entry.id}`
    : '/pages/announcements.html';

  const image = Array.isArray(entry.images) && entry.images.length > 0 ? entry.images[0] : null;
  if (image) {
    const img = document.createElement('img');
    img.src = image;
    img.alt = '';
    img.loading = 'lazy';
    img.className = 'home-announcement-image';
    img.addEventListener('error', () => img.classList.add('is-broken'));
    link.appendChild(img);
  }

  const body = document.createElement('div');
  body.className = 'home-announcement-body';

  const type = entry.type === 'event' ? 'event' : 'announcement';
  const badge = document.createElement('span');
  badge.className = `home-announcement-badge home-announcement-badge-${type}`;
  badge.textContent = type === 'event' ? 'Event' : 'Announcement';

  const h3 = document.createElement('h3');
  h3.className = 'home-announcement-title';
  h3.textContent = entry.title;

  const time = document.createElement('time');
  time.className = 'home-announcement-date';
  if (entry.date) time.setAttribute('datetime', entry.date);
  time.textContent = formatDateLine(entry);

  body.append(badge, h3, time);
  link.appendChild(body);
  card.appendChild(link);
  return card;
}

function renderCarousel(announcements) {
  if (!carouselRoot) return;

  const latest = [...announcements]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, HOME_CAROUSEL_COUNT);

  carouselRoot.innerHTML = '';

  if (latest.length === 0) {
    carouselRoot.hidden = true;
    return;
  }
  carouselRoot.hidden = false;

  const track = document.createElement('div');
  track.className = 'home-carousel-track';
  latest.forEach((entry) => track.appendChild(createMiniCard(entry)));
  carouselRoot.appendChild(track);

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'home-carousel-btn home-carousel-prev';
  prev.setAttribute('aria-label', 'Scroll to previous announcements');
  prev.innerHTML = '&#10094;';
  prev.addEventListener('click', () => {
    track.scrollBy({ left: -track.clientWidth * 0.8, behavior: 'smooth' });
  });

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'home-carousel-btn home-carousel-next';
  next.setAttribute('aria-label', 'Scroll to more announcements');
  next.innerHTML = '&#10095;';
  next.addEventListener('click', () => {
    track.scrollBy({ left: track.clientWidth * 0.8, behavior: 'smooth' });
  });

  carouselRoot.append(prev, next);
}

/* ----------------------------------------------------------------------
 * Init
 * -------------------------------------------------------------------- */

if (featuredRoot || carouselRoot) {
  fetch(HOME_ANNOUNCEMENTS_URL)
    .then((res) => res.json())
    .then((announcements) => {
      const list = Array.isArray(announcements) ? announcements : [];
      renderFeaturedEvent(list);
      renderCarousel(list);
    })
    .catch((err) => {
      console.error('Failed to load announcements:', err);
      if (featuredRoot) featuredRoot.hidden = true;
      if (carouselRoot) carouselRoot.hidden = true;
    });
}
