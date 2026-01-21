import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { AppRouter, appRouter } from "./server";
import { useState } from "react";
import { SWRConfig } from "swr";
import { RenderOptions, cleanup, render } from "@testing-library/react";
import { createSWRProxyHooks } from "@trpc-swr/client";
import { CreateTRPCClientOptions, httpLink } from "@trpc/client";
import getPort from "get-port";
import type { Server } from "node:http";

export let PORT: number;

const createAppRouterSWRHooks = (
  config: CreateTRPCClientOptions<AppRouter>
) => {
  return createSWRProxyHooks<AppRouter>(config);
};

let server: Server;
export let trpc: ReturnType<typeof createAppRouterSWRHooks>;

beforeEach(() => {
  trpc = createAppRouterSWRHooks({
    links: [httpLink({ url: `http://localhost:${PORT}` })],
  });
});

beforeAll(async () => {
  PORT = await getPort();
  server = createHTTPServer({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res }),
  });

  await new Promise((res) => {
    server.listen(PORT, () => {
      res(server);
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

afterEach(() => {
  cleanup();
});

export { appRouter, server };

const customRender = (
  ui: React.ReactElement,
  options: RenderOptions = {}
): ReturnType<typeof render> =>
  render(ui, {
    wrapper: ({ children }) => {
      const [client] = useState(() => trpc.createClient());
      return (
        <SWRConfig>
          <trpc.Provider client={client}>{children}</trpc.Provider>
        </SWRConfig>
      );
    },
    ...options,
  });

export * from "@testing-library/react";

export const getUrl = async () => {
  return `http://localhost:${PORT}`;
};
// override render export
export { customRender as render };
export { default as userEvent } from "@testing-library/user-event";
