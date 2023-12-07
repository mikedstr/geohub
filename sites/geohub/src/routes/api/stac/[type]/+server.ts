import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { deleteSTAC, getSTAC, upsertSTAC } from '$lib/server/helpers';
import type { Stac } from '$lib/types';

export const GET: RequestHandler = async ({ params }) => {
	const id = params.type;

	const stac = await getSTAC(id);
	if (!stac) {
		throw error(404, { message: 'Not found' });
	}

	return new Response(JSON.stringify(stac));
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const session = await locals.getSession();
	if (!session) {
		throw error(403, { message: 'Permission error' });
	}

	const is_superuser = session?.user?.is_superuser ?? false;
	if (!is_superuser) {
		throw error(403, { message: 'Permission error' });
	}

	const id = params.type;
	const user_email = session?.user.email;

	const stac = await getSTAC(id);
	if (!stac) {
		throw error(404, { message: 'Not found' });
	}

	const body: Stac = (await request.json()) as unknown as Stac;
	const updatedStac = await upsertSTAC(body, user_email);

	return new Response(JSON.stringify(updatedStac));
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const session = await locals.getSession();
	if (!session) {
		throw error(403, { message: 'Permission error' });
	}

	const is_superuser = session?.user?.is_superuser ?? false;
	if (!is_superuser) {
		throw error(403, { message: 'Permission error' });
	}

	const id = params.type;

	await deleteSTAC(id);

	return new Response(undefined, {
		status: 200,
		statusText: `${id} was deleted successfully`
	});
};
