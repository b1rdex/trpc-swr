import { TRPCClient, CreateTRPCClient, CreateTRPCClientOptions, TRPCClientErrorLike } from '@trpc/client';
import { AnyRouter, AnyProcedure, inferProcedureInput, TRPCRouterRecord, CombinedDataTransformer, DataTransformer, inferProcedureOutput, AnyQueryProcedure, AnyMutationProcedure } from '@trpc/server';
import { SWRConfig, SWRConfiguration, SWRResponse } from 'swr';
import { SWRMutationConfiguration, SWRMutationResponse } from 'swr/mutation';

interface TRPCContextType<TRouter extends AnyRouter> {
    nativeClient: TRPCClient<TRouter>;
    client: CreateTRPCClient<TRouter>;
}

type CreateClient<TRouter extends AnyRouter> = (config?: CreateTRPCClientOptions<TRouter>) => TRPCClient<TRouter>;
/**
 * Gets the current key of a procedure call, useful for cache mutation & manual SSR
 * @param input - input of the procedure if any
 * @param {boolean} unserialized - If false (default) the input will be serialized using SWR key serialization, otherwise the key array will be returned.
 */
type GetKey<TProcedure extends AnyProcedure, TPath extends string> = <TInput = inferProcedureInput<TProcedure>, RawKey extends boolean | undefined = false>(input: inferProcedureInput<TProcedure>, unserialized?: RawKey) => RawKey extends true ? [TPath, TInput] : string;
type GetQueryKey = (path: string, input: any) => readonly [string] | readonly [string, any];

type DataTransformerOptions = CombinedDataTransformer | DataTransformer;

/**
 * @internal - use this to create custom hooks
 * @deprecated - use `createSWRProxyHooks` instead
 */
declare function createSWRHooks<TRouter extends AnyRouter>(config: CreateTRPCClientOptions<TRouter>): CreateTRPCSWRHooks<TRouter>;
type TRPCProvider<TRouter extends AnyRouter> = React.FC<React.PropsWithChildren<{
    client: TRPCClient<TRouter>;
}>>;
type UseSWR<TRouter extends AnyRouter, _ extends TRPCRouterRecord = TRouter["_def"]["record"]> = <TPath extends string, TProcedure extends AnyProcedure>(pathAndInput: [TPath, inferProcedureInput<TProcedure>], config?: SWRConfiguration & {
    isDisabled?: boolean;
}) => SWRResponse<inferProcedureOutput<TProcedure>, TRPCClientErrorLike<TRouter>>;
type UseSWRMutation<TRouter extends AnyRouter, _ extends TRPCRouterRecord = TRouter["_def"]["record"]> = <TPath extends string, TProcedure extends AnyProcedure, TInput = inferProcedureInput<TProcedure>, TOutput = inferProcedureOutput<TProcedure>>(path: TPath, config: SWRMutationConfiguration<TInput, TOutput>) => SWRMutationResponse<TOutput, TRPCClientErrorLike<TRouter>, TPath, TInput>;
interface CreateTRPCSWRHooks<TRouter extends AnyRouter, TProcedures extends TRPCRouterRecord = TRouter["_def"]["record"]> {
    Provider: TRPCProvider<TRouter>;
    SWRConfig: React.FC<React.ComponentProps<typeof SWRConfig> & {
        transformer?: DataTransformerOptions;
    }>;
    useContext: () => TRPCContextType<TRouter>;
    useSWR: UseSWR<TRouter, TProcedures>;
    useSWRMutation: UseSWRMutation<TRouter, TProcedures>;
    getKey: <PreloadData extends readonly [string] | readonly [string, any]>(pathAndInput: PreloadData, unserialized?: boolean) => string | PreloadData;
    preload: (pathAndInput: ReturnType<GetQueryKey>) => Promise<void>;
    createClient: CreateClient<TRouter>;
}

type DecorateProcedure<TRouter extends AnyRouter, TProcedure extends AnyProcedure, TPath extends string> = TProcedure extends AnyQueryProcedure ? {
    useSWR: <TData = inferProcedureOutput<TProcedure>, TConfig extends SWRConfiguration<TData> = SWRConfiguration<TData>>(input: inferProcedureInput<TProcedure>, opts?: TConfig & {
        isDisabled?: boolean;
    }) => SWRResponse<TData, TRPCClientErrorLike<TRouter>, TConfig>;
    preload: (input: inferProcedureInput<TProcedure>) => Promise<void>;
    getKey: GetKey<TProcedure, TPath>;
} : TProcedure extends AnyMutationProcedure ? {
    useSWRMutation: <TData = inferProcedureOutput<TProcedure>, TMutationInput = inferProcedureInput<TProcedure>, TError = TRPCClientErrorLike<TRouter>>(opts?: SWRMutationConfiguration<TData, TError, TPath, TMutationInput, TPath>) => SWRMutationResponse<TData, TError, TPath, TMutationInput>;
    getKey: GetKey<TProcedure, TPath>;
} : never;
/**
 * @internal
 */
type DecoratedProcedureRecord<TRouter extends AnyRouter, TProcedures extends TRPCRouterRecord, TPath extends string = ""> = {
    [TKey in keyof TProcedures]: TProcedures[TKey] extends infer $Value ? $Value extends AnyProcedure ? DecorateProcedure<TRouter, $Value, `${TPath}${TKey & string}`> : $Value extends TRPCRouterRecord ? DecoratedProcedureRecord<TRouter, $Value, `${TPath}${TKey & string}.`> : never : never;
};
type CreateTRPCSWRProxy<TRouter extends AnyRouter> = {
    createClient: CreateClient<TRouter>;
    useContext: CreateTRPCSWRHooks<TRouter>["useContext"];
    Provider: TRPCProvider<TRouter>;
    SWRConfig: CreateTRPCSWRHooks<TRouter>["SWRConfig"];
} & DecoratedProcedureRecord<TRouter, TRouter["_def"]["record"]>;

declare function createSWRProxyHooks<TRouter extends AnyRouter>(config: CreateTRPCClientOptions<TRouter>): CreateTRPCSWRProxy<TRouter>;

export { createSWRHooks, createSWRProxyHooks };
export type { CreateClient, CreateTRPCSWRHooks, CreateTRPCSWRProxy, GetKey, GetQueryKey };
