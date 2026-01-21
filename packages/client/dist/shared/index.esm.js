import { useMemo } from 'react';

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

export { getQueryKey, useTransformFallback };
