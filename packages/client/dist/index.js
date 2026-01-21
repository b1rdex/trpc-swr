Object.defineProperty(exports, '__esModule', { value: true });

var server = require('@trpc/server');
var jsxRuntime = require('react/jsx-runtime');
var client = require('@trpc/client');
var react = require('react');
var _useSWR = require('swr');
var _useSWRMutation = require('swr/mutation');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var _useSWR__default = /*#__PURE__*/_interopDefault(_useSWR);
var _useSWRMutation__default = /*#__PURE__*/_interopDefault(_useSWRMutation);

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
    return server.createTRPCRecursiveProxy((opts)=>{
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
    return server.createTRPCFlatProxy((key)=>{
        if (key in hooks) {
            return hooks[key];
        }
        return createSWRProxyDecoration(key, hooks);
    });
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
// rome-ignore lint/style/noNonNullAssertion: <explanation>
const TRPCContext = react.createContext(null);

const useTransformFallback = (data, transformer)=>{
    return react.useMemo(()=>{
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
        return client.createTRPCClient(configOverride || config);
    };
    const Context = TRPCContext;
    const useTRPCContext = ()=>react.useContext(Context);
    const useSWR = (pathAndInput, config)=>{
        const { nativeClient } = useTRPCContext();
        const { isDisabled, ...swrConfig } = config || {};
        return _useSWR__default.default(isDisabled ? null : pathAndInput, (pathAndInput)=>{
            return nativeClient.query(...pathAndInput);
        }, swrConfig);
    };
    const useSWRMutation = (path, config)=>{
        const { nativeClient } = useTRPCContext();
        return _useSWRMutation__default.default(path, (path, { arg })=>{
            return nativeClient.mutation(path, arg);
        }, config);
    };
    let _clientRef = null;
    const TRPCProvider = ({ children, client: client$1 })=>{
        react.useEffect(()=>{
            _clientRef = client$1;
        }, [
            client$1
        ]);
        const [vanillaClient] = react.useState(()=>{
            return client.createTRPCProxyClient(config);
        });
        return /*#__PURE__*/ jsxRuntime.jsx(Context.Provider, {
            value: {
                nativeClient: client$1,
                client: vanillaClient
            },
            children: children
        });
    };
    const preload = (pathAndInput)=>{
        /**
     * SWR ??? - why is this not default?
     */ if (typeof window === "undefined") {
            return Promise.resolve();
        }
        return _useSWR.preload(pathAndInput, (pathAndInput)=>{
            // Create client instance if not already created (Will be Garbage collected once TRPCProvider mounts)
            if (!_clientRef) {
                _clientRef = createClient();
            }
            return _clientRef.query(...pathAndInput);
        });
    };
    const getKey = (pathAndInput, unserialized = false)=>{
        return unserialized ? pathAndInput : _useSWR.unstable_serialize(pathAndInput);
    };
    const SWRConfig = ({ children, value })=>{
        const fallback = value == null ? void 0 : value.fallback;
        const transformedFallback = useTransformFallback(fallback, config == null ? void 0 : config.transformer);
        const finalValue = {
            ...value
        };
        if (transformedFallback) {
            finalValue.fallback = transformedFallback;
        }
        return /*#__PURE__*/ jsxRuntime.jsx(_useSWR.SWRConfig, {
            value: finalValue,
            children: children
        });
    };
    return {
        Provider: TRPCProvider,
        useContext: useTRPCContext,
        SWRConfig: SWRConfig,
        useSWR,
        useSWRMutation,
        preload: preload,
        getKey: getKey,
        createClient
    };
}

function createSWRProxyHooks(config) {
    const hooks = createSWRHooks(config);
    const proxy = createSWRProxyHooksInternal(hooks);
    return proxy;
}

exports.createSWRHooks = createSWRHooks;
exports.createSWRProxyHooks = createSWRProxyHooks;
