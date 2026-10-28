const messages: Record<string, string> = {
	ERR_DURATION:
		'This session requires a round-duration setting that this game version cannot safely interpret. Please contact support.',
	ERR_VAL: 'The session or selected amount is unavailable. Open a valid launch link and reload.',
	ERR_IPB: 'Balance is too low for this play. Reload to refresh the session.',
	ERR_GLE: 'The session play limit has been reached.',
	ERR_ACT: 'Please wait a moment, then reload to continue.',
	ERR_GEN: 'The game service is unavailable. Reload to recover any unfinished round.',
};
export function gameErrorMessage(error: unknown): string {
	const code =
		error && typeof error === 'object' ? (error as { error?: unknown }).error : undefined;
	return typeof code === 'string' && Object.hasOwn(messages, code)
		? messages[code]
		: 'Connection interrupted. Reload to recover any unfinished round.';
}
