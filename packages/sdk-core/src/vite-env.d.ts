declare module '*.wasm?init' {
  const initWasm: () => Promise<any>; // Assuming it returns a Promise that resolves to the Wasm module
  export default initWasm;
}
