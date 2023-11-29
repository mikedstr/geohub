import type { PageServerLoad } from './$types';
import type { StacCollection } from '$lib/types';
import { StacApis } from '$lib/config/AppConfig';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const id = params.id;
	const stacs = StacApis.filter((s) => s.type === 'api');
	const stac = stacs.find((x) => x.id === id);
	if (!stac) {
		throw error(
			404,
			`Invalid stac type. Currently ${stacs.map((x) => x.id).join(', ')} is supported.`
		);
	}
	const apiUrl = `${stac.url}/collections`;
	const collection = params.collection;

	const url = `${apiUrl}/${collection}`;
	const res = await fetch(url);
	if (!res.ok) {
		if (res.status === 404) {
			throw error(res.status, `No collection found.`);
		} else {
			throw error(res.status, res.statusText);
		}
	}

	const json: StacCollection = await res.json();

	return {
		stac: stac,
		collection: json
	};
};