export const createInterruptible = () => {
	type ResolveArgs = { interrupted: boolean };
	type Resolve = (args: ResolveArgs) => void;

	let resolveList: Resolve[] = [];

	// The executor used to be `async`, which is a real bug: a rejection
	// inside an async executor is swallowed by the Promise constructor
	// instead of rejecting the promise, and the executor keeps running
	// after the wait has already been interrupted.
	//
	// The executor is now synchronous. It starts the wait immediately and
	// registers the resolver. The wait resolving settles the promise with
	// `{ interrupted: false }`; an interrupt settles it with
	// `{ interrupted: true }`. Whichever happens first wins, and the wait
	// keeps running after an interrupt, exactly as before.
	const add = (targetToWait: () => Promise<unknown>) => {
		const wait = targetToWait();

		return new Promise<ResolveArgs>((resolve) => {
			resolveList.push(resolve);
			wait.then(
				() => resolve({ interrupted: false }),
				// A rejected wait leaves the promise pending, which is what
				// the previous implementation did. The rejection is
				// swallowed here on purpose: an async promise executor
				// turns it into an unhandled rejection, and leaving it
				// unhandled would crash the process on Node's default
				// unhandled-rejection policy.
				() => {},
			);
		});
	};

	const clear = () => (resolveList = []);
	const getLength = () => resolveList.length;
	const interrupt = () => resolveList.forEach((resolve) => resolve({ interrupted: true }));

	return {
		add,
		clear,
		getLength,
		interrupt,
	};
};
