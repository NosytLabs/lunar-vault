import { MediaQuery } from 'svelte/reactivity';
// Shared reactive preference; no effect may change the book's result or event order.
export const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
