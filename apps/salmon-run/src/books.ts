// Authored presentation examples, deliberately not random or an Engine math distribution.
export const symbols = ['salmon', 'reel', 'fly', 'compass', 'canoe', 'leaf'] as const;
export type SymbolName = (typeof symbols)[number];
export const labels: Record<SymbolName, string> = {
	salmon: 'Silver salmon',
	reel: 'Brass reel',
	fly: 'Copper fly',
	compass: 'River compass',
	canoe: 'Cedar canoe',
	leaf: 'Autumn leaf',
};
const board = (names: string): SymbolName[] => names.split(' ') as SymbolName[];
export const opening = board(
	'salmon reel fly compass canoe leaf salmon compass reel fly canoe leaf reel salmon compass',
);
export const baseBooks = [
	{ board: opening, award: 0, positions: [], message: 'The current turns. Cast again.' },
	{
		board: board(
			'reel reel reel reel reel fly salmon leaf compass canoe canoe fly compass salmon leaf',
		),
		award: 12,
		positions: [0, 1, 2, 3, 4],
		message: 'BRASS REEL · FIVE IN A ROW',
	},
	{
		board: board(
			'fly compass salmon canoe leaf salmon salmon salmon salmon salmon reel fly compass leaf canoe',
		),
		award: 0,
		positions: [5, 6, 7, 8, 9],
		message: 'THE UPSTREAM RUN IS OPEN',
		feature: true,
	},
];
export const riverBooks = [
	{
		board: board(
			'reel fly canoe compass leaf salmon reel compass fly canoe leaf compass reel canoe fly',
		),
		award: 2,
		fish: 1,
		positions: [5],
		message: 'A silver flash in the shallows',
	},
	{
		board: board(
			'canoe compass leaf reel fly fly canoe reel leaf compass compass leaf fly canoe reel',
		),
		award: 0,
		fish: 0,
		positions: [],
		message: 'Quiet water. Follow the current.',
	},
	{
		board: board(
			'fly salmon reel leaf canoe compass reel salmon fly leaf canoe compass fly reel leaf',
		),
		award: 4,
		fish: 2,
		positions: [1, 7],
		message: 'Two salmon reach the river bend',
	},
	{
		board: board(
			'compass fly leaf reel canoe reel leaf canoe salmon compass fly canoe compass reel leaf',
		),
		award: 3,
		fish: 1,
		positions: [8],
		message: 'Through the rapids · one more silver',
	},
	{
		board: board(
			'fly reel leaf compass canoe leaf compass reel canoe fly canoe leaf compass reel fly',
		),
		award: 0,
		fish: 0,
		positions: [],
		message: 'Mist across the pool. One cast remains.',
	},
	{
		board: board(
			'canoe reel salmon fly compass leaf compass reel canoe fly salmon leaf canoe compass reel',
		),
		award: 6,
		fish: 2,
		positions: [2, 10],
		message: 'Headwaters reached · the run is complete',
	},
];
export const stages = ['SHALLOWS', 'RIVER BEND', 'HEADWATERS'];
