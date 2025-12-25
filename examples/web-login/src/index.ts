import { NeuralHandshakeClient } from '@neuralkey/sdk-core';
import { TrustScoreModel } from '@neuralkey/behavioral-engine';
import * as zkp from '@neuralkey/zkp-prover';

// --- DOM Elements ---
const statusEl = document.getElementById('status')!;
const loginButton = document.getElementById('login-button')!;
const scoreBar = document.getElementById('score-bar')!;
const inputEl = document.querySelector('input')!;

// --- Main Application Logic ---

async function main() {
    // 1. Initialize the WebAssembly Module
    statusEl.textContent = 'Status: Initializing WASM module...';
    // the wasm package is imported as a namespace; call its initializer if present
    if (typeof (zkp as any).default === 'function') {
        await (zkp as any).default();
    } else if (typeof (zkp as any).init === 'function') {
        await (zkp as any).init();
    } else {
        // no-op if no initializer is available
    }
    statusEl.textContent = 'Status: WASM Initialized.';
    console.log('WASM Module Initialized.');

    // 2. Initialize the Behavioral Engine
    const trustModel = new TrustScoreModel();
    console.log('TrustScoreModel Initialized.');
    statusEl.textContent = 'Status: Model initialized. Move mouse or type.';

    // 3. Attach event listeners to feed the model
    document.addEventListener('mousemove', (e) => {
        trustModel.update({
            type: 'mouse',
            timestamp: e.timeStamp,
            data: { x: e.clientX, y: e.clientY, dx: e.movementX, dy: e.movementY }
        });
    });

    inputEl.addEventListener('keydown', (e) => {
        trustModel.update({
            type: 'key',
            timestamp: e.timeStamp,
            data: { key: e.key, direction: 'down' }
        });
    });

    inputEl.addEventListener('keyup', (e) => {
        trustModel.update({
            type: 'key',
            timestamp: e.timeStamp,
            data: { key: e.key, direction: 'up' }
        });
    });

    // 4. Periodically update the UI with the live trust score
    setInterval(() => {
        const score = trustModel.getScore();
        scoreBar.style.width = `${score * 100}%`;
    }, 200);

    // 5. Handle the login button click
    loginButton.addEventListener('click', async () => {
        try {
            statusEl.textContent = 'Status: Initializing NeuralHandshakeClient...';
            const client = await NeuralHandshakeClient.create();
            
            statusEl.textContent = 'Status: Requesting verification...';
            const challenge = `login-attempt-${Date.now()}`;
            const zkp = await client.requestVerification(challenge);

            statusEl.textContent = 'Status: Sending proof to server for verification...';

            const response = await fetch('http://localhost:3000/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ proof: zkp, challenge: challenge }),
            });

            const result = await response.json();

            if (result.verified) {
                console.log('Verification successful:', result);
                statusEl.textContent = `Status: Login Verified!`;
            } else {
                console.error('Verification failed:', result);
                statusEl.textContent = `Status: Login Failed!`;
            }

        } catch (error) {
            console.error('Login failed:', error);
            statusEl.textContent = `Status: Error! See console for details.`;
        }
    });
}

main().catch(console.error);
