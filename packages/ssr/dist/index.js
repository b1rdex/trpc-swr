Object.defineProperty(exports, '__esModule', { value: true });

var server = require('@trpc/server');

/* eslint-disable unicorn/no-nested-ternary */ /**
 * @internal - Current SWR helper RIP. This is a temporary solution to bypass Next.js RSC auto compilation error.
 * @source https://github.com/vercel/swr/blob/main/_internal/utils/helper.ts
 */ const noop = ()=>{};
// prettier-ignore
const UNDEFINED = /*__NOINLINE__*/ noop();
const isUndefined = (v)=>v === UNDEFINED;
const isFunction = (v)=>typeof v == "function";
const OBJECT = Object;
/**
 * @internal - Current SWR hash RIP. This is a temporary solution to bypass Next.js RSC auto compilation error.
 * @source https://github.com/vercel/swr/blob/main/_internal/utils/hash.ts
 */ // use WeakMap to store the object->key mapping
// so the objects can be garbage collected.
// WeakMap uses a hashtable under the hood, so the lookup
// complexity is almost O(1).
const table = new WeakMap();
// counter of the key
let counter = 0;
// A stable hash implementation that supports:
// - Fast and ensures unique hash properties
// - Handles unserializable values
// - Handles object key ordering
// - Generates short results
//
// This is not a serialization function, and the result is not guaranteed to be
// parsable.
const stableHash = (argument)=>{
    const type = typeof argument;
    // rome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
    const constructor = argument == null ? void 0 : argument.constructor;
    // rome-ignore lint/suspicious/noDoubleEquals: <explanation>
    const isDate = constructor == Date;
    let result;
    let index;
    // rome-ignore lint/suspicious/noDoubleEquals: <explanation>
    if (OBJECT(argument) === argument && !isDate && constructor != RegExp) {
        // Object/function, not null/date/regexp. Use WeakMap to store the id first.
        // If it's already hashed, directly return the result.
        result = table.get(argument);
        if (result) return result;
        // Store the hash first for circular reference detection before entering the
        // recursive `stableHash` calls.
        // For other objects like set and map, we use this id directly as the hash.
        result = `${++counter}~`;
        table.set(argument, result);
        // rome-ignore lint/suspicious/noDoubleEquals: <explanation>
        if (constructor == Array) {
            // Array.
            result = "@";
            for(index = 0; index < argument.length; index++){
                result += `${stableHash(argument[index])},`;
            }
            table.set(argument, result);
        }
        // rome-ignore lint/suspicious/noDoubleEquals: <explanation>
        if (constructor == OBJECT) {
            // Object, sort keys.
            result = "#";
            const keys = OBJECT.keys(argument).sort();
            while(!isUndefined(index = keys.pop())){
                if (!isUndefined(argument[index])) {
                    result += `${index}:${stableHash(argument[index])},`;
                }
            }
            table.set(argument, result);
        }
    } else {
        result = isDate ? argument.toJSON() : type == "symbol" ? argument.toString() : type == "string" ? JSON.stringify(argument) : `${argument}`;
    }
    return result;
};
const serialize = (key)=>{
    if (isFunction(key)) {
        try {
            key = key();
        } catch (unused) {
            // dependencies not ready
            key = "";
        }
    }
    // Use the original key as the argument of fetcher. This can be a string or an
    // array of values.
    const arguments_ = key;
    // If key is not falsy, or not an empty array, hash it.
    key = // rome-ignore lint/suspicious/noDoubleEquals: <explanation>
    typeof key == "string" ? key : (Array.isArray(key) ? key.length : key) ? stableHash(key) : "";
    return [
        key,
        arguments_
    ];
};
const unstable_serialize = (key)=>serialize(key)[0];

function createSSGProxyDecoration(name, state, caller, serialize = (obj)=>obj) {
    return server.createTRPCRecursiveProxy((opts)=>{
        const args = opts.args;
        const pathCopy = [
            name,
            ...opts.path
        ];
        const lastArg = pathCopy.pop();
        const path = pathCopy.join(".");
        const [input, opt] = args;
        const queryKey = getQueryKey(path, input);
        const serializedKey = getKey(queryKey);
        if (lastArg === "fetch") {
            // In v11, caller doesn't have .query() method
            // Instead, we need to traverse the path and call the procedure directly
            const pathSegments = path ? path.split(".") : [];
            let procedure = caller;
            for (const segment of pathSegments){
                if (segment) {
                    procedure = procedure[segment];
                }
            }
            const promise = procedure(input);
            state.set(serializedKey, promise);
            return promise.then((v)=>(opt == null ? void 0 : opt.transform) ? serialize(v) : v);
        }
        if (lastArg === "getKey") return serializedKey;
        throw new Error(`Invalid path ${path}`);
    });
}
// Get key
const getKey = (pathAndInput)=>{
    return unstable_serialize(pathAndInput);
};
const getQueryKey = (path, input)=>{
    return typeof input === "undefined" ? [
        path
    ] : [
        path,
        input
    ];
};
function createProxySSGHelpers({ router, ctx = {} }) {
    const state = new Map();
    // Auto infer transformer from router
    const transformer = router._def._config.transformer;
    const caller = router.createCaller(ctx);
    // Build serialize function from transformer
    const serialize = transformer ? ("input" in transformer ? transformer.input : transformer).serialize : (obj)=>obj;
    return server.createTRPCFlatProxy((key)=>{
        if (key === "dehydrate") {
            return async ()=>{
                const asyncEntries = await Promise.all(Array.from(state.entries()).map(async ([key, value])=>{
                    return [
                        key,
                        serialize(await value)
                    ];
                }));
                return Object.fromEntries(asyncEntries);
            };
        }
        return createSSGProxyDecoration(key, state, caller, serialize);
    });
}

exports.createProxySSGHelpers = createProxySSGHelpers;
exports.unstable_serialize = unstable_serialize;
