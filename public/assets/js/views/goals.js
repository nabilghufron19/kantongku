// Target Tabungan (fitur Pro).
import { state, isPro } from '../store.js';
import { esc, rp, ic, P, todayStr } from '../util.js';
import { proLock, PRO_CHIP } from './prolock.js';

function goalCard(g) {
  const pct = Math.min(100, g.savedAmount / g.targetAmount * 100), done = g.savedAmount >= g.targetAmount;
  let info;
  if (done) info = 'Tercapai 🎉';
  else {
    const rest = g.targetAmount - g.savedAmount;
    info = `Kurang ${rp(rest)}`;
    if (g.deadline) {
      const days = Math.ceil((new Date(g.deadline + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 864e5);
      info += days < 0 ? `, tenggat lewat ${-days} hari` : `, ${days} hari lagi. Sisihkan sekitar ${rp(Math.ceil(rest / Math.max(1, days / 30) / 1000) * 1000)} per bulan`;
    }
  }
  return `<article class="goal ${done ? 'done' : ''}">
    <div class="goal-top">
      <div class="ico" style="--c:${esc(g.color)}" aria-hidden="true">${esc(g.icon)}</div>
      <div class="goal-name"><b>${esc(g.name)}</b><span>${rp(g.savedAmount)} dari ${rp(g.targetAmount)}</span></div>
      <div class="goal-edit">
        <button class="icon-btn" data-action="goal-edit" data-id="${esc(g.id)}" aria-label="Ubah target ${esc(g.name)}">${ic(P.edit)}</button>
        <button class="icon-btn" data-action="goal-del" data-id="${esc(g.id)}" aria-label="Hapus target ${esc(g.name)}">${ic(P.trash)}</button>
      </div>
    </div>
    <div class="bar"><i style="width:${pct}%;background:${esc(g.color)}"></i></div>
    <div class="bstat">${Math.round(pct)}%. ${esc(info)}</div>
    <div class="goal-acts"><button class="btn sm primary" data-action="goal-deposit" data-id="${esc(g.id)}">Setor</button><button class="btn sm" data-action="goal-withdraw" data-id="${esc(g.id)}">Tarik</button></div>
  </article>`;
}

export function goalsBody() {
  return state.goals.length
    ? `<div class="goals">${state.goals.map(goalCard).join('')}</div>`
    : '<div class="empty">Belum ada target. Mulai dari yang kecil, misalnya dana darurat atau gawai baru.</div>';
}

export function vGoalsSection() {
  const pro = isPro();
  return `<section class="set-sec">
    <div class="sec-head"><h2>Target tabungan ${pro ? '' : PRO_CHIP}</h2><button class="btn sm ${pro ? 'primary' : 'gold'}" data-action="goal-add">Tambah target</button></div>
    ${pro ? goalsBody() : proLock({
      title: 'Target Tabungan',
      blurb: 'Pasang target, setor bertahap, dan lihat berapa yang perlu disisihkan tiap bulan.',
      render: goalsBody,
    })}
  </section>`;
}
