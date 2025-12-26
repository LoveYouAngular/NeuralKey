"use strict";
// --- DOM Elements ---
const canvas = document.getElementById('bg-canvas');
const enrollPage = document.getElementById('enroll-page');
const verifyPage = document.getElementById('verify-page');
const allPages = [enrollPage, verifyPage];
const enrollPassphraseInput = document.getElementById('enrollPassphrase');
const enrollButton = document.getElementById('enrollButton');
const enrollStatus = document.getElementById('enroll-status');
const goToVerifyButton = document.getElementById('goToVerifyButton');
const verifyPassphraseInput = document.getElementById('verifyPassphrase');
const verifyButton = document.getElementById('verifyButton');
const statusText = document.getElementById('status-text');
const goToEnrollButton = document.getElementById('goToEnrollButton');
// --- State ---
const SIGNATURE_KEY = 'behavioral_signature';
const DNA_TOLERANCE_MS = 40; // Typing rhythm can be off by this many ms
let wasmInitialized = false;
let scriptLoadPromise = null;
let enrollTimestamps = [];
let verifyTimestamps = [];
// --- 3D Scene (Omitted for brevity, same as before) ---
let scene, camera, renderer, particles;
function init3DBackground() { }
function animate() { }
// --- Core Logic ---
/**
 * Hashes a string using the SHA-256 algorithm.
 */
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Calculates the average delay between timestamps in an array.
 * @param timestamps An array of millisecond timestamps.
 * @returns The average delay in milliseconds.
 */
function calculateTypingDNA(timestamps) {
    if (timestamps.length < 2) {
        return 0;
    }
    const delays = [];
    for (let i = 1; i < timestamps.length; i++) {
        delays.push(timestamps[i] - timestamps[i - 1]);
    }
    const totalDelay = delays.reduce((sum, delay) => sum + delay, 0);
    return totalDelay / delays.length;
}
function showPage(pageId) {
    allPages.forEach(page => {
        page.style.display = page.id === pageId ? 'block' : 'none';
    });
}
function updateVerifyStatus(message) {
    statusText.textContent = message;
}
/**
 * Handles the enrollment process.
 */
async function handleEnrollment() {
    const passphrase = enrollPassphraseInput.value;
    if (passphrase.length < 8) {
        enrollStatus.textContent = 'Passphrase must be at least 8 characters.';
        return;
    }
    const dna = calculateTypingDNA(enrollTimestamps);
    if (dna === 0) {
        enrollStatus.textContent = 'Please type the phrase naturally to capture your rhythm.';
        return;
    }
    enrollStatus.textContent = 'Generating signature hash...';
    const hash = await hashString(passphrase);
    const signature = { hash, dna };
    localStorage.setItem(SIGNATURE_KEY, JSON.stringify(signature));
    enrollStatus.textContent = 'Enrollment Successful!';
    enrollTimestamps = []; // Clear timestamps after use
    setTimeout(() => {
        showPage('verify-page');
        verifyPassphraseInput.value = '';
        updateVerifyStatus('Ready for verification.');
    }, 1000);
}
/**
 * Handles the verification and ZKP generation process.
 */
async function performVerification() {
    const passphrase = verifyPassphraseInput.value;
    if (!passphrase) {
        updateVerifyStatus('Please enter your passphrase to verify.');
        return;
    }
    verifyButton.disabled = true;
    updateVerifyStatus('Analyzing signature...');
    const storedSignatureJSON = localStorage.getItem(SIGNATURE_KEY);
    if (!storedSignatureJSON) {
        updateVerifyStatus('No signature enrolled. Please enroll first.');
        verifyButton.disabled = false;
        return;
    }
    const storedSignature = JSON.parse(storedSignatureJSON);
    const currentHash = await hashString(passphrase);
    if (currentHash !== storedSignature.hash) {
        updateVerifyStatus('Recognition Failed: Passphrase is incorrect.');
        verifyButton.disabled = false;
        verifyTimestamps = []; // Clear timestamps
        return;
    }
    updateVerifyStatus('Passphrase correct. Verifying behavioral pattern...');
    const currentDna = calculateTypingDNA(verifyTimestamps);
    const dnaDifference = Math.abs(currentDna - storedSignature.dna);
    if (dnaDifference > DNA_TOLERANCE_MS) {
        updateVerifyStatus(`Recognition Failed: Behavioral pattern anomaly detected. (Delta: ${dnaDifference.toFixed(0)}ms)`);
        verifyButton.disabled = false;
        verifyTimestamps = []; // Clear timestamps
        return;
    }
    updateVerifyStatus(`Behavioral pattern matched (Delta: ${dnaDifference.toFixed(0)}ms). Initializing module...`);
    try {
        // WASM Loading and Proof Generation
        if (!scriptLoadPromise) {
            scriptLoadPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'assets/zkp_prover.js';
                script.async = true;
                script.onload = () => resolve();
                script.onerror = (err) => reject(new Error(`Module load error: ${err.toString()}`));
                document.head.appendChild(script);
            });
        }
        await scriptLoadPromise;
        if (!wasmInitialized) {
            await wasm_bindgen('assets/zkp_prover_bg.wasm');
            wasmInitialized = true;
        }
        updateVerifyStatus('Generating proof...');
        const encoder = new TextEncoder();
        const privateInput = encoder.encode(passphrase);
        const publicInput = encoder.encode(`challenge_${Date.now()}`);
        const proof = wasm_bindgen.generate_zkp(privateInput, publicInput);
        updateVerifyStatus(`Proof Generated: [${proof.slice(0, 40)}...]`);
    }
    catch (error) {
        updateVerifyStatus(`Error: ${error.message}`);
    }
    finally {
        verifyButton.disabled = false;
        verifyTimestamps = []; // Clear timestamps
    }
}
function handleGoToEnroll() {
    localStorage.removeItem(SIGNATURE_KEY);
    enrollPassphraseInput.value = '';
    enrollStatus.textContent = '';
    showPage('enroll-page');
}
// --- Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    // Full 3D background code included here
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 300;
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    const particleCount = 5000;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ size: 1.5, color: 0x00ffff, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.7 });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    function animate() {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.0001;
        particles.rotation.y = time;
        renderer.render(scene, camera);
    }
    animate();
    // Attach event listeners
    enrollButton.addEventListener('click', handleEnrollment);
    verifyButton.addEventListener('click', performVerification);
    goToVerifyButton.addEventListener('click', () => showPage('verify-page'));
    goToEnrollButton.addEventListener('click', handleGoToEnroll);
    // Listen for typing to clear timestamp arrays and record new ones
    enrollPassphraseInput.addEventListener('keydown', () => { enrollTimestamps = []; });
    enrollPassphraseInput.addEventListener('keyup', () => { enrollTimestamps.push(Date.now()); });
    verifyPassphraseInput.addEventListener('keydown', () => { verifyTimestamps = []; });
    verifyPassphraseInput.addEventListener('keyup', () => { verifyTimestamps.push(Date.now()); });
    // Initial page load logic
    if (localStorage.getItem(SIGNATURE_KEY)) {
        showPage('verify-page');
    }
    else {
        showPage('enroll-page');
    }
});
