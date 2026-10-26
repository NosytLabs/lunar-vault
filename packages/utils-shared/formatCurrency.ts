// Wallet amounts have six decimal places; retain any meaningful sub-unit award.
export function formatCurrencyAmount(value: number, currency: string, locale = 'en-US') {
	if (!Number.isFinite(value)) return '—';
	const fractional = String(Math.abs(Math.round(value * 1e6)) % 1e6)
		.padStart(6, '0')
		.replace(/0+$/, '').length;
	if (['XSC', 'XGC', 'XEC'].includes(currency)) {
		const token = currency === 'XGC' ? 'GC' : 'SC';
		return `${value.toFixed(Math.max(2, fractional))} ${token}`;
	}
	try {
		const normal = new Intl.NumberFormat(locale, { style: 'currency', currency });
		const digits = Math.max(normal.resolvedOptions().maximumFractionDigits, fractional);
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency,
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
		}).format(value);
	} catch {
		return formatCurrencyAmount(value, 'USD', 'en-US');
	}
}
