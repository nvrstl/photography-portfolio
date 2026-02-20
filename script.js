// ===== Touch Detection =====
const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// ===== Elements =====
const cursor = document.getElementById('customCursor');
const canvas = document.getElementById('canvas');
const scrollContainer = document.getElementById('scrollContainer');
const aboutToggle = document.getElementById('aboutToggle');
const aboutOverlay = document.getElementById('aboutOverlay');
const filterToggle = document.getElementById('filterToggle');
const filterBar = document.getElementById('filterBar');
const filterBtns = document.querySelectorAll('.filter-btn');
const introText = document.getElementById('introText');
const navbar = document.querySelector('.navbar');

let items;
let aboutOpen = false;
let filterOpen = false;
let activeFilters = new Set();

// ===== Expand Overlay (all devices) =====
let expandOverlay = null;
let photoCounter = null;
let currentExpandedIndex = -1;
let visibleItems = [];

function createOverlayElements() {
  expandOverlay = document.createElement('div');
  expandOverlay.className = 'expand-overlay';
  expandOverlay.innerHTML = '<img src="" alt="">';
  document.body.appendChild(expandOverlay);

  photoCounter = document.createElement('div');
  photoCounter.className = 'photo-counter';
  document.body.appendChild(photoCounter);

  // Click overlay background to close
  expandOverlay.addEventListener('click', (e) => {
    if (e.target === expandOverlay) {
      closeOverlay();
    }
  });

  // Keyboard navigation (desktop)
  document.addEventListener('keydown', (e) => {
    if (!expandOverlay.classList.contains('visible')) return;
    if (e.key === 'Escape') closeOverlay();
    if (e.key === 'ArrowRight') navigateOverlay(1);
    if (e.key === 'ArrowLeft') navigateOverlay(-1);
  });

  // Swipe handling (touch)
  let touchStartX = 0;
  let touchStartY = 0;

  expandOverlay.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  expandOverlay.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) navigateOverlay(1);
      else navigateOverlay(-1);
    }
  }, { passive: true });
}

function getVisibleItems() {
  if (!items) return [];
  return Array.from(items).filter(item => {
    // Check if visible (not filtered out)
    const opacity = parseFloat(item.style.opacity);
    return isNaN(opacity) || opacity > 0.5;
  });
}

function openOverlay(item) {
  visibleItems = getVisibleItems();
  currentExpandedIndex = visibleItems.indexOf(item);
  const img = item.querySelector('.item-image');
  const overlayImg = expandOverlay.querySelector('img');
  overlayImg.src = img.dataset.full || img.src;
  overlayImg.alt = img.alt;
  expandOverlay.classList.add('visible');
  canvas.classList.add('blurred');
  updatePhotoCounter();
  photoCounter.classList.add('visible');
  scrollContainer.style.overflow = 'hidden';
}

function closeOverlay() {
  expandOverlay.classList.remove('visible');
  photoCounter.classList.remove('visible');
  canvas.classList.remove('blurred');
  currentExpandedIndex = -1;
  scrollContainer.style.overflow = 'auto';
}

function navigateOverlay(direction) {
  if (visibleItems.length === 0) return;
  currentExpandedIndex = (currentExpandedIndex + direction + visibleItems.length) % visibleItems.length;
  const item = visibleItems[currentExpandedIndex];
  const img = item.querySelector('.item-image');
  const overlayImg = expandOverlay.querySelector('img');
  overlayImg.src = img.dataset.full || img.src;
  overlayImg.alt = img.alt;
  updatePhotoCounter();
}

function updatePhotoCounter() {
  if (photoCounter && visibleItems.length > 0) {
    photoCounter.textContent = `${currentExpandedIndex + 1} / ${visibleItems.length}`;
  }
}

// ===== Custom Cursor (desktop only, rAF optimized) =====
if (!isTouch) {
  let cursorX = 0, cursorY = 0, cursorRAF = false;
  const cursorLat = cursor.querySelector('.cursor-lat');
  const cursorLng = cursor.querySelector('.cursor-lng');

  document.addEventListener('mousemove', (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
    if (!cursorRAF) {
      cursorRAF = true;
      requestAnimationFrame(() => {
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        const scrollY = scrollContainer ? scrollContainer.scrollTop : 0;
        const totalY = cursorY + scrollY;
        const lat = (35 + (totalY / (window.innerHeight * 3)) * 20).toFixed(4);
        const lng = (8 + (cursorX / window.innerWidth) * 15).toFixed(4);
        cursorLat.textContent = `${Math.abs(lat)}°N`;
        cursorLng.textContent = `${Math.abs(lng)}°E`;
        cursorRAF = false;
      });
    }
  });

  document.addEventListener('mouseenter', () => cursor.classList.add('visible'));
  document.addEventListener('mouseleave', () => cursor.classList.remove('visible'));
} else {
  cursor.style.display = 'none';
}

// ===== Scroll-based reveal =====
function setupScrollReveal() {
  if (!scrollContainer) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('loaded')) {
        gsap.to(entry.target, {
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          delay: Math.random() * 0.2,
          onStart: () => entry.target.classList.add('loaded')
        });
      }
    });
  }, {
    root: scrollContainer,
    threshold: 0.1,
    rootMargin: '0px 0px 80px 0px'
  });

  items.forEach((item, i) => {
    if (i >= 8) observer.observe(item);
  });
}

// ===== Loading Sequence =====
function initLoadingSequence() {
  items = document.querySelectorAll('.portfolio-item');

  // Create overlay elements for all devices
  createOverlayElements();

  const p = introText.querySelector('p');
  if (p && !isTouch) {
    const text = p.textContent;
    p.innerHTML = text.split('').map(ch =>
      ch === ' ' ? ' ' : `<span class="char">${ch}</span>`
    ).join('');
  }

  const aboutText = document.querySelector('.about-text');
  if (aboutText) {
    const words = aboutText.textContent.trim().split(/\s+/);
    aboutText.innerHTML = words.map(w => `<span class="word">${w}</span>`).join('');
  }

  const tl = gsap.timeline({ delay: 0.3 });
  tl.to(navbar, { opacity: 1, duration: 0.6, ease: 'power2.out' });

  if (!isTouch) {
    tl.to(introText, { opacity: 1, duration: 0.3 }, '-=0.2');
    tl.to('.intro-text .char', {
      opacity: 1, duration: 0.02, stagger: 0.02, ease: 'none'
    }, '-=0.1');
  }

  Array.from(items).slice(0, 8).forEach((item) => {
    tl.to(item, {
      opacity: 1, duration: 0.5, ease: 'power2.out',
      onStart: () => item.classList.add('loaded')
    }, `-=${0.35}`);
  });

  tl.call(() => setupScrollReveal());
  bindItemInteractions();
}

// ===== Text Scramble (desktop only) =====
const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function scrambleText(element, finalText) {
  if (isTouch) return; // skip on touch
  let iteration = 0;
  const length = finalText.length;
  const interval = setInterval(() => {
    element.textContent = finalText.split('').map((ch, i) => {
      if (i < iteration) return finalText[i];
      return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
    }).join('');
    iteration += 0.5;
    if (iteration >= length) {
      element.textContent = finalText;
      clearInterval(interval);
    }
  }, 30);
}

// ===== Bind Item Interactions =====
function bindItemInteractions() {
  if (!isTouch) {
    // Desktop: hover effects
    items.forEach(item => {
      const nameEl = item.querySelector('.item-name');
      const originalText = nameEl.dataset.text;

      item.addEventListener('mouseenter', () => {
        if (expandOverlay && expandOverlay.classList.contains('visible')) return;
        scrambleText(nameEl, originalText);
        item.classList.add('hovered');
        canvas.classList.add('hover-active');
      });

      item.addEventListener('mouseleave', () => {
        if (expandOverlay && expandOverlay.classList.contains('visible')) return;
        nameEl.textContent = originalText;
        item.classList.remove('hovered');
        canvas.classList.remove('hover-active');
      });
    });
  }

  // Click/tap handler — all devices use overlay
  items.forEach(item => {
    item.addEventListener('click', () => {
      openOverlay(item);
    });
  });
}


// ===== About Panel =====
aboutToggle.addEventListener('click', (e) => {
  e.preventDefault();
  aboutOpen = !aboutOpen;
  aboutToggle.classList.toggle('active', aboutOpen);

  if (aboutOpen) {
    aboutOverlay.classList.add('visible');
    canvas.classList.add('blurred');

    const heading = document.querySelector('.about-heading');
    const contact = document.querySelector('.about-contact');
    const words = document.querySelectorAll('.about-text .word');

    gsap.to(heading, { opacity: 1, duration: 0.4, delay: 0.1 });
    gsap.to(words, { opacity: 1, duration: 0.03, stagger: 0.03, ease: 'none', delay: 0.2 });
    gsap.to(contact, { opacity: 1, duration: 0.5, delay: 0.6 });
  } else {
    aboutOverlay.classList.remove('visible');
    canvas.classList.remove('blurred');
    gsap.set('.about-heading', { opacity: 0 });
    gsap.set('.about-text .word', { opacity: 0 });
    gsap.set('.about-contact', { opacity: 0 });
  }
});

// ===== Click outside about to close =====
aboutOverlay.addEventListener('click', (e) => {
  if (e.target === aboutOverlay) {
    aboutOpen = false;
    aboutToggle.classList.remove('active');
    aboutOverlay.classList.remove('visible');
    canvas.classList.remove('blurred');
    gsap.set('.about-heading', { opacity: 0 });
    gsap.set('.about-text .word', { opacity: 0 });
    gsap.set('.about-contact', { opacity: 0 });
  }
});

// ===== Filter System =====
filterToggle.addEventListener('click', (e) => {
  e.preventDefault();
  filterOpen = !filterOpen;
  filterToggle.classList.toggle('active', filterOpen);
  filterBar.classList.toggle('visible', filterOpen);

  if (!filterOpen) {
    activeFilters.clear();
    filterBtns.forEach(btn => btn.classList.remove('active'));
    clearFilters();
  }
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const year = btn.dataset.year;
    if (activeFilters.has(year)) {
      activeFilters.delete(year);
      btn.classList.remove('active');
    } else {
      activeFilters.add(year);
      btn.classList.add('active');
    }
    activeFilters.size === 0 ? clearFilters() : applyFilters();
  });
});

function applyFilters() {
  if (!items) return;
  items.forEach(item => {
    const match = activeFilters.has(item.dataset.year);
    gsap.to(item, {
      opacity: match ? 1 : 0.2,
      scale: match ? 1.05 : 0.95,
      duration: 0.4, ease: 'power2.out'
    });
  });
}

function clearFilters() {
  if (!items) return;
  items.forEach(item => {
    gsap.to(item, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
  });
}


// ===== Preloader =====
let preloaderDismissed = false;

function hidePreloader() {
  if (preloaderDismissed) return;
  preloaderDismissed = true;
  const preloader = document.getElementById('preloader');
  if (!preloader) return;
  preloader.classList.add('hidden');
  setTimeout(() => preloader.remove(), 500);
  initLoadingSequence();
}

// ===== Init =====
window.addEventListener('DOMContentLoaded', () => {
  // Show preloader for 1.5s (brick animation), then reveal site
  setTimeout(hidePreloader, 1500);
});
