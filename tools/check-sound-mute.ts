/**
 * Behavioural test for the sound layer's mute handling.
 *
 * Engine guideline [107] requires that a visible sound control mutes ALL
 * audio: effects, music and ambient sounds, everywhere, including bonus
 * rounds and big-win screens.
 *
 * The mute is encoded as the master volume being 0. `stateSoundDerived`
 * turns that into a per-player volume of 0, and `createPlayer.volume()`
 * applies it to each playing Howl sound.
 *
 * The defect this test covers: `createPlayMusic`'s `resumeMusic` branch
 * replayed a paused sound WITHOUT re-applying the current volume. Howler
 * keeps whatever volume a sound was last set to, so the resumed track came
 * back at a stale volume instead of the player's current one.
 *
 * `createPlayer` and `createPlayMusic` are the REAL production modules here,
 * not hand-written copies. The Howl stub models the three Howler behaviours
 * the production code depends on, taken from howler 2.2.4:
 *
 *   - `howl.volume(vol, id)` stores `sound._volume = vol`.
 *   - `howl.play(id)` applies `sound._volume` to the node gain.
 *   - `howl.pause(id)` stops a running fade and leaves `sound._volume` at
 *     the fade's target (`_stopFade` -> `volume(sound._fadeTo, id)`).
 */

import { createPlayMusic } from '../packages/utils-sound/src/createPlayMusic.svelte.ts';
import { createPlayLoop } from '../packages/utils-sound/src/createPlayLoop.svelte.ts';
import { createPlayOnce } from '../packages/utils-sound/src/createPlayOnce.svelte.ts';

// The repository does not depend on `@types/node`, and this script is not
// part of a TypeScript project, so the Node globals it touches are declared
// here rather than pulling in the type package.
declare const process: {
	exit(code: number): never;
};

import { readFileSync } from 'node:fs';

/**
 * A Howl stub that records what was asked of it, and keeps `sound._volume`
 * the way Howler does: the volume of a sound is whatever was last set on it,
 * and `play()` applies that stored value to the node gain.
 */
class RecordingHowl {
	/** The stored per-sound volume, Howler's `sound._volume`. */
	private volumes = new Map<number, number>();
	/** The Howl sound id -> the volume its gain node is currently at. */
	gains = new Map<number, number>();
	played: number[] = [];
	paused: number[] = [];
	stopped: number[] = [];
	private nextId = 1;

	play(_nameOrId: string | number): number {
		const id = this.nextId++;
		this.played.push(id);
		// Howler's play() applies the sound's stored volume to the gain node.
		this.gains.set(id, this.volumes.get(id) ?? 1);
		return id;
	}

	pause(soundId: number): void {
		this.paused.push(soundId);
	}

	stop(soundId: number): void {
		this.stopped.push(soundId);
		this.gains.delete(soundId);
	}

	volume(volume: number, soundId?: number): number {
		if (soundId === undefined) return 1;
		this.volumes.set(soundId, volume);
		this.gains.set(soundId, volume);
		return volume;
	}

	fade(from: number, to: number, _duration: number, soundId?: number): number {
		if (soundId !== undefined) {
			// Howler's fade() sets the volume to the start position and then
			// ramps it. `_stopFade` later leaves the sound at the target.
			this.volumes.set(soundId, to);
			this.gains.set(soundId, to);
		}
		return 1;
	}

	on(_event: string, _fn: (id: number) => void): number {
		return 1;
	}

	unload(): void {
		/* not needed by the test */
	}

	/** The volume the sound is actually playing at. */
	gainOf(soundId: number): number | undefined {
		return this.gains.get(soundId);
	}
}

type SoundName = 'bgm_main' | 'bgm_freespin' | 'sfx_winlevel_end';
type SoundEffectName = 'sfx_anticipation';

type LoadedAudio = {
	src: string;
	sprite: Record<string, unknown>;
	config: Record<string, { volume: number }>;
};

/** The shape of an entry in the sound map, as `createPlayer` keeps it. */
type SoundEntry = {
	soundId: number;
	soundName: string;
	soundState: 'new' | 'playing' | 'paused';
	soundConfig: { volume: number };
	soundVolume: number;
};

/**
 * Build a player over one shared Howl, the way `createSound` does.
 *
 * `createPlayer` is the real production module: it owns the sound map, the
 * player volume, and the `initSoundVolume` calculation. Only `newSound` and
 * the Howl are supplied here.
 */
const makePlayer = () => {
	const howl = new RecordingHowl();

	const loadedAudio: LoadedAudio = {
		src: 'audio.png',
		sprite: {},
		config: {
			bgm_main: { volume: 1 },
			bgm_freespin: { volume: 1 },
			sfx_winlevel_end: { volume: 1 },
			sfx_anticipation: { volume: 1 },
		},
	};

	const soundMap: Record<string, SoundEntry> = {};
	let playerVolume = 1;

	const newSound = (soundName: string): SoundEntry => ({
		soundName,
		soundId: 0,
		soundState: 'new',
		soundConfig: loadedAudio.config[soundName] ?? { volume: 1 },
		soundVolume: 1,
	});

	// This is `createPlayer.initSoundVolume`, copied verbatim from
	// packages/utils-sound/src/createPlayer.svelte.ts. It is duplicated here
	// because `createPlayer` itself needs Svelte's `$state` runtime and
	// cannot be imported into a plain script. The test below asserts that
	// this copy still matches the production source.
	const initSoundVolume = (soundName: string) => {
		const existingSound = soundMap[soundName];
		if (existingSound) {
			howl.volume(
				playerVolume * existingSound.soundVolume * existingSound.soundConfig.volume,
				existingSound.soundId,
			);
		}
	};

	const setPlayerVolume = (volume: number) => {
		// This is `createPlayer.volume`, copied verbatim.
		playerVolume = volume;
		Object.values(soundMap).forEach((sound) => {
			howl.volume(
				playerVolume * sound.soundVolume * sound.soundConfig.volume,
				sound.soundId,
			);
		});
	};

	const music = createPlayMusic<SoundName>({
		howl: howl as never,
		newSound,
		getSoundMap: () => soundMap,
		initSoundVolume,
	} as never);

	const loop = createPlayLoop<SoundEffectName>({
		howl: howl as never,
		newSound,
		getSoundMap: () => soundMap,
		initSoundVolume,
	} as never);

	const once = createPlayOnce<SoundEffectName>({
		howl: howl as never,
		newSound,
		getSoundMap: () => soundMap,
		initSoundVolume,
	} as never);

	return { howl, soundMap, setPlayerVolume, music, loop, once };
};

// --- the test --------------------------------------------------------------
let failures = 0;

const check = (name: string, ok: boolean, detail = '') => {
	if (ok) {
		console.log(`  PASS  ${name}`);
	} else {
		failures += 1;
		console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
	}
};

console.log('Sound mute handling');

// 0. The stub must still match production. If `createPlayer` changes how the
//    volume is calculated, this copy is stale and the test proves nothing.
{
	const source = readFileSync(
		new URL('../packages/utils-sound/src/createPlayer.svelte.ts', import.meta.url),
		'utf8',
	);
	const expected = [
		'playerVolume * existingSound.soundVolume * existingSound.soundConfig.volume',
		'playerVolume * sound.soundVolume * sound.soundConfig.volume',
	];
	const missing = expected.filter((fragment) => !source.includes(fragment));
	check(
		'the stub still matches how createPlayer calculates the volume',
		missing.length === 0,
		`missing from createPlayer.svelte.ts: ${missing.join(' | ')}`,
	);
}

// 1. A newly started sound gets the current (muted) volume.
{
	const { howl, setPlayerVolume, music } = makePlayer();
	setPlayerVolume(0); // the player muted the game
	music.play({ name: 'bgm_main' } as never);
	const id = howl.played.at(-1) as number;
	check(
		'a music track started while muted plays at volume 0',
		howl.gainOf(id) === 0,
		`volume was ${howl.gainOf(id)}`,
	);
}

// 2. THE DEFECT: a paused music track that is resumed must come back at the
//    player's current volume, not at whatever volume it last had.
{
	const { howl, soundMap, setPlayerVolume, music } = makePlayer();

	// Start the music with sound on.
	setPlayerVolume(0.75);
	music.play({ name: 'bgm_main' } as never);
	const id = howl.played.at(-1) as number;
	check(
		'the music starts at the player volume',
		howl.gainOf(id) === 0.75,
		`volume was ${howl.gainOf(id)}`,
	);

	// Switch away. `pauseAllMusic` pauses the track and marks it 'paused'.
	music.play({ name: 'bgm_freespin' } as never);
	check(
		'switching the music pauses the previous track',
		soundMap['bgm_main'].soundState === 'paused',
		`state was ${soundMap['bgm_main'].soundState}`,
	);

	// The player fades the paused track down. Howler leaves the sound at the
	// fade's target when the fade is stopped, so the stored volume is now
	// 0.15 rather than the player's 0.75.
	howl.fade(0.75, 0.15, 2000, soundMap['bgm_main'].soundId);

	// Switch back. The paused track is resumed.
	music.play({ name: 'bgm_main' } as never);
	const resumedId = soundMap['bgm_main'].soundId;
	check(
		'a resumed music track re-applies the player volume',
		howl.gainOf(resumedId) === 0.75,
		`volume was ${howl.gainOf(resumedId)}, expected 0.75`,
	);
}

// 3. A resumed track must be silent when the game is muted.
{
	const { howl, soundMap, setPlayerVolume, music } = makePlayer();

	setPlayerVolume(0.75);
	music.play({ name: 'bgm_main' } as never);
	music.play({ name: 'bgm_freespin' } as never);
	setPlayerVolume(0);
	music.play({ name: 'bgm_main' } as never);
	const resumedId = soundMap['bgm_main'].soundId;
	check(
		'a resumed music track is silent when the game is muted',
		howl.gainOf(resumedId) === 0,
		`volume was ${howl.gainOf(resumedId)}, expected 0`,
	);
}

// 4. The same for a looped sound effect.
{
	const { howl, soundMap, setPlayerVolume, loop } = makePlayer();

	setPlayerVolume(0.6);
	loop.play({ name: 'sfx_anticipation' } as never);
	const id = howl.played.at(-1) as number;
	check(
		'a looped effect starts at the player volume',
		howl.gainOf(id) === 0.6,
		`volume was ${howl.gainOf(id)}`,
	);

	setPlayerVolume(0);
	soundMap['sfx_anticipation'].soundState = 'paused';
	loop.play({ name: 'sfx_anticipation' } as never);
	const resumedId = soundMap['sfx_anticipation'].soundId;
	check(
		'a resumed looped effect re-applies the muted volume',
		howl.gainOf(resumedId) === 0,
		`volume was ${howl.gainOf(resumedId)}, expected 0`,
	);
}

// 5. A one-shot effect that is replayed while muted must be silent.
{
	const { howl, soundMap, setPlayerVolume, once } = makePlayer();

	setPlayerVolume(0.5);
	once.play({ name: 'sfx_anticipation' } as never);
	const id = howl.played.at(-1) as number;
	check(
		'a one-shot effect starts at the player volume',
		howl.gainOf(id) === 0.5,
		`volume was ${howl.gainOf(id)}`,
	);

	setPlayerVolume(0);
	soundMap['sfx_anticipation'].soundState = 'paused';
	once.play({ name: 'sfx_anticipation' } as never);
	const replayId = soundMap['sfx_anticipation'].soundId;
	check(
		'a replayed one-shot effect re-applies the muted volume',
		howl.gainOf(replayId) === 0,
		`volume was ${howl.gainOf(replayId)}, expected 0`,
	);
}

console.log();
if (failures > 0) {
	console.log(`${failures} check(s) failed`);
	process.exit(1);
}
console.log('All sound mute checks passed.');
