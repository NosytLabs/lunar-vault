import { sequence } from 'utils-shared/sequence';

import type { BookEventHandlerMap, GetBookEventFromMap, GetBookEventContextFromMap } from './types';

export function createPlayBookUtils<TBookEventHandlerMap extends BookEventHandlerMap<any, any>>({
	bookEventHandlerMap,
	debug,
}: {
	bookEventHandlerMap: TBookEventHandlerMap;
	debug?: boolean;
}) {
	type TBookEvent = GetBookEventFromMap<TBookEventHandlerMap>;
	type BookEventContextFromMap = GetBookEventContextFromMap<TBookEventHandlerMap>;
	type BookEventContextFromMapWithoutBookEvents = Omit<BookEventContextFromMap, 'bookEvents'>;
	type BookEventContextOfBookEvents = { bookEvents: TBookEvent[] };
	type TBookEventContext = BookEventContextFromMapWithoutBookEvents & BookEventContextOfBookEvents;

	const playBookEvent = async (bookEvent: TBookEvent, bookEventContext: TBookEventContext) => {
		const bookEventHandler = bookEventHandlerMap?.[bookEvent.type];
		if (!bookEventHandler) {
			// Book events arrive as untyped data from the RGS, so the
			// compile-time exhaustive handler map cannot rule out an unknown
			// event type at runtime. Fail loudly instead of silently dropping
			// the event and continuing the round in the wrong phase.
			throw new Error(
				`Missing bookEventHandler in "bookEventHandlerMap" for book event type: "${bookEvent.type}"`,
			);
		}
		if (debug) console.log(bookEvent);
		await bookEventHandler(bookEvent, bookEventContext);
	};

	const playBookEvents = async (
		bookEvents: TBookEvent[],
		bookEventContext?: BookEventContextFromMapWithoutBookEvents,
	) => {
		const finalBookEventContext =
			bookEventContext || ({} as BookEventContextFromMapWithoutBookEvents);

		await sequence(bookEvents, async (bookEvent) => {
			await playBookEvent(bookEvent, { ...finalBookEventContext, bookEvents });
		});
	};

	return {
		playBookEvent,
		playBookEvents,
	};
}
