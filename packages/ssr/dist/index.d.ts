import { TRPCRouterRecord, AnyProcedure, AnyQueryProcedure, inferProcedureInput, inferProcedureOutput, AnyRouter, inferRouterContext } from '@trpc/server';
import { GetKey } from '@trpc-swr/client/shared';

/**
 * Describes the options for the `<endpoint>.fetch` method.
 */
type FetchOptions = {
    /**
     * If `true` the returned promise will be transformed by the `transformer` from the router.
     * Note: It will always be transformed during `.dehydrate()` calls
     * @default false
     */
    transform?: boolean;
};
type DecorateProcedure<TProcedure extends AnyProcedure, TPath extends string> = TProcedure extends AnyQueryProcedure ? {
    fetch: (input: inferProcedureInput<TProcedure>, opts?: FetchOptions) => Promise<inferProcedureOutput<TProcedure>>;
    getKey: GetKey<TProcedure, TPath>;
} : never;
/**
 * @internal
 */
type DecoratedProcedureRecord<TProcedures extends TRPCRouterRecord, TPath extends string = ""> = {
    [TKey in keyof TProcedures]: TProcedures[TKey] extends infer $Value ? $Value extends AnyProcedure ? DecorateProcedure<$Value, `${TPath}${TKey & string}`> : $Value extends TRPCRouterRecord ? DecoratedProcedureRecord<$Value, `${TPath}${TKey & string}.`> : never : never;
};
type ProxySSGHelpers<TRouter extends AnyRouter> = {
    dehydrate: () => Promise<Record<string, any>>;
} & DecoratedProcedureRecord<TRouter["_def"]["record"]>;
interface ProxySSGHelpersConfig<TRouter extends AnyRouter> {
    router: TRouter;
    ctx: inferRouterContext<TRouter>;
}
declare function createProxySSGHelpers<TRouter extends AnyRouter>({ router, ctx, }: ProxySSGHelpersConfig<TRouter>): ProxySSGHelpers<TRouter>;

type Key = any;
declare const unstable_serialize: (key: Key) => string;

export { createProxySSGHelpers, unstable_serialize };
export type { DecoratedProcedureRecord, ProxySSGHelpers, ProxySSGHelpersConfig };
