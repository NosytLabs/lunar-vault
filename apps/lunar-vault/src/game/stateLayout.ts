import { createLayout } from 'utils-layout';

export const { stateLayout, stateLayoutDerived } = createLayout({
	backgroundRatio: {
		normal: 16 / 9,
		portrait: 1242 / 2208,
	},
	mainSizesMap: {
		desktop: { width: 1000, height: 650 },
		tablet: { width: 1000, height: 1000 },
		landscape: { width: 1000, height: 650 },
		portrait: { width: 800, height: 1422 },
	},
});
