import { HDNodeWallet, Mnemonic } from 'ethers';
// Flag to ensure Wasm is initialized only once
let wasmInitialized = false;
/**
 * Implements the NeuralClient interface for client-side operations.
 */
export class NeuralHandshakeClient {
    constructor(wallet) {
        this.wallet = wallet;
    }
    static async create() {
        // Initialize WASM module if not already initialized
        if (!wasmInitialized) {
            // Manually fetch and initialize the Wasm module
            const wasmPath = '/assets/zkp_prover_bg.wasm'; // Path where angular.json copies the wasm
            const wasmBytes = await fetch(wasmPath).then(res => res.arrayBuffer());
            await wasm_bindgen(wasmBytes);
            wasmInitialized = true;
        }
        const phrase = globalThis.localStorage.getItem("NEURAL_KEY_MNEMONIC");
        if (phrase) {
            try {
                const mnemonic = Mnemonic.fromPhrase(phrase);
                const wallet = HDNodeWallet.fromMnemonic(mnemonic);
                return new NeuralHandshakeClient(wallet);
            }
            catch (error) {
                // The stored mnemonic is invalid, so we clear it.
                globalThis.localStorage.removeItem("NEURAL_KEY_MNEMONIC");
            }
        }
        // If there was no phrase or it was invalid, create a new wallet.
        const wallet = HDNodeWallet.createRandom();
        if (wallet.mnemonic) {
            globalThis.localStorage.setItem("NEURAL_KEY_MNEMONIC", wallet.mnemonic.phrase);
        }
        return new NeuralHandshakeClient(wallet);
    }
    async requestVerification(challenge) {
        // 1. Sign the challenge to prove ownership of the key.
        const signature = await this.wallet.signMessage(challenge);
        const encoder = new TextEncoder();
        // 2. Generate the Zero-Knowledge Proof using the WASM module.
        const proof = wasm_bindgen.generate_zkp(encoder.encode(signature), encoder.encode(challenge));
        return {
            proof: proof,
            publicSignals: encoder.encode(challenge)
        };
    }
}
export * from './recovery.js';
