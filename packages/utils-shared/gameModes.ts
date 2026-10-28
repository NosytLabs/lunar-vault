/** Wallet mode names are compared case-insensitively; requests retain server spelling. */
export const canonicalModeName = (mode: string) => mode.trim().toLowerCase();
export type AuthenticatedGameMode = { mode: string; costMultiplier: number; maxBet: number };
export function normalizeGameModes(
	value: unknown,
	expectedCosts: Record<string, number>,
): Record<string, AuthenticatedGameMode> {
	const invalid = () =>
		new Error('The session mode configuration does not match this game version.');
	if (!Array.isArray(value) || !value.length) throw invalid();
	const expected = Object.fromEntries(
		Object.entries(expectedCosts).map(([name, cost]) => [canonicalModeName(name), cost]),
	);
	const modes: Record<string, AuthenticatedGameMode> = Object.create(null);
	for (const entry of value) {
		if (!entry || typeof entry !== 'object' || typeof entry.mode !== 'string') throw invalid();
		const name = canonicalModeName(entry.mode);
		if (
			!name ||
			Object.hasOwn(modes, name) ||
			!Object.hasOwn(expected, name) ||
			!Number.isFinite(entry.costMultiplier) ||
			entry.costMultiplier < 1 ||
			entry.costMultiplier !== expected[name] ||
			!Number.isSafeInteger(entry.maxBet) ||
			entry.maxBet <= 0
		)
			throw invalid();
		modes[name] = { mode: entry.mode, costMultiplier: entry.costMultiplier, maxBet: entry.maxBet };
	}
	if (Object.keys(expected).some((name) => !Object.hasOwn(modes, name))) throw invalid();
	return modes;
}
