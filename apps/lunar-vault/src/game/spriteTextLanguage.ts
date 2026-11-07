/**
 * Language fallback for baked sprite text.
 *
 * Several sprites have their text baked into the image, so the sprite key is
 * built from the language code: pressToContinueText_en.png,
 * freespins_en.png, winsmall_en.png. Those atlases only carry a fixed set of
 * languages, so an unsupported code (or a regional variant such as "en-US")
 * resolves to a key that does not exist, the sprite logs a missing-key error
 * and renders empty.
 *
 * Engine guideline [240]: an invalid language must not break the display.
 * The text layer already falls back to English, so the sprite layer has to do
 * the same.
 */

/** The languages the baked-text sprites are authored for. */
export const SPRITE_TEXT_LANGUAGES = [
	'ar',
	'de',
	'en',
	'es',
	'fi',
	'fr',
	'hi',
	'id',
	'ja',
	'ko',
	'pl',
	'pt',
	'ru',
	'tr',
	'vi',
	'zh',
] as const;

export type SpriteTextLanguage = (typeof SPRITE_TEXT_LANGUAGES)[number];

/**
 * Resolve a language code to one the baked-text sprites actually have.
 *
 * Falls back to English for an unknown code and for a regional variant such
 * as "en-US" or "pt-BR".
 */
export const spriteTextLanguage = (lang: string): SpriteTextLanguage => {
	const code = (lang || '').toLowerCase().split('-')[0];
	return (SPRITE_TEXT_LANGUAGES as readonly string[]).includes(code)
		? (code as SpriteTextLanguage)
		: 'en';
};
