Object.defineProperty(exports, '__esModule', { value: true });

var shared$1 = require('@trpc/server/shared');
var client = require('@trpc-swr/client');
var jsxRuntime = require('react/jsx-runtime');
var react = require('react');
var swr = require('swr');
var shared = require('@trpc-swr/client/shared');

const _SWRProvider = ({ children, fallback = {} })=>{
    return /*#__PURE__*/ jsxRuntime.jsx(swr.SWRConfig, {
        value: {
            fallback
        },
        children: children
    });
};
const SWRProvider = /*#__PURE__*/ react.memo(_SWRProvider);
const withTRPCNext = (config, hooks)=>(Component)=>{
        return (props)=>{
            const { pageProps } = props;
            const { swr } = pageProps || {};
            const transformedFallback = shared.useTransformFallback(swr, config.transformer);
            const [client] = react.useState(()=>hooks.createClient());
            return /*#__PURE__*/ jsxRuntime.jsx(SWRProvider, {
                fallback: transformedFallback,
                children: /*#__PURE__*/ jsxRuntime.jsx(hooks.Provider, {
                    client: client,
                    children: /*#__PURE__*/ jsxRuntime.jsx(Component, {
                        ...props
                    })
                })
            });
        };
    };

function createTRPCSWRNext(config) {
    const proxyHooks = client.createSWRProxyHooks(config);
    const utils = {
        withTRPC: (App)=>{
            return withTRPCNext(config, proxyHooks)(App);
        }
    };
    return shared$1.createFlatProxy((key)=>{
        if (key in utils) {
            return utils[key];
        }
        return proxyHooks;
    });
}

exports.createTRPCSWRNext = createTRPCSWRNext;
exports.withTRPCNext = withTRPCNext;
