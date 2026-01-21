import { CreateTRPCClientOptions } from '@trpc/client';
import { AnyRouter } from '@trpc/server';
import { CreateTRPCSWRProxy } from '@trpc-swr/client';
import * as react_jsx_runtime from 'react/jsx-runtime';

declare const withTRPCNext: <TRouter extends AnyRouter>(config: CreateTRPCClientOptions<TRouter>, hooks: CreateTRPCSWRProxy<TRouter>) => <T extends Record<any, any>>(Component: React.ComponentType<any>) => (props: T) => react_jsx_runtime.JSX.Element;

type CreateTRPCSWRNextProxy<TRouter extends AnyRouter> = {
    withTRPC: (App: React.ComponentType<any>) => (props: Record<any, any>) => JSX.Element;
} & CreateTRPCSWRProxy<TRouter>;
declare function createTRPCSWRNext<TRouter extends AnyRouter>(config: CreateTRPCClientOptions<TRouter>): CreateTRPCSWRNextProxy<TRouter>;

export { createTRPCSWRNext, withTRPCNext };
export type { CreateTRPCSWRNextProxy };
