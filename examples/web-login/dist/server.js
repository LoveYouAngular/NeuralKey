var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server.ts
import { createServer } from "http";

// wasm-module:/Users/naveensingh/Genesis/node_modules/@neuralkey/zkp-prover/pkg/zkp_prover_bg.wasm
var zkp_prover_bg_exports = {};
__export(zkp_prover_bg_exports, {
  __wbindgen_externrefs: () => __wbindgen_externrefs,
  __wbindgen_free: () => __wbindgen_free,
  __wbindgen_malloc: () => __wbindgen_malloc,
  __wbindgen_start: () => __wbindgen_start,
  generate_zkp: () => generate_zkp,
  instance: () => instance,
  memory: () => memory,
  module: () => module,
  verify_zkp: () => verify_zkp2
});

// wasm-deferred:/Users/naveensingh/Genesis/node_modules/@neuralkey/zkp-prover/pkg/zkp_prover_bg.wasm
var zkp_prover_bg_default = "./zkp_prover_bg-7PWCGFZA.wasm";

// ../../node_modules/@neuralkey/zkp-prover/pkg/zkp_prover_bg.js
var wasm;
function __wbg_set_wasm(val) {
  wasm = val;
}
var cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
var WASM_VECTOR_LEN = 0;
function verify_zkp(proof, public_input) {
  const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passArray8ToWasm0(public_input, wasm.__wbindgen_malloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.verify_zkp(ptr0, len0, ptr1, len1);
  return ret !== 0;
}
function __wbindgen_init_externref_table() {
  const table = wasm.__wbindgen_externrefs;
  const offset = table.grow(4);
  table.set(0, void 0);
  table.set(offset + 0, void 0);
  table.set(offset + 1, null);
  table.set(offset + 2, true);
  table.set(offset + 3, false);
}

// wasm-module:/Users/naveensingh/Genesis/node_modules/@neuralkey/zkp-prover/pkg/zkp_prover_bg.wasm
var imports = {
  ["./zkp_prover_bg.js"]: {
    __wbindgen_init_externref_table
  }
};
async function loadWasm(module2, imports2) {
  if (typeof module2 === "string") {
    if (module2.startsWith("./")) {
      module2 = new URL(module2, import.meta.url).href;
    }
    if (module2.startsWith("file://")) {
      const fs = await import("fs");
      module2 = await fs.promises.readFile(new URL(module2));
    } else {
      const moduleRequest = await fetch(module2);
      if (typeof WebAssembly.instantiateStreaming === "function") {
        try {
          return await WebAssembly.instantiateStreaming(moduleRequest, imports2);
        } catch (e) {
          if (moduleRequest.headers.get("Content-Type") != "application/wasm") {
            console.warn(e);
          } else {
            throw e;
          }
        }
      }
      module2 = await moduleRequest.arrayBuffer();
    }
  }
  return await WebAssembly.instantiate(module2, imports2);
}
var { instance, module } = await loadWasm(zkp_prover_bg_default, imports);
var memory = instance.exports.memory;
var generate_zkp = instance.exports.generate_zkp;
var verify_zkp2 = instance.exports.verify_zkp;
var __wbindgen_externrefs = instance.exports.__wbindgen_externrefs;
var __wbindgen_malloc = instance.exports.__wbindgen_malloc;
var __wbindgen_free = instance.exports.__wbindgen_free;
var __wbindgen_start = instance.exports.__wbindgen_start;

// ../../node_modules/@neuralkey/zkp-prover/pkg/zkp_prover.js
__wbg_set_wasm(zkp_prover_bg_exports);
__wbindgen_start();

// src/server.ts
var SimpleNeuralVerifier = class {
  async validateProof(proof, originalChallenge) {
    const isValid = verify_zkp(proof.proof, proof.publicSignals);
    const isChallengeMatching = new TextDecoder().decode(proof.publicSignals) === originalChallenge;
    return isValid && isChallengeMatching;
  }
};
var verifier = new SimpleNeuralVerifier();
var server = createServer(async (req, res) => {
  if (req.url === "/verify" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", async () => {
      try {
        const { proof, challenge } = JSON.parse(body);
        const proofAsZkp = {
          proof: new Uint8Array(Object.values(proof.proof)),
          publicSignals: new Uint8Array(Object.values(proof.publicSignals))
        };
        const isValid = await verifier.validateProof(proofAsZkp, challenge);
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ success: true, verified: isValid }));
      } catch (error) {
        console.error("Verification error:", error);
        res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ success: false, error: "Invalid request body" }));
      }
    });
  } else if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});
var PORT = 3e3;
server.listen(PORT, () => {
  console.log(`Verification server running on http://localhost:${PORT}`);
});
