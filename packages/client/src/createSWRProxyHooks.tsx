import { TRPCClientErrorLike } from "@trpc/client";
import {
  AnyMutationProcedure,
  AnyProcedure,
  AnyQueryProcedure,
  AnyRouter,
  inferProcedureInput,
  inferProcedureOutput,
  TRPCRouterRecord,
  createTRPCFlatProxy,
  createTRPCRecursiveProxy,
} from "@trpc/server";
import { SWRConfiguration, SWRResponse } from "swr";
import type {
  SWRMutationConfiguration,
  SWRMutationResponse,
} from "swr/mutation";

import { getQueryKey } from "./shared/utils";
import type { CreateTRPCSWRHooks, TRPCProvider } from "./shared/createSWRHooks";
import type { CreateClient, GetKey } from "./shared/types";

type DecorateProcedure<
  TRouter extends AnyRouter,
  TProcedure extends AnyProcedure,
  TPath extends string
> = TProcedure extends AnyQueryProcedure
  ? {
      useSWR: <
        TData = inferProcedureOutput<TProcedure>,
        TConfig extends SWRConfiguration<TData> = SWRConfiguration<TData>
      >(
        input: inferProcedureInput<TProcedure>,
        opts?: TConfig & {
          isDisabled?: boolean;
        }
      ) => SWRResponse<TData, TRPCClientErrorLike<TRouter>, TConfig>;

      preload: (input: inferProcedureInput<TProcedure>) => Promise<void>;
      getKey: GetKey<TProcedure, TPath>;
    }
  : TProcedure extends AnyMutationProcedure
  ? {
      useSWRMutation: <
        TData = inferProcedureOutput<TProcedure>,
        TMutationInput = inferProcedureInput<TProcedure>,
        TError = TRPCClientErrorLike<TRouter>
      >(
        opts?: SWRMutationConfiguration<
          TData,
          TError,
          TPath,
          TMutationInput,
          TPath
        >
      ) => SWRMutationResponse<TData, TError, TPath, TMutationInput>;

      getKey: GetKey<TProcedure, TPath>;
    }
  : never;

/**
 * @internal
 */
export type DecoratedProcedureRecord<
  TRouter extends AnyRouter,
  TProcedures extends TRPCRouterRecord,
  TPath extends string = ""
> = {
  [TKey in keyof TProcedures]: TProcedures[TKey] extends infer $Value
    ? $Value extends AnyProcedure
      ? DecorateProcedure<TRouter, $Value, `${TPath}${TKey & string}`>
      : $Value extends TRPCRouterRecord
      ? DecoratedProcedureRecord<TRouter, $Value, `${TPath}${TKey & string}.`>
      : never
    : never;
};

export type CreateTRPCSWRProxy<TRouter extends AnyRouter> = {
  createClient: CreateClient<TRouter>;
  useContext: CreateTRPCSWRHooks<TRouter>["useContext"];
  Provider: TRPCProvider<TRouter>;
  SWRConfig: CreateTRPCSWRHooks<TRouter>["SWRConfig"];
} & DecoratedProcedureRecord<TRouter, TRouter["_def"]["record"]>;

/**
 * Create proxy for decorating procedures
 * @internal
 */
export function createSWRProxyDecoration<TRouter extends AnyRouter>(
  name: string,
  hooks: CreateTRPCSWRHooks<TRouter>
) {
  return createTRPCRecursiveProxy((opts) => {
    const args = opts.args;

    const pathCopy = [name, ...opts.path];

    // The last arg is for instance `.useMutation` or `.useQuery()`
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    // rome-ignore lint/style/noNonNullAssertion: <explanation>
    const lastArg = pathCopy.pop()!;

    // The `path` ends up being something like `post.byId`
    const path = pathCopy.join(".");

    if (lastArg === "useSWRMutation") {
      return (hooks as any)[lastArg](path, ...args);
    }

    const [input, ...rest] = args;
    const queryKey = getQueryKey(path, input);

    /**
     * Preload does not care about other opts.
     */
    if (lastArg === "preload") {
      return hooks.preload(queryKey);
    }

    /**
     * Make sure we error on improper usage
     */
    if (lastArg === "getKey") {
      const [unserialized] = rest;
      if (typeof unserialized !== "boolean" && unserialized !== undefined) {
        throw new Error("Expected second argument to be a boolean");
      }
      hooks.getKey(queryKey, unserialized);
    }

    return (hooks as any)[lastArg](queryKey, ...rest);
  });
}

export function createSWRProxyHooksInternal<TRouter extends AnyRouter>(
  hooks: CreateTRPCSWRHooks<TRouter>
) {
  type CreateSWRInternalProxy = CreateTRPCSWRProxy<TRouter>;

  return createTRPCFlatProxy<CreateSWRInternalProxy>((key) => {
    if (key in hooks) {
      return hooks[key as keyof typeof hooks];
    }
    return createSWRProxyDecoration(key as string, hooks);
  });
}
