let loading: Promise<void> | undefined;
export function loadGameFonts() {
	return (loading ??= (async () => {
		const faces = [
			['Lunar Display', 'Cinzel-Variable.ttf', '700'],
			['Lunar Sans', 'BarlowCondensed-SemiBold.ttf', '600'],
			['Lunar Sans', 'BarlowCondensed-Bold.ttf', '700'],
		];
		await Promise.all(
			faces.map(async ([family, file, weight]) => {
				const url = new URL(`./assets/type/${file}`, document.baseURI).href;
				const face = new FontFace(family, `url("${url}")`, { weight });
				document.fonts.add(await face.load());
			}),
		);
		await document.fonts.ready;
	})().catch((error) => {
		loading = undefined;
		throw error;
	}));
}
