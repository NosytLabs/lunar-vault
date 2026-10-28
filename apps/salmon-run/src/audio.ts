// Original synthesized cues. Every node is routed through the same master gain.
export class RiverAudio {
	private context?: AudioContext;
	private master?: GainNode;
	private active = new Set<() => void>();
	private disposed = false;
	muted = false;
	async unlock() {
		if (this.disposed) return;
		if (!this.context) {
			this.context = new AudioContext();
			this.master = this.context.createGain();
			this.master.connect(this.context.destination);
			this.setMuted(this.muted);
		}
		if (this.context.state === 'suspended') await this.context.resume();
	}
	setMuted(value: boolean) {
		this.muted = value;
		if (this.master) this.master.gain.value = value ? 0 : 0.055;
	}
	note(frequency: number, duration = 0.1, delay = 0) {
		const ctx = this.context;
		if (this.disposed || !ctx || ctx.state !== 'running' || !this.master) return;
		const tone = ctx.createOscillator(),
			gain = ctx.createGain();
		tone.type = 'sine';
		tone.frequency.value = frequency;
		const start = ctx.currentTime + delay;
		tone.connect(gain);
		gain.connect(this.master);
		gain.gain.setValueAtTime(0, start);
		gain.gain.linearRampToValueAtTime(0.8, start + 0.008);
		gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
		const release = () => {
			this.active.delete(cancel);
			tone.disconnect();
			gain.disconnect();
		};
		const cancel = () => {
			tone.onended = null;
			tone.stop();
			release();
		};
		this.active.add(cancel);
		tone.onended = release;
		tone.start(start);
		tone.stop(start + duration + 0.02);
	}
	stop(reel: number) {
		this.note(180 + reel * 32, 0.07);
	}
	award() {
		[330, 440, 550].forEach((n, i) => this.note(n, 0.2, i * 0.08));
	}
	collect() {
		[392, 494, 587, 784].forEach((n, i) => this.note(n, 0.23, i * 0.09));
	}
	cancel() {
		for (const cancel of this.active) cancel();
		this.active.clear();
	}
	dispose() {
		this.disposed = true;
		this.cancel();
		this.master?.disconnect();
		if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
		this.context = undefined;
		this.master = undefined;
	}
}
