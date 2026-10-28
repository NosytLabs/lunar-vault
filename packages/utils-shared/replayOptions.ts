import { isSupportedCurrency } from './formatCurrency.ts';
// Optional display parameters never change the authoritative recorded round.
export function replayAmount(raw: string | null): number {
	const amount = Number(raw);
	return Number.isSafeInteger(amount) && amount > 0 ? amount : 1_000_000;
}
export function replayCurrency(raw: string | null): string {
	return isSupportedCurrency(raw) ? raw : 'USD';
}
