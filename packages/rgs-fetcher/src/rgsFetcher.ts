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

		const data = await response.json();

		// A failed response has to be an error, not a value. The caller
		// checks for an `error` field in the payload, and a failed wallet
		// call must never be treated as a successful round.
		if (response.status !== 200) {
			console.error('error', response);
			throw Object.assign(new Error(`RGS request failed with status ${response.status}`), {
				status: response.status,
				data,
			});
		}

		return data as TResponse;
	},
	/**
	 * GET a path that is not one of the schema's fixed endpoint keys.
	 *
	 * The replay endpoint is built at runtime from the game, version, mode
	 * and event, so it cannot be a key of `paths`. The path type is widened
	 * to a string for that case.
	 */
	getPath: async function getPath<TResponse = unknown>(options: {
		url: string;
		rgsUrl: string;
	}): Promise<TResponse> {
		const response = await fetcher({
			method: 'GET',
			endpoint: buildEndpoint(options.rgsUrl, options.url),
		});

		const data = await response.json();

		// A failed response has to be an error, not a value.
		//
		// The replay endpoint returns the error payload with a non-200
		// status. Returning it as a normal value meant the caller treated
		// it as a successful replay, so a failed replay left the player on
		// the loading screen with no explanation (Engine guideline [171]).
		if (response.status !== 200) {
			console.error('error', response);
			throw Object.assign(new Error(`RGS request failed with status ${response.status}`), {
				status: response.status,
				data,
			});
		}

		return data as TResponse;
	},

	/**
	 * GET one of the schema's fixed endpoint keys, with its response type
	 * inferred.
	 */
	get: async function get<
		T extends keyof paths,
		TResponse = paths[T]['get']['responses'][200]['content']['application/json'],
	>(options: { url: T; rgsUrl: string }): Promise<TResponse> {
		return rgsFetcher.getPath<TResponse>(options);
	},
};
