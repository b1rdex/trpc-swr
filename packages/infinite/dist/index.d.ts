import { TRPCClientErrorLike } from '@trpc/client';
import { AnyRouter, TRPCRouterRecord, AnyProcedure, AnyQueryProcedure, inferProcedureOutput, inferProcedureInput } from '@trpc/server';
import { SWRInfiniteConfiguration, SWRInfiniteResponse } from 'swr/infinite';
import { GetKey } from '@trpc-swr/client/shared';
import { CreateTRPCSWRProxy } from '@trpc-swr/client';

type DecorateProcedure<TRouter extends AnyRouter, TProcedure extends AnyProcedure, TPath extends string> = TProcedure extends AnyQueryProcedure ? {
    use: <TData = inferProcedureOutput<TProcedure>>(getKey: (pageIndex: number, previousPageData: TData | null) => inferProcedureInput<TProcedure> | null, opts?: SWRInfiniteConfiguration<TData> & {
        isDisabled?: boolean;
    }) => SWRInfiniteResponse<TData, TRPCClientErrorLike<TRouter>>;
    useCursor: <TData = inferProcedureOutput<TProcedure>>(input: inferProcedureInput<TProcedure>, getCursor: (previousPageData: TData | null) => any, opts?: SWRInfiniteConfiguration<TData> & {
        isDisabled?: boolean;
    }) => SWRInfiniteResponse<TData, TRPCClientErrorLike<TRouter>>;
    preload: (input: inferProcedureInput<TProcedure>) => Promise<void>;
    getKey: GetKey<TProcedure, TPath>;
} : never;
/**
 * @internal
 */
type DecoratedProcedureRecord<TRouter extends AnyRouter, TProcedures extends TRPCRouterRecord, TPath extends string = ""> = {
    [TKey in keyof TProcedures]: TProcedures[TKey] extends infer $Value ? $Value extends AnyProcedure ? DecorateProcedure<TRouter, $Value, `${TPath}${TKey & string}`> : $Value extends TRPCRouterRecord ? DecoratedProcedureRecord<TRouter, $Value, `${TPath}${TKey & string}.`> : never : never;
};
type CreateTRPCInfiniteProxy<TRouter extends AnyRouter> = DecoratedProcedureRecord<TRouter, TRouter["_def"]["record"]>;
declare function createSWRInfiniteProxy<TRouter extends AnyRouter>(trpc: CreateTRPCSWRProxy<TRouter>): CreateTRPCInfiniteProxy<TRouter>;

export { createSWRInfiniteProxy };
export type { CreateTRPCInfiniteProxy };
