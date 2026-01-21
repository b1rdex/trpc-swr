import { CreateTRPCClientOptions, TRPCClient } from '@trpc/client';
import { AnyRouter, AnyProcedure, inferProcedureInput, CombinedDataTransformer, DataTransformer } from '@trpc/server';

type CreateClient<TRouter extends AnyRouter> = (config?: CreateTRPCClientOptions<TRouter>) => TRPCClient<TRouter>;
/**
 * Gets the current key of a procedure call, useful for cache mutation & manual SSR
 * @param input - input of the procedure if any
 * @param {boolean} unserialized - If false (default) the input will be serialized using SWR key serialization, otherwise the key array will be returned.
 */
type GetKey<TProcedure extends AnyProcedure, TPath extends string> = <TInput = inferProcedureInput<TProcedure>, RawKey extends boolean | undefined = false>(input: inferProcedureInput<TProcedure>, unserialized?: RawKey) => RawKey extends true ? [TPath, TInput] : string;
type GetQueryKey = (path: string, input: any) => readonly [string] | readonly [string, any];

/**
 * Creates a query key for use inside SWR (unserialized)
 * @internal - Used internally to create a query key
 */
declare const getQueryKey: GetQueryKey;

type DataTransformerOptions = CombinedDataTransformer | DataTransformer;
declare const useTransformFallback: (data: unknown, transformer?: DataTransformerOptions) => {} | undefined;

export { getQueryKey, useTransformFallback };
export type { CreateClient, GetKey, GetQueryKey };
