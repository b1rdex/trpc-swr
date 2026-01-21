import { createFlatProxy } from '@trpc/server/shared';
import { createSWRProxyHooks } from '@trpc-swr/client';
import { jsx } from 'react/jsx-runtime';
import { useState, memo } from 'react';
import { SWRConfig } from 'swr';
import { useTransformFallback } from '@trpc-swr/client/shared';

const _SWRProvider = ({ children, fallback = {} })=>{
    return /*#__PURE__*/ jsx(SWRConfig, {
        value: {
            fallback
        },
        children: children
    });
};
const SWRProvider = /*#__PURE__*/ memo(_SWRProvider);
const withTRPCNext = (config, hooks)=>(Component)=>{
        return (props)=>{
            const { pageProps } = props;
            const { swr } = pageProps || {};
            const transformedFallback = useTransformFallback(swr, config.transformer);
            const [client] = useState(()=>hooks.createClient());
            return /*#__PURE__*/ jsx(SWRProvider, {
                fallback: transformedFallback,
                children: /*#__PURE__*/ jsx(hooks.Provider, {
                    client: client,
                    children: /*#__PURE__*/ jsx(Component, {
                        ...props
                    })
                })
            });
        };
    };

function createTRPCSWRNext(config) {
    const proxyHooks = createSWRProxyHooks(config);
    const utils = {
        withTRPC: (App)=>{
            return withTRPCNext(config, proxyHooks)(App);
        }
    };
    return createFlatProxy((key)=>{
        if (key in utils) {
            return utils[key];
        }
        return proxyHooks;
    });
}

export { createTRPCSWRNext, withTRPCNext };
