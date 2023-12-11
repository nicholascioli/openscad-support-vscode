import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from "@rollup/plugin-typescript";

const tsc = typescript({tsconfig: "./webview/tsconfig.json"});

export default {
    input: 'webview/entrypoint.ts',
    output: {
        file: 'out/webview.js',
        format: 'umd',
        sourcemap: true,
    },
    plugins: [nodeResolve(), tsc],
};
