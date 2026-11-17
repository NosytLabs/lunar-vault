export type BaseBookEvent = { index: number; type: string };
type BookEventUnionTypeToBookEventHandlerUnionType<
	TBookEvent,
	THandlerContext extends object,
> = TBookEvent extends any
	? (bookEvent: TBookEvent, context: THandlerContext) => Promise<void>
	: never;
export type BookEventHandler<
	TBookEvent extends BaseBookEvent,
	THandlerContext extends object,
> = BookEventUnionTypeToBookEventHandlerUnionType<TBookEvent, THandlerContext>;
/**
 * The handler map is exhaustive by construction: it is keyed by every member
 * of the book-event union (`TBookEvent['type']`), not by an open string index.
 * A book event type without a handler is therefore a compile-time error in
 * the game app instead of a silently dropped event at runtime — the failure
 * mode that previously shipped twice (re-triggered free spins never announced,
 * resume multiplier never shown).
 */
export type BookEventHandlerMap<
	TBookEvent extends BaseBookEvent,
	THandlerContext extends object,
> = Record<TBookEvent['type'], BookEventHandler<TBookEvent, THandlerContext>>;
export type GetBookEventFromMap<T extends BookEventHandlerMap<any, any>> =
	T extends BookEventHandlerMap<infer U, any> ? U : never;
export type GetBookEventContextFromMap<T extends BookEventHandlerMap<any, any>> =
	T extends BookEventHandlerMap<any, infer U> ? U : never;
