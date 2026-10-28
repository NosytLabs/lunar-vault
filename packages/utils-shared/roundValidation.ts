export type RoundEvent = { index: number; type: string; [key: string]: unknown };
const invalid = () =>
	new Error(
		'This replay is unavailable or contains an invalid round. Open a valid replay link and reload.',
	);
const nonnegative = (value: unknown): value is number =>
	typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function validateReplayRound(value: unknown) {
	if (!value || typeof value !== 'object') throw invalid();
	const data = value as Record<string, unknown>;
	if (data.error || !Array.isArray(data.state) || !data.state.length) throw invalid();
	const state = data.state as RoundEvent[];
	if (
		state.some((event, index) => !event || event.index !== index || typeof event.type !== 'string')
	)
		throw invalid();
	const final = state.at(-1)!;
	if (
		!['reveal', 'freeSpinTrigger'].includes(state[0].type) ||
		!state.some((event) => event.type === 'reveal') ||
		final.type !== 'finalWin' ||
		!Number.isSafeInteger(final.amount) ||
		!nonnegative(final.amount) ||
		!nonnegative(data.payoutMultiplier) ||
		Math.abs(final.amount / 100 - data.payoutMultiplier) > 1e-8 ||
		(data.costMultiplier !== undefined &&
			(!nonnegative(data.costMultiplier) || data.costMultiplier < 1)) ||
		(data.amount !== undefined &&
			(!Number.isSafeInteger(data.amount) || !nonnegative(data.amount) || data.amount === 0)) ||
		(data.payout !== undefined && (!Number.isSafeInteger(data.payout) || !nonnegative(data.payout)))
	)
		throw invalid();
	if (
		typeof data.amount === 'number' &&
		typeof data.payout === 'number' &&
		Math.round(data.amount * data.payoutMultiplier) !== data.payout
	)
		throw invalid();
	return data as Record<string, unknown> & {
		state: RoundEvent[];
		payoutMultiplier: number;
		costMultiplier?: number;
	};
}
export function validateRoundCheckpoint(value: unknown, length: number) {
	const checkpoint = value === null || value === undefined ? 0 : Number(value);
	if (!Number.isSafeInteger(checkpoint) || checkpoint < 0 || checkpoint > length || value === '')
		throw new Error('The saved round checkpoint is invalid. Reload to recover the round.');
	return checkpoint;
}
