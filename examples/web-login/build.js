const esbuild = require('esbuild');
const { wasmLoader } = require('esbuild-plugin-wasm');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  format: 'esm',
  plugins: [
    wasmLoader({
      mode: 'deferred',
    }),
  ],
}).catch(() => process.exit(1));

esbuild.build({
    entryPoints: ['src/server.ts'],
    bundle: true,
    outfile: 'dist/server.js',
    platform: 'node',
    format: 'esm',
    plugins: [
      wasmLoader({
        mode: 'deferred',
      }),
    ],
  }).catch(() => process.exit(1));
