// Layar masuk / daftar / akun demo.
import { api } from '../api.js';
import { login, register, enterDemo } from '../store.js';
import { $, esc } from '../util.js';
import { busy, setMode } from '../ui.js';

export async function showAuth(notice = '', opts = {}) {
  setMode('auth');
  let cfg = { registrationOpen: true, firstRun: false };
  try { cfg = await api.get('/auth/config'); } catch (e) { notice = e.message; }
  let mode = opts.mode === 'register' && cfg.registrationOpen ? 'register' : cfg.firstRun ? 'register' : 'login';
  const root = $('#authRoot');

  const draw = (error = '', values = {}) => {
    const reg = mode === 'register';
    root.innerHTML = `
    <div class="auth-card">
      <div class="brand"><div class="logo" aria-hidden="true">👛</div><div><b>Kantong</b><small>Catatan keuangan pribadi</small></div></div>
      <h1>${reg ? 'Buat akun' : 'Masuk'}</h1>
      <p class="lead">${reg ? (cfg.firstRun ? 'Belum ada akun. Akun pertama otomatis menjadi admin.' : 'Daftar gratis dan mulai mencatat dalam semenit.') : 'Masuk untuk melihat catatan keuangan Anda.'}</p>
      ${notice ? `<div class="auth-note" role="alert">${esc(notice)}</div>` : ''}
      <form id="authForm" novalidate>
        ${reg ? `<div class="field"><label for="aName">Nama tampilan</label><input id="aName" name="name" maxlength="40" autocomplete="name" value="${esc(values.name || '')}"></div>` : ''}
        <div class="field"><label for="aUser">Nama pengguna</label><input id="aUser" name="username" maxlength="30" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(values.username || '')}"></div>
        <div class="field"><label for="aPass">Kata sandi</label><input type="password" id="aPass" name="password" autocomplete="${reg ? 'new-password' : 'current-password'}"></div>
        ${reg ? '<p class="muted small" style="margin-top:-6px">Nama pengguna 3-30 karakter (huruf, angka, titik, garis bawah). Kata sandi minimal 8 karakter.</p>' : ''}
        <div class="err" id="authErr" role="alert">${esc(error)}</div>
        <button class="btn primary" type="submit">${reg ? 'Daftar dan masuk' : 'Masuk'}</button>
      </form>
      ${cfg.registrationOpen && !cfg.firstRun ? `<p class="auth-switch">${reg ? 'Sudah punya akun?' : 'Belum punya akun?'} <button type="button" id="authSwitch">${reg ? 'Masuk' : 'Daftar gratis'}</button></p>` : ''}
      ${!cfg.registrationOpen ? '<p class="auth-note">Pendaftaran akun baru sedang ditutup oleh admin.</p>' : ''}
      <div class="auth-or"><span>atau</span></div>
      <button type="button" class="btn demo-btn" id="authDemo">Coba akun demo</button>
      <p class="muted small demo-hint">Lihat contoh pemakaian selama sebulan penuh, tanpa mendaftar. Semua fitur Pro terbuka.</p>
      <p class="powered">Powered by <b>Nabil Ghufron</b> 2026</p>
    </div>`;
    (reg ? $('#aName') : $('#aUser')).focus();
  };
  draw();

  return new Promise((resolve) => {
    root.onclick = async (e) => {
      if (e.target.id === 'authSwitch') { mode = mode === 'login' ? 'register' : 'login'; notice = ''; draw(); }
      if (e.target.id === 'authDemo') {
        try { await busy(e.target, () => enterDemo()); root.innerHTML = ''; resolve(); }
        catch (err) { draw(err.message); }
      }
    };
    root.onsubmit = async (e) => {
      e.preventDefault();
      const f = e.target.elements;
      const values = { name: f.name ? f.name.value : '', username: f.username.value };
      const password = f.password.value;
      if (!values.username.trim() || !password) return draw('Isi nama pengguna dan kata sandi.', values);
      try {
        await busy($('button[type=submit]', root), () => (mode === 'register' ? register(values.name, values.username, password) : login(values.username, password)));
        root.innerHTML = '';
        resolve();
      } catch (err) {
        notice = '';
        draw(err.message, values);
        if (err.field === 'password') $('#aPass').focus();
      }
    };
  });
}
