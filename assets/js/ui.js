/* ui.js — 렌더링 유틸리티 (템플릿 이스케이프, 토스트, 모달, 포맷터) */

export const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const RAW = Symbol('raw');
export const raw = s => ({ [RAW]: String(s ?? '') });
const render = v => {
  if (v == null || v === false) return '';
  if (Array.isArray(v)) return v.map(render).join('');
  if (typeof v === 'object' && RAW in v) return v[RAW];
  return esc(v);
};
/** 태그드 템플릿: 삽입값은 기본 이스케이프, raw()로 감싸면 그대로 삽입 */
export const h = (strings, ...vals) =>
  strings.reduce((out, s, i) => out + s + (i < vals.length ? render(vals[i]) : ''), '');

/* ── 포맷 ─────────────────────────────────────────────── */
export const num = (n, d = 0) => n == null || isNaN(n) ? '—'
  : Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
export const won = n => n == null ? '—' : Number(n).toLocaleString('ko-KR') + '원';
export function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(String(s).length === 10 ? s + 'T00:00:00' : s);
  if (isNaN(d)) return String(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
export function relDate(s) {
  if (!s) return '';
  const diff = Math.round((Date.now() - new Date(s).getTime()) / 86400000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  if (diff > 0 && diff < 7) return `${diff}일 전`;
  if (diff < 0) return `${-diff}일 뒤`;
  return fmtDate(s);
}
export const stars = n => {
  const full = Math.round(n || 0);
  return raw(`<span class="stars">${'★'.repeat(full)}${'☆'.repeat(Math.max(0, 5 - full))}</span>`);
};
export const initials = nick => String(nick || '?').trim().slice(0, 2).toUpperCase();

/* ── 토스트 ───────────────────────────────────────────── */
export function toast(msg, ms = 2200) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; setTimeout(() => el.remove(), 260); }, ms);
}

/* ── 모달 ─────────────────────────────────────────────── */
let openModal = null;
export function closeModal() { openModal?.remove(); openModal = null; }

/**
 * modal({title, body(HTML), submitLabel, onSubmit(formDataObject) -> false면 유지})
 */
export function modal({ title, body, submitLabel = '저장', cancelLabel = '취소', onSubmit, wide = false, footer = true }) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal" style="${wide ? 'max-width:760px' : ''}">
      <div class="modal-head"><h3>${esc(title)}</h3><div class="spacer"></div>
        <button class="btn btn-ghost btn-sm" data-close>✕</button></div>
      <form data-form><div class="modal-body">${body}</div>
      ${footer ? `<div class="modal-foot">
        <button type="button" class="btn" data-close>${esc(cancelLabel)}</button>
        <button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>
      </div>` : ''}</form>
    </div>`;
  document.body.appendChild(bg);
  openModal = bg;

  bg.addEventListener('click', e => {
    if (e.target === bg || e.target.closest('[data-close]')) closeModal();
  });
  bg.querySelector('[data-form]').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    e.target.querySelectorAll('input[type=checkbox]').forEach(c => { fd[c.name] = c.checked; });
    try {
      const r = await onSubmit?.(fd, bg);
      if (r !== false) closeModal();
    } catch (err) { toast(err.message || '저장이 안 됐어요. 다시 해볼까요?'); }
  });
  setTimeout(() => bg.querySelector('input,select,textarea')?.focus(), 40);
  return bg;
}

export function confirmModal(title, message, onYes, yesLabel = '삭제') {
  modal({
    title, submitLabel: yesLabel,
    body: `<p style="margin:0;font-size:13.5px;color:var(--ink-2);line-height:1.6">${esc(message)}</p>`,
    onSubmit: () => { onYes(); }
  });
}

/* ── 폼 조각 ──────────────────────────────────────────── */
export const field = (label, input, help) =>
  `<div class="field"><label>${esc(label)}</label>${input}${help ? `<span class="help">${esc(help)}</span>` : ''}</div>`;
export const inputEl = (name, opt = {}) =>
  `<input type="${opt.type || 'text'}" name="${name}" value="${esc(opt.value ?? '')}"
    ${opt.placeholder ? `placeholder="${esc(opt.placeholder)}"` : ''}
    ${opt.required ? 'required' : ''} ${opt.step ? `step="${opt.step}"` : ''}
    ${opt.min != null ? `min="${opt.min}"` : ''} ${opt.max != null ? `max="${opt.max}"` : ''}>`;
export const selectEl = (name, options, value) =>
  `<select name="${name}">${options.map(o => {
    const v = o.value ?? o, l = o.label ?? o;
    return `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(l)}</option>`;
  }).join('')}</select>`;
export const textareaEl = (name, opt = {}) =>
  `<textarea name="${name}" ${opt.placeholder ? `placeholder="${esc(opt.placeholder)}"` : ''}
    ${opt.required ? 'required' : ''} ${opt.rows ? `rows="${opt.rows}"` : ''}>${esc(opt.value ?? '')}</textarea>`;
export const checkEl = (name, label, checked) =>
  `<label class="check"><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}> ${esc(label)}</label>`;

export const empty = (icon, msg, action = '') =>
  `<div class="empty"><span class="em">${icon}</span>${esc(msg)}${action ? `<div style="margin-top:12px">${action}</div>` : ''}</div>`;
