/**
 * Root flat ESLint config.
 *
 * ESLint 9 does not read `.eslintrc.cjs`, so every package's `lint` script
 * failed with "ESLint couldn't find an eslint.config.(js|mjs|cjs) file" and
 * the repo had no working lint at all. The rules themselves live in
 * `packages/eslint-config-custom/flat.js`; this file wires them in.
 *
 * The per-package `.eslintrc.cjs` files are left in place. They are ignored
 * by ESLint 9 but other tooling may still read them, and removing them is
 * not needed to fix the lint.
 */
import custom from 'eslint-config-custom/flat';

export default [
	{
		name: 'custom/ignore-build-output',
		ignores: [
			'**/node_modules/**',
			'**/build/**',
			'**/.svelte-kit/**',
			'**/dist/**',
			'**/.turbo/**',
			'**/coverage/**',
		],
	},
	...custom,
];
