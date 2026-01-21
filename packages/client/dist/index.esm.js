import { createTRPCFlatProxy, createTRPCRecursiveProxy } from '@trpc/server';
import { jsx } from 'react/jsx-runtime';
import { createTRPCClient, getUntypedClient, createTRPCProxyClient } from '@trpc/client';
import { createContext, useMemo, useContext, useEffect, useState } from 'react';
import _useSWR, { unstable_serialize, preload, SWRConfig } from 'swr';
import _useSWRMutation from 'swr/mutation';

/**
 * Creates a query key for use inside SWR (unserialized)
 * @internal - Used internally to create a query key
 */ const getQueryKey = (path, input)=>{
    return typeof input === "undefined" ? [
        path
    ] : [
        path,
        input
    ];
};

/**
 * Create proxy for decorating procedures
 * @internal
 */ function createSWRProxyDecoration(name, hooks) {
    return createTRPCRecursiveProxy((opts)=>{
        const args = opts.args;
        const pathCopy = [
            name,
            ...opts.path
        ];
        // The last arg is for instance `.useMutation` or `.useQuery()`
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        // rome-ignore lint/style/noNonNullAssertion: <explanation>
        const lastArg = pathCopy.pop();
        // The `path` ends up being something like `post.byId`
        const path = pathCopy.join(".");
        if (lastArg === "useSWRMutation") {
            return hooks[lastArg](path, ...args);
        }
        const [input, ...rest] = args;
        const queryKey = getQueryKey(path, input);
        /**
     * Preload does not care about other opts.
     */ if (lastArg === "preload") {
            return hooks.preload(queryKey);
        }
        /**
     * Make sure we error on improper usage
     */ if (lastArg === "getKey") {
            const [unserialized] = rest;
            if (typeof unserialized !== "boolean" && unserialized !== undefined) {
                throw new Error("Expected second argument to be a boolean");
            }
            hooks.getKey(queryKey, unserialized);
        }
        return hooks[lastArg](queryKey, ...rest);
    });
}
function createSWRProxyHooksInternal(hooks) {
    return createTRPCFlatProxy((key)=>{
        if (key in hooks) {
            return hooks[key];
        }
        return createSWRProxyDecoration(key, hooks);
    });
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
// rome-ignore lint/style/noNonNullAssertion: <explanation>
const TRPCContext = createContext(null);

const useTransformFallback = (data, transformer)=>{
    return useMemo(()=>{
        if (!data) {
            return;
        }
        if (!transformer) {
            return data;
        }
        const deserialize = transformer ? ("output" in transformer ? transformer.output : transformer).deserialize : (object)=>object;
        const deserializedValue = Object.fromEntries(Object.entries(data).map(([key, value])=>[
                key,
                deserialize(value)
            ]));
        return deserializedValue;
    }, [
        data
    ]);
};

/**
 * @internal - use this to create custom hooks
 * @deprecated - use `createSWRProxyHooks` instead
 */ function createSWRHooks(config) {
    // TODO - Infer types of useSWR
    const createClient = (configOverride)=>{
        return createTRPCClient(configOverride || config);
    };
    const Context = TRPCContext;
    const useTRPCContext = ()=>useContext(Context);
    const useSWR = (pathAndInput, config)=>{
        const { nativeClient } = useTRPCContext();
        const { isDisabled, ...swrConfig } = config || {};
        return _useSWR(isDisabled ? null : pathAndInput, (pathAndInput)=>{
            const untypedClient = getUntypedClient(nativeClient);
            return untypedClient.query(...pathAndInput);
        }, swrConfig);
    };
    const useSWRMutation = (path, config)=>{
        const { nativeClient } = useTRPCContext();
        return _useSWRMutation(path, (path, { arg })=>{
            const untypedClient = getUntypedClient(nativeClient);
            return untypedClient.mutation(path, arg);
        }, config);
    };
    let _clientRef = null;
    const TRPCProvider = ({ children, client })=>{
        useEffect(()=>{
            _clientRef = client;
        }, [
            client
        ]);
        const [vanillaClient] = useState(()=>{
            return createTRPCProxyClient(config);
        });
        return /*#__PURE__*/ jsx(Context.Provider, {
            value: {
                nativeClient: client,
                client: vanillaClient
            },
            children: children
        });
    };
    const preload$1 = (pathAndInput)=>{
        /**
     * SWR ??? - why is this not default?
     */ if (typeof window === "undefined") {
            return Promise.resolve();
        }
        return preload(pathAndInput, (pathAndInput)=>{
            // Create client instance if not already created (Will be Garbage collected once TRPCProvider mounts)
            if (!_clientRef) {
                _clientRef = createClient();
            }
            const untypedClient = getUntypedClient(_clientRef);
            return untypedClient.query(...pathAndInput);
        });
    };
    const getKey = (pathAndInput, unserialized = false)=>{
        return unserialized ? pathAndInput : unstable_serialize(pathAndInput);
    };
    const SWRConfig$1 = ({ children, value })=>{
        const fallback = value == null ? void 0 : value.fallback;
        const transformedFallback = useTransformFallback(fallback, config == null ? void 0 : config.transformer);
        const finalValue = {
            ...value
        };
        if (transformedFallback) {
            finalValue.fallback = transformedFallback;
        }
        return /*#__PURE__*/ jsx(SWRConfig, {
            value: finalValue,
            children: children
        });
    };
    return {
        Provider: TRPCProvider,
        useContext: useTRPCContext,
        SWRConfig: SWRConfig$1,
        useSWR,
        useSWRMutation,
        preload: preload$1,
        getKey: getKey,
        createClient
    };
}

function createSWRProxyHooks(config) {
    const hooks = createSWRHooks(config);
    const proxy = createSWRProxyHooksInternal(hooks);
    return proxy;
}

export { createSWRHooks, createSWRProxyHooks };
