import { stateI18n } from 'state-shared';

import { BOOK_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { stateBet } from 'state-shared';

// Social-casino currencies have no ISO code, so Intl cannot format them.
// Engine requires them as a suffix: "10.00 SC" / "10.00 GC", never "SC 10.00".
const NO_LOCALISATION_CURRENCY_MAP: Record<string, string> = {
	XGC: 'GC',
	XSC: 'SC',
};

// Currencies whose ISO code is not a valid Intl currency code.
const CURRENCY_DECIMALS_MAP: Record<string, number> = {
	XGC: 2,
	XSC: 2,
};

// Engine's currency table fixes the decimal count per currency. Intl already
// does the right thing for real ISO currencies (JPY -> 0, USD/EUR/CAD/MXN -> 2),
// but the social currencies have to be handled by hand. Anything not listed
// falls back to Intl's own default for that currency.
const getCurrencyDecimals = (currency: string): number | undefined =>
	CURRENCY_DECIMALS_MAP[currency];

// bookEventAmount: is the amount or win numbers in the events of books, e.g. the amount in setTotalWin bookEvent
// {
// 	"index": 3,
// 	"type": "setTotalWin",
// 	"amount": 100
// },
// if betting on $1,   100 bookEventAmount equals to $1.    betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $1,    50 bookEventAmount equals to $0.5.  betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5
// if betting on $0.5, 100 bookEventAmount equals to $0.5.  betAmountMultiplier is (100 / BOOK_AMOUNT_MULTIPLIER =) 1
// if betting on $0.5,  50 bookEventAmount equals to $0.25. betAmountMultiplier is ( 50 / BOOK_AMOUNT_MULTIPLIER =) 0.5

export const bookEventAmountToBetAmountMultiplier = (bookEventAmount: number) =>
	bookEventAmount / BOOK_AMOUNT_MULTIPLIER;

export const bookEventAmountToNormalisedAmount = (bookEventAmount: number) => {
	const betAmountMultiplier = bookEventAmountToBetAmountMultiplier(bookEventAmount);
	return stateBet.wageredBetAmount * betAmountMultiplier;
};

export const numberToFloat = (value: number) => Number.parseFloat(`${value}`);

export const numberToCurrencyString = (value: number) => {
	const currency = stateBet.currency;

	// Social currencies: "10.00 SC", amount first, currency suffix.
	if (currency in NO_LOCALISATION_CURRENCY_MAP) {
		const decimals = getCurrencyDecimals(currency) ?? 2;
		return `${numberToFloat(value).toFixed(decimals)} ${NO_LOCALISATION_CURRENCY_MAP[currency]}`;
	}

	// Real ISO currencies. Do not force the fraction digits: Intl already
	// applies the correct count per currency (JPY has none, USD/EUR/CAD/MXN
	// have two). Forcing 2 breaks JPY, and pinning maximumFractionDigits to 2
	// hides sub-cent wins.
	return stateI18n.i18n.number(value, {
		style: 'currency',
		currency,
		// numberingSystem: 'latn',
	});
};

export const bookEventAmountToCurrencyString = (bookEventAmount: number) => {
	const normalisedAmount = bookEventAmountToNormalisedAmount(bookEventAmount);
	return numberToCurrencyString(normalisedAmount);
};
