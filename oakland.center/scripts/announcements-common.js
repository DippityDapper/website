/* announcements-common.js – Shared date/time formatting and image carousel/lightbox
 * helpers used by both the announcements page and the home page's featured
 * event + announcements carousel. */

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(dateStr) {
  const d = parseLocalDate(dateStr);
  if (!d || isNaN(d)) return dateStr;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateLine(entry) {
  let line = formatDate(entry.date);
  if (entry.startTime) {
    line += entry.endTime
      ? ` · ${formatTime(entry.startTime)} – ${formatTime(entry.endTime)}`
      : ` · ${formatTime(entry.startTime)}`;
  }
  return line;
}

/* ----------------------------------------------------------------------
 * Image lightbox
 * -------------------------------------------------------------------- */

let lightboxEl = null;
let lightboxKeyHandler = null;

function closeLightbox() {
  if (!lightboxEl) return;
  lightboxEl.remove();
  lightboxEl = null;
  document.body.style.overflow = '';
  if (lightboxKeyHandler) {
    document.removeEventListener('keydown', lightboxKeyHandler);
    lightboxKeyHandler = null;
  }
}

function openLightbox(src, alt) {
  closeLightbox();

  lightboxEl = document.createElement('div');
  lightboxEl.className = 'lightbox';
  lightboxEl.setAttribute('role', 'dialog');
  lightboxEl.setAttribute('aria-modal', 'true');
  lightboxEl.setAttribute('aria-label', 'Enlarged image');

  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'lightbox-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeLightbox();
  });

  lightboxEl.append(img, closeBtn);
  lightboxEl.addEventListener('click', (e) => {
    if (e.target === lightboxEl) closeLightbox();
  });

  lightboxKeyHandler = (e) => {
    if (e.key === 'Escape') closeLightbox();
  };
  document.addEventListener('keydown', lightboxKeyHandler);

  document.body.style.overflow = 'hidden';
  document.body.appendChild(lightboxEl);
  closeBtn.focus();
}

/* ----------------------------------------------------------------------
 * Image carousel
 * -------------------------------------------------------------------- */

function createCarousel(images) {
  const carousel = document.createElement('div');
  carousel.className = 'carousel';

  const track = document.createElement('div');
  track.className = 'carousel-track';

  /* Set while a drag/swipe just changed the image, so the tap-to-enlarge
   * click that follows a touchend doesn't also pop the lightbox open. */
  let suppressClick = false;

  const imgEls = images.map((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Announcement image ${i + 1}`;
    img.loading = 'lazy';
    img.draggable = false;
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `Enlarge announcement image ${i + 1}`);
    /* Hide gracefully if an image path is broken. */
    img.addEventListener('error', () => img.classList.add('is-broken'));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!img.classList.contains('is-broken')) openLightbox(src, img.alt);
      }
    });
    track.appendChild(img);
    return img;
  });

  carousel.appendChild(track);

  let current = 0;
  const show = (index) => {
    current = (index + images.length) % images.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    if (dots) {
      dots.querySelectorAll('button').forEach((d, i) =>
        d.classList.toggle('active', i === current)
      );
    }
  };

  /* A single click handler on the track (rather than one per image) because
   * setPointerCapture below retargets the click event to the track anyway —
   * per-image listeners would never see it. The currently-visible image is
   * always the one the tap landed on, since overflow:hidden keeps the others
   * out of the hit-test area. */
  track.addEventListener('click', () => {
    if (suppressClick) return;
    const img = imgEls[current];
    if (!img.classList.contains('is-broken')) openLightbox(images[current], img.alt);
  });

  let dots = null;

  if (images.length > 1) {
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'carousel-btn carousel-prev';
    prev.setAttribute('aria-label', 'Previous image');
    prev.innerHTML = '&#10094;';
    prev.addEventListener('click', () => show(current - 1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'carousel-btn carousel-next';
    next.setAttribute('aria-label', 'Next image');
    next.innerHTML = '&#10095;';
    next.addEventListener('click', () => show(current + 1));

    dots = document.createElement('div');
    dots.className = 'carousel-dots';
    images.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Go to image ${i + 1}`);
      dot.addEventListener('click', () => show(i));
      dots.appendChild(dot);
    });

    carousel.append(prev, next, dots);

    /* Drag/swipe support (touch and mouse): follow the pointer while
     * dragging, then snap to the next/previous image or back to the
     * current one depending on how far the drag traveled. */
    let dragStartX = 0;
    let dragDeltaX = 0;
    let dragPointerId = null;

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragPointerId = e.pointerId;
      dragStartX = e.clientX;
      dragDeltaX = 0;
      track.style.transition = 'none';
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
      if (e.pointerId !== dragPointerId) return;
      dragDeltaX = e.clientX - dragStartX;
      const percent = (dragDeltaX / track.clientWidth) * 100;
      track.style.transform = `translateX(${-current * 100 + percent}%)`;
    });

    const endDrag = (e) => {
      if (e.pointerId !== dragPointerId) return;
      dragPointerId = null;
      track.style.transition = '';

      const threshold = track.clientWidth * 0.15;
      if (Math.abs(dragDeltaX) > threshold) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 300);
        show(dragDeltaX < 0 ? current + 1 : current - 1);
      } else {
        show(current);
      }
      dragDeltaX = 0;
    };

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
  }

  show(0);
  return carousel;
}
