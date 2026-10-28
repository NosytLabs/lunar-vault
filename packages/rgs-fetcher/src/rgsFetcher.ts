import type { paths } from './schema';
import { fetcher } from 'utils-fetcher';
import { rgsEndpoint } from './endpoint';

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
			endpoint: rgsEndpoint(options.rgsUrl, options.url),
		});

		if (!response.ok) {
			let error: unknown;
			try {
				error = await response.json();
			} catch {}
			throw error && typeof error === 'object'
				? error
				: new Error('The game service is unavailable. Reload to recover.');
		}
		const data = await response.json();
		if (data?.error) throw data;
		return data as TResponse;
	},
	get: async function get<
		T extends keyof paths,
		TResponse = paths[T]['get']['responses'][200]['content']['application/json'],
	>(options: { url: T; rgsUrl: string }): Promise<TResponse> {
		const response = await fetcher({
			method: 'GET',
			endpoint: rgsEndpoint(options.rgsUrl, options.url),
		});

		if (!response.ok) {
			let error: unknown;
			try {
				error = await response.json();
			} catch {}
			throw error && typeof error === 'object'
				? error
				: new Error('The game service is unavailable. Reload to recover.');
		}
		const data = await response.json();
		if (data?.error) throw data;
		return data as TResponse;
	},
};
