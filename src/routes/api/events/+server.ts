import { error, type RequestHandler } from '@sveltejs/kit';
import { subscribe } from '$lib/server/events';

/** Flux SSE : le client reçoit « changed » dès qu'un membre du foyer modifie quelque chose. */
export const GET: RequestHandler = ({ locals, request }) => {
	if (!locals.user || !locals.household) error(401);
	const householdId = locals.household.id;
	const encoder = new TextEncoder();

	let unsubscribe = () => {};
	let ping: ReturnType<typeof setInterval>;

	const stream = new ReadableStream({
		start(controller) {
			const send = (data: unknown) => {
				try {
					controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
				} catch {
					/* flux fermé */
				}
			};
			send({ type: 'hello' });
			unsubscribe = subscribe(householdId, send);
			ping = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': ping\n\n'));
				} catch {
					/* flux fermé */
				}
			}, 25_000);
			request.signal.addEventListener('abort', () => {
				unsubscribe();
				clearInterval(ping);
				try {
					controller.close();
				} catch {
					/* déjà fermé */
				}
			});
		},
		cancel() {
			unsubscribe();
			clearInterval(ping);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
