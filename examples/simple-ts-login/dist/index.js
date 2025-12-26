"use strict";
// --- DOM Elements ---
const loginButton = document.getElementById('loginButton');
const statusText = document.getElementById('status-text');
const canvas = document.getElementById('bg-canvas');
const authButton = document.getElementById('authButton');
const unauthButton = document.getElementById('unauthButton');
// --- WASM State ---
let wasmInitialized = false;
let scriptLoadPromise = null;
// --- 3D Scene State ---
let scene, camera, renderer, particles;
/**
 * Initializes the three.js 3D animated background.
 */
function init3DBackground() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 300;
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const color = new THREE.Color();
    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        color.setHSL(0.5 + 0.2 * Math.random(), 0.7, 0.5 + 0.2 * Math.random());
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
    });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    animate();
}
/**
 * The animation loop for the 3D background.
 */
function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.0001;
    particles.rotation.x = time;
    particles.rotation.y = time;
    renderer.render(scene, camera);
}
/**
 * Updates the status display on the page.
 */
function updateStatus(message) {
    console.log(message);
    statusText.textContent = message;
}
/**
 * Dynamically loads the /assets/zkp_prover.js script.
 */
function loadWasmScript() {
    if (scriptLoadPromise)
        return scriptLoadPromise;
    scriptLoadPromise = new Promise((resolve, reject) => {
        updateStatus('Loading secure module...');
        const script = document.createElement('script');
        script.src = 'assets/zkp_prover.js';
        script.async = true;
        script.onload = () => {
            updateStatus('Secure module loaded.');
            resolve();
        };
        script.onerror = (err) => reject(new Error(`Module load error: ${err.toString()}`));
        document.head.appendChild(script);
    });
    return scriptLoadPromise;
}
/**
 * The main proof generation function.
 */
async function performLogin() {
    loginButton.disabled = true;
    updateStatus('Initiating...');
    // ** AUTHORIZATION CHECK **
    if (localStorage.getItem('isAuthorized') !== 'true') {
        updateStatus('Error: User is unauthorized.');
        loginButton.disabled = false;
        return;
    }
    try {
        await loadWasmScript();
        if (!wasmInitialized) {
            updateStatus('Initializing WASM...');
            await wasm_bindgen('assets/zkp_prover_bg.wasm');
            wasmInitialized = true;
        }
        updateStatus('Generating proof...');
        const encoder = new TextEncoder();
        const privateInput = encoder.encode('user_private_secret_key');
        const publicInput = encoder.encode(`challenge_${Date.now()}_${Math.random()}`);
        const proof = wasm_bindgen.generate_zkp(privateInput, publicInput);
        updateStatus(`Proof Generated: [${proof.slice(0, 30)}...]`);
        console.log('Generated Proof:', proof);
    }
    catch (error) {
        updateStatus(`Error: ${error.message}`);
        console.error(error);
    }
    finally {
        loginButton.disabled = false;
    }
}
/**
 * Simulates a user logging in and gaining authorization.
 */
function simulateLogin() {
    localStorage.setItem('isAuthorized', 'true');
    updateStatus('Authorization token set. Ready to generate proof.');
}
/**
 * Simulates a user logging out and losing authorization.
 */
function simulateLogout() {
    localStorage.removeItem('isAuthorized');
    updateStatus('Authorization token cleared. Proof generation will be denied.');
}
// --- Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    init3DBackground();
    if (loginButton)
        loginButton.addEventListener('click', performLogin);
    if (authButton)
        authButton.addEventListener('click', simulateLogin);
    if (unauthButton)
        unauthButton.addEventListener('click', simulateLogout);
    // Set initial status based on auth state
    if (localStorage.getItem('isAuthorized') === 'true') {
        updateStatus('User is authorized. Awaiting command...');
    }
    else {
        updateStatus('User is unauthorized. Please simulate login.');
    }
});
