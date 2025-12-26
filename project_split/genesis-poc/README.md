# Simple TypeScript ZKP Login Example

This application is a minimal, self-contained example of initializing a WASM module (`zkp-prover`) and using it to generate a Zero-Knowledge Proof. It features a futuristic, animated UI built with plain TypeScript and the `three.js` library for 3D graphics.

This example was created to provide a clean, working demonstration of the WASM integration, separate from any complex build configurations.

## How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) (which includes `npm` and `npx`)

### 1. Compile the Application
The application is written in TypeScript (`src/index.ts`). You must first compile it to JavaScript.

From the root of the `Genesis` project, run:
```bash
npx tsc --project examples/simple-ts-login/tsconfig.json
```
This command reads the `tsconfig.json` in the application's directory and outputs the compiled JavaScript to `examples/simple-ts-login/dist/index.js`.

### 2. Serve the Application
To run the application, you need to serve the `examples/simple-ts-login` directory using a local web server. The simplest way to do this is with the `serve` package.

From the root of the `Genesis` project, run:
```bash
npx serve examples/simple-ts-login
```

This will start a server and provide a URL, typically `http://localhost:3000`. Open this URL in your web browser to see and use the application.
