/**
 * Flat config equivalent of the legacy `index.js` rules.
 *
 * The repository's lint was broken repo-wide: ESLint 9 requires
 * `eslint.config.js` and does not read `.eslintrc.cjs`, and the legacy
 * config referenced the `svelte3` plugin, which was renamed to `svelte` in
 * eslint-plugin-svelte v3. Every package's `lint` script failed with
 *
 *     ESLint couldn't find an eslint.config.(js|mjs|cjs) file.
 *
 * This module keeps the same rule set the legacy config expressed:
 *
 *   - eslint:recommended
 *   - plugin:@typescript-eslint/recommended
 *   - turbo
 *   - prettier
 *   - the svelte plugin, applied to .svelte files
 *
 * It is written against flat config so it works with the ESLint 9 already
 * pinned in the workspace. `eslint-config-prettier/flat` and
 * `eslint-config-turbo/flat` are the flat-config entry points of the same
 * rule sets the legacy config extended.
 */
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sveltePlugin from 'eslint-plugin-svelte';
import prettierConfig from 'eslint-config-prettier/flat';
import turboConfig from 'eslint-config-turbo/flat';

/**
 * `tsPlugin.configs['flat/recommended']` is an array of config objects, not
 * a single object, so it has to be merged entry by entry. The TypeScript
 * recommended set turns the base `no-unused-vars` off and turns on
 * `@typescript-eslint/no-unused-vars`, which understands TypeScript syntax.
 */
const tsRecommended = tsPlugin.configs['flat/recommended'];

export default [
	{
		name: 'custom:base',
		files: ['**/*.ts', '**/*.js', '**/*.svelte'],
		ignores: ['**/node_modules/**', '**/build/**', '**/.svelte-kit/**', '**/dist/**'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2020,
			sourceType: 'module',
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			...js.configs.recommended.rules,
			// eslint:recommended turns these on, but TypeScript already
			// reports undefined and unused symbols, and it understands
			// type-only imports and declaration merging in a way the base
			// rules do not. The TypeScript-aware version of the unused-vars
			// rule replaces the base one.
			//
			// There is no `@typescript-eslint/no-undef`: the plugin has no
			// such rule. TypeScript's own checker reports undefined
			// symbols, so the base rule is simply turned off here.
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					// An unused parameter prefixed with an underscore is a
					// deliberate placeholder - for example a handler that must
					// match a shared signature but has nothing to do with the
					// event.
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			// The SDK's generic helpers deliberately use `any` in generic
			// positions - `Reel<any, any>`, `BookEventHandlerMap<any, any>`
			// and callback return types - because the concrete types are
			// supplied by the caller. Replacing those with `unknown` would
			// break the generics. The rule still catches `any` in ordinary
			// value positions, where it is a real smell.
			'@typescript-eslint/no-explicit-any': [
				'error',
				{
					fixToUnknown: true,
				},
			],
			...turboConfig.rules,
			...prettierConfig.rules,
		},
	},

	// The TypeScript recommended set, applied as its own entries so its
	// parser, plugin and rule settings land in the right order.
	...tsRecommended,

	// The svelte plugin needs its own parser for .svelte files and runs as
	// a processor, so it gets its own entry rather than being merged into
	// the TypeScript one.
	...sveltePlugin.configs['flat/recommended'],

	{
		name: 'custom:svelte',
		files: ['**/*.svelte'],
		languageOptions: {
			parser: sveltePlugin.configs['flat/base'][1].languageOptions.parser,
			parserOptions: {
				parser: tsParser,
			},
		},
	},

	{
		// Svelte 5 rune files (`.svelte.ts`) use runes such as `$state`
		// and `$derived`, which the plain TypeScript parser cannot read.
		// They need the Svelte parser with the TypeScript parser nested
		// inside it.
		name: 'custom:svelte-runes',
		files: ['**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parser: sveltePlugin.configs['flat/base'][1].languageOptions.parser,
			parserOptions: {
				parser: tsParser,
			},
		},
	},

	{
		// The SDK's generic helpers use `any` in type-parameter positions:
		// `Reel<any, any>`, `BookEventHandlerMap<any, any>`,
		// `TBookEvent extends any`, `infer U, any`, and the variadic
		// `...args: any[]` tuple pattern.
		//
		// These are not type escapes - the concrete type is supplied by the
		// caller through the generic parameter, and `unknown` would break
		// the inference. The rule still applies everywhere else, where an
		// `any` in a value position is a real smell.
		name: 'custom:generic-helpers',
		files: [
			'packages/utils-bet/src/types.ts',
			'packages/utils-book/src/createPlayBookUtils.ts',
			'packages/utils-book/src/types.ts',
			'packages/utils-shared/types.ts',
			'packages/utils-slots/src/createEnhanceBoard.ts',
			'packages/utils-slots/src/createEnhanceBoardPreSpin.ts',
			'packages/utils-slots/src/createEnhanceBoardSpin.ts',
			'packages/utils-slots/src/types.ts',
		],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},

	{
		name: 'custom:ignores',
		ignores: ['**/*.cjs', '**/*.mjs'],
	},
];
