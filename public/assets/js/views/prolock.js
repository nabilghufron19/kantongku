// Pembungkus fitur Pro: pengguna gratis melihat pratinjau (data contoh) yang diburamkan,
// diberi watermark "PRO" berulang, dan tombol upgrade.
import { esc } from '../util.js';
import { useSample } from '../store.js';

export const PRO_CHIP = '<span class="pro-chip">PRO</span>';

export function proLock({ title, blurb, render }) {
  const preview = useSample(render);
  return `<div class="pro-lock">
    <div class="pro-preview" aria-hidden="true" inert>${preview}</div>
    <div class="pro-overlay">
      <div class="pro-mark" aria-hidden="true"></div>
      <div class="pro-cta" role="group" aria-label="Fitur Pro: ${esc(title)}">
        <span class="pro-badge">PRO</span>
        <h3>${esc(title)}</h3>
        <p>${esc(blurb)}</p>
        <button class="btn gold" type="button" data-action="upgrade" data-feature="${esc(title)}">Buka dengan Pro</button>
      </div>
    </div>
  </div>`;
}
