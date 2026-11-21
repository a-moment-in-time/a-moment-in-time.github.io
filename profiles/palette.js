/* A Moment in Time — optional character color palette
 * Add AFTER the existing profile loader script in profiles/index.html:
 * <script src="palette.js"></script>
 * Each [PALETTE] line: Label | #RRGGBB | optional form/note
 * Maximum 16 valid colors; one selected swatch's details at a time.
 * No alterations to the established profile loader or its tabs.
 */
(function () {
  'use strict';

  const MAX_COLORS = 16;
  const appearanceTab = document.getElementById('side-tab-looks');
  const appearancePanel = appearanceTab && appearanceTab.nextElementSibling &&
    appearanceTab.nextElementSibling.nextElementSibling;

  // Load safely even if added to an outdated/test copy of the page.
  if (!appearancePanel || typeof window.displayCharacter !== 'function' ||
      typeof window.resetProfileView !== 'function') {
    console.warn('Character palette: a compatible profile loader was not found.');
    return;
  }

  const style = document.createElement('style');
  style.id = 'character-palette-styles';
  style.textContent = `
    /* Only the optional Appearance palette; other profile styles are unchanged. */
    .character-palette { margin-top: 15px; padding-top: 12px; border-top: 1px solid #a08264; min-width: 0; }
    .character-palette.is-hidden, .character-palette .is-hidden { display: none !important; }
    .character-palette-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .character-palette-heading-label { display: flex; align-items: baseline; flex-wrap: wrap; gap: 3px 8px; min-width: 0; }
    .character-palette-heading strong { color: #900b0b; font-family: 'Alegreya SC', serif; font-size: 18px; }
    .character-palette-hint { font-size: 11px; color: #70594c; font-style: italic; }
    .character-palette-count { margin-left: auto; font-size: 12px; color: #70594c; white-space: nowrap; }
    .character-palette-swatches { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; }
    .character-palette-swatch { display: block; width: 100%; min-width: 0; aspect-ratio: 1; min-height: 30px; padding: 0; margin: 0; border: 1px solid rgba(61, 37, 27, .7); border-radius: 4px; cursor: pointer; box-sizing: border-box; }
    .character-palette-swatch:hover, .character-palette-swatch:focus-visible { outline: 2px solid #900b0b; outline-offset: 1px; }
    .character-palette-swatch[aria-pressed="true"] { outline: 3px solid #503b30; outline-offset: 1px; }
    .character-palette-details { margin-top: 11px; padding: 9px; border: 1px solid rgba(80, 59, 49, .3); border-radius: 5px; background: rgba(61, 37, 27, .07); }
    .character-palette-selected { display: flex; align-items: center; gap: 9px; min-width: 0; }
    .character-palette-chip { flex: 0 0 33px; height: 33px; border: 1px solid rgba(61, 37, 27, .65); border-radius: 4px; box-sizing: border-box; }
    .character-palette-text { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; font-family: 'Source Sans Pro', sans-serif; }
    .character-palette-label { font-weight: bold; color: #503b30; font-size: 14px; line-height: 1.2; }
    .character-palette-note { font-size: 12px; color: #6b574b; margin-top: 3px; }
    .character-palette-copy { flex: 0 0 auto; font: 12px 'Source Sans Pro', sans-serif; color: #503b30; background: rgba(255,255,255,.55); border: 1px solid #a08264; border-radius: 4px; cursor: pointer; padding: 6px; }
    .character-palette-copy:hover, .character-palette-copy:focus-visible { background: #ffffff; }
    @media (max-width: 365px) {
      .character-palette-swatches { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .character-palette-selected { flex-wrap: wrap; }
      .character-palette-copy { margin-left: 42px; }
    }
  `;
  document.head.appendChild(style);

  // This sits beneath Appearance's existing fields, NOT inside an info-list:
  // existing automatic empty-row/list handling therefore remains unchanged.
  const card = document.createElement('section');
  card.className = 'character-palette is-hidden';
  card.setAttribute('aria-label', 'Character color palette');
  card.innerHTML = `
    <div class="character-palette-heading">
      <div class="character-palette-heading-label">
        <strong>Color Palette</strong>
        <span class="character-palette-hint">Click a color to expand</span>
      </div>
      <span class="character-palette-count"></span>
    </div>
    <div class="character-palette-swatches" role="group" aria-label="Choose a character color"></div>
    <div class="character-palette-details is-hidden" aria-live="polite">
      <div class="character-palette-selected">
        <span class="character-palette-chip" aria-hidden="true"></span>
        <div class="character-palette-text">
          <div class="character-palette-label"></div>
          <div class="character-palette-note is-hidden"></div>
        </div>
        <button type="button" class="character-palette-copy" title="Copy hex code to clipboard"></button>
      </div>
    </div>
  `;
  appearancePanel.appendChild(card);

  const swatches = card.querySelector('.character-palette-swatches');
  const details = card.querySelector('.character-palette-details');
  const chip = card.querySelector('.character-palette-chip');
  const nameLabel = card.querySelector('.character-palette-label');
  const noteLabel = card.querySelector('.character-palette-note');
  const copyButton = card.querySelector('.character-palette-copy');
  const count = card.querySelector('.character-palette-count');
  let selected = -1;
  let palette = [];

  function resetPalette() {
    palette = [];
    selected = -1;
    swatches.replaceChildren();
    details.classList.add('is-hidden');
    card.classList.add('is-hidden');
  }

  function parsePalette(raw) {
    const valid = [];
    if (!raw || !String(raw).trim()) return valid;
    const lines = String(raw).split(/\r?\n/);
    let invalid = 0;
    let extra = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;
      const parts = trimmed.split('|').map(part => part.trim());
      if (parts.length < 2 || parts.length > 3 || !parts[0] || !/^#[0-9a-fA-F]{6}$/.test(parts[1])) {
        invalid++;
        continue;
      }
      if (valid.length >= MAX_COLORS) {
        extra++;
        continue;
      }
      valid.push({ name: parts[0], hex: parts[1].toUpperCase(), note: parts[2] || '' });
    }
    if (invalid) console.warn(`Character palette: skipped ${invalid} invalid line(s). Use Label | #RRGGBB | optional note.`);
    if (extra) console.warn(`Character palette: maximum ${MAX_COLORS} swatches; ignored ${extra} extra color(s).`);
    return valid;
  }

  function setSelected(index) {
    selected = selected === index ? -1 : index;
    swatches.querySelectorAll('button').forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === selected));
    });
    if (selected < 0) {
      details.classList.add('is-hidden');
      return;
    }
    const color = palette[selected];
    chip.style.backgroundColor = color.hex;
    nameLabel.textContent = color.name;
    noteLabel.textContent = color.note;
    noteLabel.classList.toggle('is-hidden', !color.note);
    copyButton.textContent = color.hex + ' ⧉';
    copyButton.setAttribute('aria-label', `Copy ${color.hex}, ${color.name}`);
    details.classList.remove('is-hidden');
  }

  function renderPalette(raw) {
    resetPalette();
    palette = parsePalette(raw);
    if (!palette.length) return;
    card.classList.remove('is-hidden');
    count.textContent = `${palette.length} / ${MAX_COLORS}`;

    palette.forEach((color, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'character-palette-swatch';
      button.style.backgroundColor = color.hex;
      button.title = color.name + (color.note ? ` (${color.note})` : '');
      button.setAttribute('aria-label', color.name + (color.note ? `, ${color.note}` : ''));
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => setSelected(index));
      swatches.appendChild(button);
    });

    // The original loader hides an Appearance tab if all its regular fields
    // are blank. A palette by itself must still make that tab available.
    if (appearanceTab.classList.contains('is-hidden')) {
      window.setTabVisible('side-tab-looks', true);
      document.querySelector('.profile-grid').classList.remove('no-sidebar');
      const checkedTab = document.querySelector('input[name="sidebar-details"]:checked');
      if (!checkedTab || checkedTab.classList.contains('is-hidden')) {
        window.selectFirstAvailableSideTab();
      }
    }
  }

  copyButton.addEventListener('click', async () => {
    if (selected < 0) return;
    const hex = palette[selected].hex;
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(hex);
        copied = true;
      }
    } catch (_) { /* Fall back to older clipboard support. */ }
    if (!copied) {
      const input = document.createElement('textarea');
      input.value = hex;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      try { copied = document.execCommand('copy'); } catch (_) { /* No clipboard support. */ }
      input.remove();
    }
    copyButton.textContent = copied ? 'Copied!' : hex;
  });

  // Keep the existing loader intact. These small wrappers only receive the
  // existing parsed [PALETTE] text and clear it when characters are switched.
  const originalReset = window.resetProfileView;
  window.resetProfileView = function (...args) {
    const result = originalReset.apply(this, args);
    resetPalette();
    return result;
  };
  const originalDisplay = window.displayCharacter;
  window.displayCharacter = function (sections) {
    const result = originalDisplay.call(this, sections);
    renderPalette(sections.get('palette'));
    return result;
  };
})();
