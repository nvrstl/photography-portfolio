const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const photosDir = path.join(__dirname, 'photos');
const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

// Read existing HTML
let html = fs.readFileSync(htmlPath, 'utf-8');

// Scan photos folder
const files = fs.readdirSync(photosDir)
  .filter(f => extensions.includes(path.extname(f).toLowerCase()))
  .sort();

if (files.length === 0) {
  console.log('No photos found in /photos folder.');
  console.log('Naming format: Project-Name_2024.jpg');
  process.exit(1);
}

// Parse filename → { name, year, file }
const items = files.map(f => {
  let base = f;
  while (extensions.includes(path.extname(base).toLowerCase())) {
    base = path.basename(base, path.extname(base));
  }

  const yearMatch = base.match(/^(.+)_(\d{4})$/);
  let name, year;
  if (yearMatch) {
    name = yearMatch[1];
    year = yearMatch[2];
  } else {
    name = base;
    year = '2024';
  }

  // Underscores become spaces, dashes kept as-is
  name = name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

  return { name, year, file: f };
});

// Unique years
const years = [...new Set(items.map(i => i.year))].sort();

// Layout — seeded random for consistent but organic positions, no overlap
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const cols = 4;
const baseRowHeight = 360;
const colBases = [14, 37, 60, 83]; // center points per column
const rand = seededRandom(42);

const positions = items.map((item, i) => {
  const row = Math.floor(i / cols);
  const col = i % cols;

  // Small horizontal jitter (±2%) — stays within column lane
  const leftOffset = colBases[col] + (rand() * 4 - 2);
  const left = `${Math.round(leftOffset * 10) / 10}%`;

  // Vertical jitter only forward (0 to +50px) so items never creep into the row above
  const topBase = 80 + row * baseRowHeight;
  const topOffset = rand() * 50;
  const top = `${Math.round(topBase + topOffset)}px`;

  return { ...item, left, top };
});

const canvasHeight = Math.ceil(items.length / cols) * baseRowHeight + 300;

// Generate photos HTML (thumbs for grid, data-full for originals)
const photosHtml = positions.map((p, i) => {
  const eager = i < 4;
  const loadAttr = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  return `    <div class="portfolio-item" data-year="${p.year}" style="left: ${p.left}; top: ${p.top};">
      <img class="item-image" decoding="async" src="thumbs/${p.file}" data-full="photos/${p.file}" alt="${p.name}" ${loadAttr}>
      <div class="item-info">
        <span class="item-name" data-text="${p.name}">${p.name}</span>
        <span class="item-year">${p.year}</span>
      </div>
    </div>`;
}).join('\n');

// Generate filter buttons HTML
const filtersHtml = `  <div class="filter-bar" id="filterBar">
${years.map(y => `    <button class="filter-btn" data-year="${y}">${y}</button>`).join('\n')}
  </div>`;

// Replace PHOTOS section
html = html.replace(
  /<!-- PHOTOS:START -->[\s\S]*?<!-- PHOTOS:END -->/,
  `<!-- PHOTOS:START -->\n    <div class="canvas" id="canvas" style="height: ${canvasHeight}px;">\n${photosHtml}\n    </div>\n    <!-- PHOTOS:END -->`
);

// Replace FILTERS section
html = html.replace(
  /<!-- FILTERS:START -->[\s\S]*?<!-- FILTERS:END -->/,
  `<!-- FILTERS:START -->\n${filtersHtml}\n  <!-- FILTERS:END -->`
);

fs.writeFileSync(htmlPath, html);
console.log(`Updated ${items.length} photos (${years.join(', ')}) — everything else untouched.`);
