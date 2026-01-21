import { getUntypedClient } from '@trpc/client';
import { createTRPCFlatProxy, createTRPCRecursiveProxy } from '@trpc/server';
import _useSWRInfinite from 'swr/infinite';
import { getQueryKey } from '@trpc-swr/client/shared';

function createInfiniteProxyDecoration(name, hooks) {
    return createTRPCRecursiveProxy((opts)=>{
        const args = opts.args;
        const pathCopy = [
            name,
            ...opts.path
        ];
        // The last arg is for instance `.use` or `.useCursor()`
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        // rome-ignore lint/style/noNonNullAssertion: <explanation>
        const lastArg = pathCopy.pop();
        const path = pathCopy.join(".");
        if (lastArg === "useCursor") {
            const [input, ...rest] = args;
            const queryKey = getQueryKey(path, input);
            return hooks.useCursor(queryKey, ...rest);
        }
        const [geyKeyCallback, ...rest] = args;
        return hooks[lastArg](path, geyKeyCallback, ...rest);
    });
}
function createSWRInfiniteHooks(trpc) {
    const useSWRInfinite = (path, getKey, config)=>{
        const { nativeClient } = trpc.useContext();
        return _useSWRInfinite((index, previousPageData)=>{
            if (config == null ? void 0 : config.isDisabled) return null;
            return getKey(index, previousPageData);
        }, (args)=>{
            const untypedClient = getUntypedClient(nativeClient);
            return untypedClient.query(path, args);
        }, config);
    };
    /**
	 * Uses a preset cursor to fetch the next page. Cursor MUST exist on the input object
	 */ const useCursor = (pathAndInput, getCursor, config)=>{
        const { nativeClient } = trpc.useContext();
        return _useSWRInfinite((index, previousPageData)=>{
            if (config == null ? void 0 : config.isDisabled) return null; // Disable
            const [path, input] = pathAndInput;
            // First page
            if (index === 0) return pathAndInput;
            // Input must be an object
            if (typeof input !== "object" && typeof input !== "undefined") {
                console.warn(`Input should be an object, got ${typeof input}. Use \`infinite.<endpoint>.use\` instead to build your own custom pagination.`);
            }
            // Use dummy input object if none exists
            const inputSpread = typeof input === "object" ? {
                ...input
            } : {};
            const cursor = getCursor(previousPageData);
            // Reached the end
            if (previousPageData && (typeof cursor === "undefined" || cursor === null)) {
                return null;
            }
            return [
                path,
                {
                    ...inputSpread,
                    cursor
                }
            ];
        }, (args)=>{
            const [path, input] = args;
            const untypedClient = getUntypedClient(nativeClient);
            return untypedClient.query(path, input);
        }, config);
    };
    return {
        use: useSWRInfinite,
        useCursor
    };
}
function createInfiniteProxyInternal(hooks) {
    return createTRPCFlatProxy((key)=>{
        if (key in hooks) {
            return hooks[key];
        }
        return createInfiniteProxyDecoration(key, hooks);
    });
}
function createSWRInfiniteProxy(trpc) {
    const hooks = createSWRInfiniteHooks(trpc);
    return createInfiniteProxyInternal(hooks);
}

export { createSWRInfiniteProxy };
