/**
 * Legacy eslintrc config, kept for tooling that still reads `.eslintrc.cjs`.
 *
 * It is no longer used by ESLint itself: ESLint 9 requires flat config, and
 * this config referenced the `svelte3` plugin, which was renamed to `svelte`
 * in eslint-plugin-svelte v3. The working configuration is `flat.js`.
 */
export default {
	parser: '@typescript-eslint/parser',
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'turbo', 'prettier'],
	plugins: ['svelte', '@typescript-eslint'],
	ignorePatterns: ['*.cjs'],
	overrides: [{ files: ['*.svelte'], processor: 'svelte/svelte' }],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
	},
	env: {
		browser: true,
		es2017: true,
		node: true,
	},
};
