// Komponen UI kecil: toast, dialog konfirmasi, tombol sibuk.
import { $, esc } from './util.js';

export function toast(msg, action) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button type="button">${esc(action.label)}</button>` : '');
  el.classList.add('show');
  if (action) $('button', el).onclick = () => { el.classList.remove('show'); action.fn(); };
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), action ? 7000 : 3200);
}

// Mengembalikan null jika dibatalkan, atau { password } jika dilanjutkan.
export function confirmDialog({ title, message, okLabel = 'Lanjutkan', danger = false, askPassword = false }) {
  return new Promise((resolve) => {
    const dlg = $('#confirmDlg'), form = $('#cfForm'), cancel = $('#cfCancel');
    $('#cfTitle').textContent = title;
    $('#cfMsg').textContent = message;
    $('#cfOk').textContent = okLabel;
    $('#cfOk').className = 'btn ' + (danger ? 'danger-solid' : 'primary');
    $('#cfPassWrap').hidden = !askPassword;
    $('#cfPass').value = '';
    $('#cfErr').textContent = '';

    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      form.removeEventListener('submit', onSubmit);
      cancel.removeEventListener('click', onCancel);
      dlg.removeEventListener('close', onCancel);
      if (dlg.open) dlg.close();
      resolve(value);
    };
    const onCancel = () => finish(null);
    const onSubmit = (e) => {
      e.preventDefault();
      const password = $('#cfPass').value;
      if (askPassword && !password) { $('#cfErr').textContent = 'Isi kata sandi Anda.'; return; }
      finish({ password });
    };
    form.addEventListener('submit', onSubmit);
    cancel.addEventListener('click', onCancel);
    dlg.addEventListener('close', onCancel);
    dlg.showModal();
    (askPassword ? $('#cfPass') : $('#cfOk')).focus();
  });
}

// Menonaktifkan tombol selama permintaan berjalan.
export async function busy(buttons, fn) {
  const list = [buttons].flat().filter(Boolean);
  list.forEach((b) => { b.disabled = true; });
  try { return await fn(); } finally { list.forEach((b) => { b.disabled = false; }); }
}

// Mode layar: loading | auth | app
export function setMode(mode) {
  document.body.dataset.mode = mode;
  $('#boot').hidden = mode !== 'loading';
  $('#authRoot').hidden = mode !== 'auth';
  $('#appShell').hidden = mode !== 'app';
  $('#fab').hidden = mode !== 'app';
}

export function showFatal(err, retry) {
  setMode('loading');
  const b = $('#boot');
  b.innerHTML = `<h2>Kantong belum bisa dibuka</h2><p>${esc(err.message || 'Terjadi kesalahan.')}</p>
    <button class="btn primary" id="bootRetry" type="button">Coba lagi</button>
    <p class="small">Jika baru deploy, buka /api/health untuk memeriksa pengaturan database.</p>`;
  $('#bootRetry').onclick = () => { b.innerHTML = '<div class="spinner"></div><p>Memuat Kantong</p>'; retry(); };
}
