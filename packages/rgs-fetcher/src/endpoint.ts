export function rgsEndpoint(host: string, path: string) {
	if (!host.trim()) throw new Error('Missing RGS address. Launch from a valid session.');
	const base = new URL(/^https?:\/\//i.test(host) ? host : `https://${host}`);
	const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
	if (
		(base.protocol !== 'https:' && !(local && base.protocol === 'http:')) ||
		base.username ||
		base.password ||
		base.search ||
		base.hash
	)
		throw new Error('Invalid RGS address.');
	return `${base.origin}${base.pathname.replace(/\/$/, '')}${path}`;
}
