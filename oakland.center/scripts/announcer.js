/* announcer.js – Announcement list with fuzzy search and image carousels.
 * Depends on announcements-common.js (date formatting + carousel/lightbox),
 * which must be loaded first. */

const ANNOUNCEMENTS_URL = '/data/announcements.json';
const container = document.getElementById('announcements');
const searchInput = document.getElementById('announcement-search');
const typeFilterFieldset = document.getElementById('announcement-type-filter');
const emptyState = document.getElementById('announcements-empty');
const calendarRoot = document.getElementById('announcement-calendar');
const dayDetail = document.getElementById('calendar-day-detail');
const dayDetailTitle = document.getElementById('calendar-day-detail-title');
const dayDetailList = document.getElementById('calendar-day-detail-list');

let allAnnouncements = [];
let announcementsByDate = new Map();
let calendarMonth = new Date();
let selectedDateKey = null;
let activeTypeFilter = 'all';

/* ----------------------------------------------------------------------
 * Fuzzy search
 * -------------------------------------------------------------------- */

/*
 * Score how well `query` matches `text`. Returns 0 for no match, higher is
 * better. A direct substring hit scores highest; otherwise we allow an
 * in-order (subsequence) match and reward contiguous runs and word starts.
 */
function fuzzyScore(query, text) {
  if (!query) return 0;
  query = query.toLowerCase();
  text = (text || '').toLowerCase();

  const idx = text.indexOf(query);
  if (idx !== -1) {
    let score = 1000 - idx;
    if (idx === 0 || /\s/.test(text[idx - 1])) score += 200; // starts a word
    return score;
  }

  let ti = 0;
  let qi = 0;
  let score = 0;
  let run = 0;
  let prevMatch = -2;

  while (ti < text.length && qi < query.length) {
    if (text[ti] === query[qi]) {
      score += 10;
      run = prevMatch === ti - 1 ? run + 1 : 0;
      score += run * 5;
      if (ti === 0 || /\s/.test(text[ti - 1])) score += 15; // word start
      prevMatch = ti;
      qi++;
    }
    ti++;
  }

  return qi === query.length ? score : 0; // require all query chars to match
}

/*
 * Score an announcement against a full query. The query is split into words;
 * every word must match at least one field (AND semantics). Title matches are
 * weighted most heavily, then description, then date.
 */
function scoreAnnouncement(query, announcement) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const fields = [
    { text: announcement.title, weight: 3 },
    { text: announcement.description, weight: 1 },
    { text: announcement.date, weight: 1 },
    { text: formatDate(announcement.date), weight: 1 },
    { text: announcement.startTime, weight: 1 },
    { text: announcement.endTime, weight: 1 },
  ];

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const field of fields) {
      best = Math.max(best, fuzzyScore(token, field.text) * field.weight);
    }
    if (best === 0) return 0; // this token matched nothing -> exclude
    total += best;
  }
  return total;
}

/* ----------------------------------------------------------------------
 * Rendering
 * -------------------------------------------------------------------- */

function buildAnnouncementsByDate(announcements) {
  const map = new Map();
  for (const entry of announcements) {
    const key = entry.date;
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entry);
  }
  return map;
}

/*
 * Fill `element` with `text`, wrapping any spans that match one of `tokens`
 * in a <mark>. Case-insensitive substring matches; overlapping/adjacent hits
 * are merged. Uses text nodes + createElement so content stays injection-safe.
 */
function highlightInto(element, text, tokens) {
  element.textContent = '';
  if (!text) return;

  if (!tokens || tokens.length === 0) {
    element.textContent = text;
    return;
  }

  const lower = text.toLowerCase();
  const matched = new Array(text.length).fill(false);

  for (const token of tokens) {
    if (!token) continue;
    let from = 0;
    let idx;
    while ((idx = lower.indexOf(token, from)) !== -1) {
      for (let i = idx; i < idx + token.length; i++) matched[i] = true;
      from = idx + token.length;
    }
  }

  let i = 0;
  while (i < text.length) {
    const start = i;
    const isMatch = matched[i];
    while (i < text.length && matched[i] === isMatch) i++;
    const chunk = text.slice(start, i);
    if (isMatch) {
      const mark = document.createElement('mark');
      mark.textContent = chunk;
      element.appendChild(mark);
    } else {
      element.appendChild(document.createTextNode(chunk));
    }
  }
}

function createLinksList(links) {
  const ul = document.createElement('ul');
  ul.className = 'announcement-links';

  links.forEach((link) => {
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

  return ul;
}

const TYPE_LABELS = {
  announcement: 'Announcement',
  event: 'Event',
};

function createCard(entry, tokens) {
  const { title, date, description, images, links } = entry;
  const type = entry.type === 'event' ? 'event' : 'announcement';
  const card = document.createElement('article');
  card.className = 'announcement-card';
  if (entry.id != null) card.id = `announcement-${entry.id}`;
  if (date) card.dataset.date = date;

  if (Array.isArray(images) && images.length > 0) {
    card.appendChild(createCarousel(images));
  }

  const body = document.createElement('div');
  body.className = 'announcement-body';

  const badge = document.createElement('span');
  badge.className = `announcement-type-badge announcement-type-badge-${type}`;
  badge.textContent = TYPE_LABELS[type];

  const h2 = document.createElement('h2');
  h2.className = 'announcement-title';
  highlightInto(h2, title, tokens);

  const time = document.createElement('time');
  time.className = 'announcement-date';
  if (date) time.setAttribute('datetime', date);
  highlightInto(time, formatDateLine(entry), tokens);

  body.append(badge, h2, time);

  if (Array.isArray(links) && links.length > 0) {
    body.appendChild(createLinksList(links));
  }

  const p = document.createElement('p');
  p.className = 'announcement-text';
  highlightInto(p, description, tokens);
  body.appendChild(p);

  card.appendChild(body);
  return card;
}

/*
 * Announcements are rendered in batches instead of all at once, so a large
 * announcement history doesn't have to build every card/carousel up front.
 * A sentinel element sits after the last rendered card; an IntersectionObserver
 * watches it and renders the next batch as it scrolls into view.
 */
const ANNOUNCEMENTS_PAGE_SIZE = 6;

let currentList = [];
let currentTokens = [];
let renderedCount = 0;
let loadMoreObserver = null;
let loadMoreSentinel = null;

function renderNextBatch() {
  const next = currentList.slice(renderedCount, renderedCount + ANNOUNCEMENTS_PAGE_SIZE);
  next.forEach((entry) => container.appendChild(createCard(entry, currentTokens)));
  renderedCount += next.length;
  syncSelectedCardHighlight();

  if (renderedCount >= currentList.length) {
    if (loadMoreObserver) loadMoreObserver.disconnect();
    if (loadMoreSentinel) loadMoreSentinel.remove();
    return;
  }

  if (!loadMoreSentinel) {
    loadMoreSentinel = document.createElement('div');
    loadMoreSentinel.className = 'announcement-load-sentinel';
    loadMoreSentinel.setAttribute('aria-hidden', 'true');
  }
  container.appendChild(loadMoreSentinel); // (re)appending moves it to the end

  if (!loadMoreObserver) {
    loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) renderNextBatch();
      },
      { rootMargin: '400px' }
    );
  }
  loadMoreObserver.observe(loadMoreSentinel);
}

function render(list, tokens) {
  if (loadMoreObserver) loadMoreObserver.disconnect();
  loadMoreSentinel = null;
  container.innerHTML = '';

  currentList = list;
  currentTokens = tokens;
  renderedCount = 0;

  if (emptyState) emptyState.hidden = list.length !== 0;
  renderNextBatch();
}

function syncSelectedCardHighlight() {
  container.querySelectorAll('.announcement-card').forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.date === selectedDateKey);
  });
}

/* ----------------------------------------------------------------------
 * Calendar
 * -------------------------------------------------------------------- */

function renderCalendar() {
  if (!calendarRoot) return;

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const monthLabel = calendarMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();
  const todayKey = toDateKey(new Date());

  calendarRoot.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'calendar-header';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'calendar-nav-btn';
  prevBtn.setAttribute('aria-label', 'Previous month');
  prevBtn.textContent = '‹';
  prevBtn.addEventListener('click', () => {
    calendarMonth = new Date(year, month - 1, 1);
    renderCalendar();
  });

  const title = document.createElement('h2');
  title.className = 'calendar-title';
  title.textContent = monthLabel;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'calendar-nav-btn';
  nextBtn.setAttribute('aria-label', 'Next month');
  nextBtn.textContent = '›';
  nextBtn.addEventListener('click', () => {
    calendarMonth = new Date(year, month + 1, 1);
    renderCalendar();
  });

  header.append(prevBtn, title, nextBtn);
  calendarRoot.appendChild(header);

  const todayRow = document.createElement('div');
  todayRow.className = 'calendar-today-row';

  const todayBtn = document.createElement('button');
  todayBtn.type = 'button';
  todayBtn.className = 'calendar-today-btn';
  todayBtn.textContent = 'Return to today';
  todayBtn.addEventListener('click', () => {
    calendarMonth = new Date();
    renderCalendar();
  });

  todayRow.appendChild(todayBtn);
  calendarRoot.appendChild(todayRow);

  const weekdays = document.createElement('div');
  weekdays.className = 'calendar-weekdays';
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((label) => {
    const span = document.createElement('span');
    span.textContent = label;
    weekdays.appendChild(span);
  });
  calendarRoot.appendChild(weekdays);

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-cell is-empty';
    empty.setAttribute('aria-hidden', 'true');
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const events = announcementsByDate.get(dateKey) || [];

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-cell';
    if (events.length > 0) cell.classList.add('has-event');
    if (dateKey === todayKey) cell.classList.add('is-today');
    if (dateKey === selectedDateKey) cell.classList.add('is-selected');
    cell.dataset.date = dateKey;
    cell.setAttribute(
      'aria-label',
      events.length
        ? `${formatDate(dateKey)}: ${events.map((e) => e.title).join(', ')}`
        : formatDate(dateKey)
    );

    const dayNum = document.createElement('span');
    dayNum.className = 'calendar-day-number';
    dayNum.textContent = String(day);
    cell.appendChild(dayNum);

    if (events.length > 0) {
      const eventsWrap = document.createElement('div');
      eventsWrap.className = 'calendar-events';

      const maxVisible = 2;
      events.slice(0, maxVisible).forEach((event) => {
        const eventLabel = document.createElement('span');
        eventLabel.className = 'calendar-event-label';
        eventLabel.textContent = event.title;
        eventsWrap.appendChild(eventLabel);
      });

      if (events.length > maxVisible) {
        const more = document.createElement('span');
        more.className = 'calendar-event-more';
        more.textContent = `+${events.length - maxVisible} more`;
        eventsWrap.appendChild(more);
      }

      cell.appendChild(eventsWrap);
    }

    cell.addEventListener('click', () => selectCalendarDay(dateKey));
    grid.appendChild(cell);
  }

  calendarRoot.appendChild(grid);
}

function selectCalendarDay(dateKey) {
  selectedDateKey = dateKey;
  renderCalendar();
  showDayDetail(dateKey);
  scrollDayDetailIntoView();
  syncSelectedCardHighlight();
}

function scrollDayDetailIntoView() {
  if (!dayDetail || dayDetail.hidden) return;
  requestAnimationFrame(() => {
    dayDetail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

function showDayDetail(dateKey) {
  if (!dayDetail || !dayDetailTitle || !dayDetailList) return;

  const events = announcementsByDate.get(dateKey) || [];
  if (events.length === 0) {
    dayDetail.hidden = true;
    return;
  }

  dayDetail.hidden = false;
  dayDetailTitle.textContent = formatDate(dateKey);
  dayDetailList.innerHTML = '';

  events.forEach((event) => {
    const li = document.createElement('li');
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'calendar-day-link';
    link.textContent = event.title;
    link.addEventListener('click', () => scrollToAnnouncement(dateKey));
    li.appendChild(link);
    dayDetailList.appendChild(li);
  });
}

function scrollToAnnouncement(dateKey) {
  let card = container.querySelector(`.announcement-card[data-date="${dateKey}"]`);

  // The card may not be rendered yet if it's past the current batch —
  // render further batches until it shows up (or we run out of list).
  while (!card && renderedCount < currentList.length) {
    renderNextBatch();
    card = container.querySelector(`.announcement-card[data-date="${dateKey}"]`);
  }

  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/*
 * Deep links from other pages (e.g. the home page's featured event) point at
 * #announcement-<id>. The browser's native anchor jump fires before the JSON
 * has even loaded, so it never lands on anything — once the list is rendered,
 * find the target card (forcing extra batches into view if it's further down
 * the list than what's rendered by default) and scroll to it ourselves.
 */
function scrollToHashAnnouncement() {
  const match = window.location.hash.match(/^#announcement-(.+)$/);
  if (!match) return;
  const id = match[1];

  let card = document.getElementById(`announcement-${id}`);
  while (!card && renderedCount < currentList.length) {
    renderNextBatch();
    card = document.getElementById(`announcement-${id}`);
  }

  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/*
 * With no query: newest first. With a query: best fuzzy match first.
 */
function update() {
  const query = searchInput ? searchInput.value : '';

  const typeFiltered = activeTypeFilter === 'all'
    ? allAnnouncements
    : allAnnouncements.filter((entry) => {
      const type = entry.type === 'event' ? 'event' : 'announcement';
      return type === activeTypeFilter;
    });

  if (!query.trim()) {
    const sorted = [...typeFiltered].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    render(sorted, []);
    return;
  }

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const ranked = typeFiltered
    .map((entry) => ({ entry, score: scoreAnnouncement(query, entry) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.entry);

  render(ranked, tokens);
}

/* ----------------------------------------------------------------------
 * Back to top
 * -------------------------------------------------------------------- */

function initBackToTop() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'back-to-top-btn';
  btn.setAttribute('aria-label', 'Back to top');
  btn.textContent = '↑';
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(btn);

  let visible = false;
  const SHOW_AFTER = 500;

  const updateVisibility = () => {
    const shouldShow = window.scrollY > SHOW_AFTER;
    if (shouldShow !== visible) {
      visible = shouldShow;
      btn.classList.toggle('is-visible', visible);
    }
  };

  document.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();
}

/* ----------------------------------------------------------------------
 * Init
 * -------------------------------------------------------------------- */

initBackToTop();

fetch(ANNOUNCEMENTS_URL)
  .then((res) => res.json())
  .then((announcements) => {
    allAnnouncements = Array.isArray(announcements) ? announcements : [];
    announcementsByDate = buildAnnouncementsByDate(allAnnouncements);
    calendarMonth = new Date();
    renderCalendar();
    update();
    scrollToHashAnnouncement();
  })
  .catch((err) => {
    console.error('Failed to load announcements:', err);
    container.innerHTML = '<p>Could not fetch announcements.</p>';
  });

window.addEventListener('hashchange', scrollToHashAnnouncement);

if (searchInput) {
  searchInput.addEventListener('input', update);
}

if (typeFilterFieldset) {
  typeFilterFieldset.addEventListener('change', (e) => {
    if (e.target.name === 'type-filter') {
      activeTypeFilter = e.target.value;
      update();
    }
  });
}
