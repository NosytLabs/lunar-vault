import type { paths } from './schema';
import { fetcher } from 'utils-fetcher';

/**
 * Build the RGS endpoint.
 *
 * The RGS URL arrives as a URL parameter from the operator. Production RGS
 * hosts are HTTPS, so the scheme used to be hardcoded to `https://`. That
 * breaks two cases:
 *
 *   - a local or staging RGS served over plain HTTP (the scheme gets mangled
 *     into `https://http://...`, which fails to resolve), and
 *   - a caller that already supplies a full URL including the scheme.
 *
 * So: use the URL's own scheme when it has one, and default to HTTPS when it
 * does not.
 */
const buildEndpoint = (rgsUrl: string, path: string) => {
	const trimmed = rgsUrl.trim().replace(/\/+$/, '');
	if (!trimmed) return `https://${path}`;
	if (/^https?:\/\//i.test(trimmed)) return `${trimmed}${path}`;
	return `https://${trimmed}${path}`;
};

export const rgsFetcher = {
	post: async function post<
		T extends keyof paths,
		TResponse = paths[T]['post']['responses'][200]['content']['application/json'],
	>(options: {
		url: T;
		rgsUrl: string;
		variables?: paths[T]['post']['requestBody']['content']['application/json'];
	}): Promise<TResponse> {
		const response = await fetcher({
			method: 'POST',
			variables: options.variables,
			endpoint: buildEndpoint(options.rgsUrl, options.url),
		});

		if (response.status !== 200) console.error('error', response);
		const data = await response.json();
		return data as TResponse;
	},
	get: async function get<
		T extends keyof paths,
		TResponse = paths[T]['get']['responses'][200]['content']['application/json'],
	>(options: { url: T; rgsUrl: string }): Promise<TResponse> {
		const response = await fetcher({
			method: 'GET',
			endpoint: buildEndpoint(options.rgsUrl, options.url),
		});

		if (response.status !== 200) console.error('error', response);
		const data = await response.json();
		return data as TResponse;
	},
};
