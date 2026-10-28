// Symbol, ISO minor units and placement from the official Engine RGS currency table.
const metadata: Record<string, [string, number, boolean?]> = {
	USD: ['$', 2],
	CAD: ['CA$', 2],
	JPY: ['¥', 0],
	EUR: ['€', 2],
	RUB: ['₽', 2],
	CNY: ['CN¥', 2],
	PHP: ['₱', 2],
	INR: ['₹', 2],
	IDR: ['Rp', 0],
	KRW: ['₩', 0],
	BRL: ['R$', 2],
	MXN: ['MX$', 2],
	DKK: ['kr', 2, true],
	PLN: ['zł', 2, true],
	VND: ['₫', 0, true],
	TRY: ['₺', 2],
	CLP: ['CLP', 0, true],
	ARS: ['ARS', 2, true],
	PEN: ['S/', 2],
	NGN: ['₦', 2],
	SAR: ['SAR', 2, true],
	ILS: ['₪', 2],
	AED: ['AED', 2, true],
	TWD: ['NT$', 2],
	NOK: ['kr', 2, true],
	KWD: ['KD', 3],
	JOD: ['JD', 3],
	CRC: ['₡', 2],
	TND: ['TND', 3, true],
	SGD: ['SG$', 2],
	MYR: ['RM', 2],
	OMR: ['OMR', 3, true],
	QAR: ['QAR', 2, true],
	BHD: ['BD', 3],
	PKR: ['₨', 2],
	EGP: ['EGP', 2, true],
	NZD: ['NZ$', 2],
	BOB: ['Bs', 2],
	GHS: ['GH₵', 2],
	KES: ['KSh', 2],
	MAD: ['MAD', 2, true],
	BAM: ['KM', 2],
	ISK: ['kr', 0, true],
	TZS: ['TSh', 2],
	UGX: ['USh', 0],
	XOF: ['CFA', 0, true],
	XGC: ['GC', 2, true],
	XSC: ['SC', 2, true],
	XEC: ['SC', 2, true],
};
function currencyFractionDigits(value: number, currency: string) {
	const normal = metadata[currency]?.[1] ?? 2;
	const fraction = String(Math.abs(Math.round(value * 1e6)) % 1e6)
		.padStart(6, '0')
		.replace(/0+$/, '').length;
	return Math.max(normal, fraction);
}

export function formatCurrencyAmount(value: number, currency: string, locale = 'en-US') {
	if (!Number.isFinite(value)) return '—';
	const [symbol, , after] = metadata[currency] ?? [currency, 2, true];
	const digits = currencyFractionDigits(value, currency);
	let number: string;
	try {
		number = new Intl.NumberFormat(locale, {
			minimumFractionDigits: digits,
			maximumFractionDigits: digits,
		}).format(value);
	} catch {
		number = value.toFixed(digits);
	}
	return after ? `${number} ${symbol}` : `${symbol}${number}`;
}

// Interpolation must not invent finer digits than the actual award. Final
// sub-cent amounts still use the ordinary exact micro-unit formatter above.
export function formatCurrencyCountUp(
	value: number,
	finalValue: number,
	currency: string,
	locale = 'en-US',
) {
	if (!Number.isFinite(value) || !Number.isFinite(finalValue)) return '—';
	if (finalValue <= 0 || value >= finalValue)
		return formatCurrencyAmount(finalValue, currency, locale);
	const scale = 10 ** currencyFractionDigits(finalValue, currency);
	const displayed = Math.floor(Math.max(0, value) * scale) / scale;
	return formatCurrencyAmount(displayed, currency, locale);
}
