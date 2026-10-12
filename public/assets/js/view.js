// Status tampilan bersama (tab aktif, bulan, filter) + pemicu render ulang.
import { thisMonth } from './util.js';

export const view = { tab: 'ringkasan', month: thisMonth(), q: '', type: 'all', cat: 'all', sort: 'new', all: false };

let renderer = () => {};
export const setRenderer = (fn) => { renderer = fn; };
export const rerender = () => renderer();
