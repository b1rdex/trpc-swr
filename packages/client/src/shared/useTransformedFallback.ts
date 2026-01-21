/* eslint-disable unicorn/filename-case */
import type { CombinedDataTransformer, DataTransformer } from "@trpc/server";
import { useMemo } from "react";

// Type alias for transformer options (CombinedDataTransformer | DataTransformer)
type DataTransformerOptions = CombinedDataTransformer | DataTransformer;

export const useTransformFallback = (
  data: unknown,
  transformer?: DataTransformerOptions
) => {
  return useMemo(() => {
    if (!data) {
      return;
    }
    if (!transformer) {
      return data;
    }

    const deserialize = transformer
      ? ("output" in transformer ? transformer.output : transformer).deserialize
      : (object: unknown) => object;
    const deserializedValue = Object.fromEntries(
      Object.entries(data as Record<string, any>).map(([key, value]) => [
        key,
        deserialize(value),
      ])
    );
    return deserializedValue;
  }, [data]);
};
