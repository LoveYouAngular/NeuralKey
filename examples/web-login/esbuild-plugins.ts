import type { Plugin } from 'esbuild';

const wasmExternalPlugin: Plugin = {
  name: 'wasm-external',
  setup(build) {
    build.initialOptions.external = build.initialOptions.external ?? [];
    // Mark the specific Wasm import as external
    build.initialOptions.external.push('/assets/zkp_prover_bg.wasm?init');
  },
};

export default [wasmExternalPlugin];
