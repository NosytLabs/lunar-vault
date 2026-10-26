import { spawn, spawnSync } from 'node:child_process';
const candidates = [process.env.SALMON_PYTHON, 'python3.15', 'python3.14', 'python3'].filter(
	Boolean,
);
const python = candidates.find(
	(command) =>
		spawnSync(command, ['-c', 'from compression import zstd'], { stdio: 'ignore' }).status === 0,
);
if (!python) {
	console.error(
		'Python 3.14 or newer is required for the local Zstandard math preview. Set SALMON_PYTHON to its executable if needed.',
	);
	process.exit(1);
}
const child = spawn(python, process.argv.slice(2), { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 1));
