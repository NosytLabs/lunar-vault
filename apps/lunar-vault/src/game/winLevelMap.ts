import { SECOND } from 'constants-shared/time';
import config from './config';

export const winLevelMap = {
	1: {
		level: 1,
		alias: 'zero',
		type: 'small',
		text: null,
		presentDuration: 0,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	2: {
		level: 2,
		alias: 'standard',
		type: 'small',
		text: null,
		presentDuration: 0.6 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	3: {
		level: 3,
		alias: 'small',
		type: 'small',
		text: null,
		presentDuration: 1 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	4: {
		level: 4,
		alias: 'nice',
		type: 'medium',
		text: null,
		presentDuration: 1.5 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	5: {
		level: 5,
		alias: 'substantial',
		type: 'medium',
		text: null,
		presentDuration: 2.0 * SECOND,
		sound: { sfx: undefined, bgm: undefined },
		animation: undefined,
	},
	6: {
		level: 6,
		alias: 'big',
		type: 'big',
		text: 'BIG WIN',
		presentDuration: 2.8 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_big' },
		animation: { intro: 'big_win_intro', idle: 'big_win_idle', outro: 'big_win_exit' },
	},
	7: {
		level: 7,
		alias: 'superwin',
		type: 'big',
		text: 'SUPER WIN',
		presentDuration: 3.6 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_superwin' },
		animation: { intro: 'super_win_intro', idle: 'super_win_idle', outro: 'super_win_exit' },
	},
	8: {
		level: 8,
		alias: 'mega',
		type: 'big',
		text: 'MEGA WIN',
		presentDuration: 4.4 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_mega' },
		animation: { intro: 'mega_win_intro', idle: 'mega_win_idle', outro: 'mega_win_exit' },
	},
	9: {
		level: 9,
		alias: 'epic',
		type: 'big',
		text: 'EPIC WIN!',
		presentDuration: 5.2 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_epic' },
		animation: { intro: 'epic_win_intro', idle: 'epic_win_idle', outro: 'epic_win_exit' },
	},
	10: {
		level: 10,
		alias: 'max',
		type: 'big',
		text: 'MAX WIN',
		presentDuration: 6 * SECOND,
		sound: { sfx: undefined, bgm: 'bgm_winlevel_max' },
		animation: { intro: 'max_win_intro', idle: 'max_win_idle', outro: 'max_win_exit' },
	},
} as const;

export type WinLevelMap = typeof winLevelMap;
export type WinLevel = keyof typeof winLevelMap;
export type WinLevelData = WinLevelMap[WinLevel];
export type WinLevelAlias = WinLevelData['alias'];

// Presentation compares the award against full mode cost; results stay server authoritative.
export function getPresentationWinLevel(amount: number, costMultiplier = 1) {
	const paidUnits = Math.max(1, costMultiplier) * 100;
	const ratio = amount / paidUnits;
	const maximum =
		costMultiplier === config.betModes.bonus.cost
			? config.betModes.bonus.max_win
			: config.betModes.base.max_win;
	const level: WinLevel =
		amount >= maximum * 100 && ratio > 1
			? 10
			: ratio >= 100
				? 9
				: ratio >= 50
					? 8
					: ratio >= 25
						? 7
						: ratio >= 10
							? 6
							: ratio >= 5
								? 5
								: ratio >= 2
									? 4
									: ratio > 1
										? 3
										: amount > 0
											? 2
											: 1;
	return winLevelMap[level];
}
