import _ from 'lodash';

import type { RawSymbol, SymbolState } from './types';

export const SYMBOL_SIZE = 120;

export const REEL_PADDING = 0.53;

// initial board (padded top and bottom)
export const INITIAL_BOARD: RawSymbol[][] = [
	[
		{
			name: 'L2',
		},
		{
			name: 'L1',
		},
		{
			name: 'L4',
		},
		{
			name: 'H2',
		},
		{
			name: 'L1',
		},
	],
	[
		{
			name: 'H1',
		},
		{
			name: 'L5',
		},
		{
			name: 'L2',
		},
		{
			name: 'H3',
		},
		{
			name: 'L4',
		},
	],
	[
		{
			name: 'L3',
		},
		{
			name: 'L5',
		},
		{
			name: 'L3',
		},
		{
			name: 'H4',
		},
		{
			name: 'L4',
		},
	],
	[
		{
			name: 'H4',
		},
		{
			name: 'H3',
		},
		{
			name: 'L4',
		},
		{
			name: 'L5',
		},
		{
			name: 'L1',
		},
	],
	[
		{
			name: 'H3',
		},
		{
			name: 'L3',
		},
		{
			name: 'L3',
		},
		{
			name: 'H1',
		},
		{
			name: 'H1',
		},
	],
];

export const BOARD_DIMENSIONS = { x: INITIAL_BOARD.length, y: INITIAL_BOARD[0].length - 2 };

export const BOARD_SIZES = {
	width: SYMBOL_SIZE * BOARD_DIMENSIONS.x,
	height: SYMBOL_SIZE * BOARD_DIMENSIONS.y,
};

export const BACKGROUND_RATIO = 2039 / 1000;
export const PORTRAIT_BACKGROUND_RATIO = 1242 / 2208;
const PORTRAIT_RATIO = 800 / 1422;
const LANDSCAPE_RATIO = 1600 / 900;
const DESKTOP_RATIO = 1422 / 800;

const DESKTOP_HEIGHT = 800;
const LANDSCAPE_HEIGHT = 900;
const PORTRAIT_HEIGHT = 1422;
export const DESKTOP_MAIN_SIZES = { width: DESKTOP_HEIGHT * DESKTOP_RATIO, height: DESKTOP_HEIGHT };
export const LANDSCAPE_MAIN_SIZES = {
	width: LANDSCAPE_HEIGHT * LANDSCAPE_RATIO,
	height: LANDSCAPE_HEIGHT,
};
export const PORTRAIT_MAIN_SIZES = {
	width: PORTRAIT_HEIGHT * PORTRAIT_RATIO,
	height: PORTRAIT_HEIGHT,
};

export const HIGH_SYMBOLS = ['H1', 'H2', 'H3', 'H4', 'H5'];

export const INITIAL_SYMBOL_STATE: SymbolState = 'static';

const HIGH_SYMBOL_SIZE = 0.9;
const LOW_SYMBOL_SIZE = 0.9;
const SPECIAL_SYMBOL_SIZE = 1;

const SPIN_OPTIONS_SHARED = {
	reelBounceBackSpeed: 0.15,
	reelSpinSpeedBeforeBounce: 4,
	reelPaddingMultiplierNormal: 1.2,
	reelPaddingMultiplierAnticipated: 10,
	reelSpinDelay: 145,
};

export const SPIN_OPTIONS_DEFAULT = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 2,
	reelSpinSpeed: 3,
	reelBounceSizeMulti: 0.3,
};

export const SPIN_OPTIONS_FAST = {
	...SPIN_OPTIONS_SHARED,
	reelPreSpinSpeed: 5,
	reelSpinSpeed: 5,
	reelBounceSizeMulti: 0.05,
};

export const MOTION_BLUR_VELOCITY = 31;

export const zIndexes = {
	background: {
		backdrop: -3,
		normal: -2,
		feature: -1,
	},
};

const explosion = {
	type: 'sprite' as const,
	assetKey: 'lunarStarFlare',
	sizeRatios: { width: 1.1, height: 1.1 },
};

// Original art in all normal reel states; keep the book/board event contract unchanged.
const icon = (
	assetKey:
		| 'lunarH1'
		| 'lunarH2'
		| 'lunarH3'
		| 'lunarH4'
		| 'lunarH5'
		| 'lunarL1'
		| 'lunarL2'
		| 'lunarL3'
		| 'lunarL4'
		| 'lunarL5'
		| 'lunarW'
		| 'lunarS',
) => ({
	type: 'sprite' as const,
	assetKey,
	sizeRatios: { width: 0.96, height: 0.96 },
});
export const SYMBOL_INFO_MAP = {
	H1: {
		explosion,
		static: icon('lunarH1'),
		spin: icon('lunarH1'),
		land: icon('lunarH1'),
		win: icon('lunarH1'),
		postWinStatic: icon('lunarH1'),
	},
	H2: {
		explosion,
		static: icon('lunarH2'),
		spin: icon('lunarH2'),
		land: icon('lunarH2'),
		win: icon('lunarH2'),
		postWinStatic: icon('lunarH2'),
	},
	H3: {
		explosion,
		static: icon('lunarH3'),
		spin: icon('lunarH3'),
		land: icon('lunarH3'),
		win: icon('lunarH3'),
		postWinStatic: icon('lunarH3'),
	},
	H4: {
		explosion,
		static: icon('lunarH4'),
		spin: icon('lunarH4'),
		land: icon('lunarH4'),
		win: icon('lunarH4'),
		postWinStatic: icon('lunarH4'),
	},
	H5: {
		explosion,
		static: icon('lunarH5'),
		spin: icon('lunarH5'),
		land: icon('lunarH5'),
		win: icon('lunarH5'),
		postWinStatic: icon('lunarH5'),
	},
	L1: {
		explosion,
		static: icon('lunarL1'),
		spin: icon('lunarL1'),
		land: icon('lunarL1'),
		win: icon('lunarL1'),
		postWinStatic: icon('lunarL1'),
	},
	L2: {
		explosion,
		static: icon('lunarL2'),
		spin: icon('lunarL2'),
		land: icon('lunarL2'),
		win: icon('lunarL2'),
		postWinStatic: icon('lunarL2'),
	},
	L3: {
		explosion,
		static: icon('lunarL3'),
		spin: icon('lunarL3'),
		land: icon('lunarL3'),
		win: icon('lunarL3'),
		postWinStatic: icon('lunarL3'),
	},
	L4: {
		explosion,
		static: icon('lunarL4'),
		spin: icon('lunarL4'),
		land: icon('lunarL4'),
		win: icon('lunarL4'),
		postWinStatic: icon('lunarL4'),
	},
	L5: {
		explosion,
		static: icon('lunarL5'),
		spin: icon('lunarL5'),
		land: icon('lunarL5'),
		win: icon('lunarL5'),
		postWinStatic: icon('lunarL5'),
	},
	W: {
		explosion,
		static: icon('lunarW'),
		spin: icon('lunarW'),
		land: icon('lunarW'),
		win: icon('lunarW'),
		postWinStatic: icon('lunarW'),
	},
	S: {
		explosion,
		static: icon('lunarS'),
		spin: icon('lunarS'),
		land: icon('lunarS'),
		win: icon('lunarS'),
		postWinStatic: icon('lunarS'),
	},
} as const;

export const SCATTER_LAND_SOUND_MAP = {
	1: 'sfx_scatter_stop_1',
	2: 'sfx_scatter_stop_2',
	3: 'sfx_scatter_stop_3',
	4: 'sfx_scatter_stop_4',
	5: 'sfx_scatter_stop_5',
} as const;
