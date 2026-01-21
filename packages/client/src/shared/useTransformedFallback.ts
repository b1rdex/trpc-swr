/* eslint-disable unicorn/filename-case */
import type { DataTransformerOptions } from "@trpc/server/unstable-core-do-not-import";
import { useMemo } from "react";

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
