/**
 * Behavioural test for `createInterruptible`.
 *
 * The implementation was changed to remove an `async` promise executor. An
 * async executor swallows rejections and keeps running after the promise
 * has settled, so the rewrite had to preserve the exact observable
 * behaviour:
 *
 *   - the wait function is called immediately
 *   - a wait that finishes first resolves with `{ interrupted: false }`
 *   - an interrupt that fires first resolves with `{ interrupted: true }`
 *   - the wait keeps running after an interrupt
 *   - only the first settle wins
 *
 * The old implementation is included here as the reference, so the test
 * proves equivalence rather than asserting the new behaviour in isolation.
 */

// --- the implementation under test -----------------------------------------
import { createInterruptible } from '../packages/utils-shared/interruptible.ts';

// The repository does not depend on `@types/node`, and this script is not
// part of a TypeScript project, so the two Node globals it touches are
// declared here rather than pulling in the type package.
declare const process: {
	on(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
	exit(code: number): never;
};

// --- the previous implementation, as the reference --------------------------
// The reference is kept verbatim, including the `async` promise executor and
// the `any` it needs, so the comparison is against the real previous
// behaviour rather than a tidied-up version of it. The lint rules that
// object to it are switched off for this block only.
/* eslint-disable @typescript-eslint/no-explicit-any, no-async-promise-executor */
const createInterruptibleReference = () => {
	type ResolveArgs = { interrupted: boolean };
	type Resolve = (args: ResolveArgs) => void;

	let resolveList: Resolve[] = [];

	const add = (targetToWait: () => Promise<any>) =>
		new Promise<ResolveArgs>(async (resolve) => {
			resolveList.push(resolve);
			await targetToWait();
			resolve({ interrupted: false });
		});

	const clear = () => (resolveList = []);
	const getLength = () => resolveList.length;
	const interrupt = () => resolveList.forEach((resolve) => resolve({ interrupted: true }));

	return { add, clear, getLength, interrupt };
};
/* eslint-enable @typescript-eslint/no-explicit-any, no-async-promise-executor */

// --- the test --------------------------------------------------------------
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let failures = 0;
let checks = 0;

const check = (label: string, actual: unknown, expected: unknown) => {
	checks++;
	const a = JSON.stringify(actual);
	const e = JSON.stringify(expected);
	if (a === e) {
		console.log(`  PASS  ${label}`);
	} else {
		failures++;
		console.log(`  FAIL  ${label}\n          expected ${e}\n          actual   ${a}`);
	}
};

type Factory = () => ReturnType<typeof createInterruptible>;

const scenarios: Array<{ name: string; run: (f: Factory) => Promise<unknown> }> = [
	{
		name: 'a wait that finishes first resolves with interrupted: false',
		run: async (f) => {
			const i = f();
			const result = await i.add(() => sleep(20));
			return result;
		},
	},
	{
		name: 'an interrupt that fires first resolves with interrupted: true',
		run: async (f) => {
			const i = f();
			const pending = i.add(() => sleep(200));
			setTimeout(() => i.interrupt(), 10);
			return pending;
		},
	},
	{
		name: 'the wait function is called immediately',
		run: async (f) => {
			const i = f();
			let called = false;
			const pending = i.add(() => {
				called = true;
				return sleep(50);
			});
			const immediate = called;
			await pending;
			return immediate;
		},
	},
	{
		name: 'the wait keeps running after an interrupt',
		run: async (f) => {
			const i = f();
			let finished = false;
			const pending = i.add(() =>
				sleep(60).then(() => {
					finished = true;
				}),
			);
			setTimeout(() => i.interrupt(), 10);
			await pending;
			await sleep(100);
			return finished;
		},
	},
	{
		name: 'only the first settle wins',
		run: async (f) => {
			const i = f();
			const pending = i.add(() => sleep(80));
			setTimeout(() => i.interrupt(), 10);
			const result = await pending;
			return result;
		},
	},
	{
		name: 'getLength counts pending waits',
		run: async (f) => {
			const i = f();
			const pending = i.add(() => sleep(30));
			const count = i.getLength();
			await pending;
			return count;
		},
	},
];

console.log('interruptible behaviour');
console.log('');

for (const scenario of scenarios) {
	const expected = await scenario.run(createInterruptibleReference);
	const actual = await scenario.run(createInterruptible);
	check(scenario.name, actual, expected);
}

// --- the rejection case ----------------------------------------------------
// A rejected wait is handled differently by the two implementations, and
// the difference matters:
//
//   - the previous implementation used an async promise executor, so the
//     rejection escaped as an unhandled rejection and crashed the process
//   - the current implementation swallows the rejection and leaves the
//     promise pending, which is the observable behaviour the old code
//     intended
//
// The old implementation is not exercised here because it would abort the
// whole run. The new implementation is checked directly: it must not throw,
// must not raise an unhandled rejection, and must still settle through an
// interrupt.
{
	const rejections: unknown[] = [];
	process.on('unhandledRejection', (reason: unknown) => {
		rejections.push(reason);
	});

	const i = createInterruptible();
	const pending = i.add(() => Promise.reject(new Error('boom')));
	setTimeout(() => i.interrupt(), 20);

	const result = await pending;
	check('a rejected wait settles through an interrupt', result, { interrupted: true });

	// Give the event loop a turn so any unhandled rejection would surface.
	await sleep(50);
	check('a rejected wait raises no unhandled rejection', rejections.length, 0);
}

console.log('');
if (failures === 0) {
	console.log(`All ${checks} interruptible checks passed.`);
} else {
	console.log(`${failures} of ${checks} interruptible checks FAILED.`);
	process.exit(1);
}
