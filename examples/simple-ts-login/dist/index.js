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
const similarityBar = document.getElementById('similarity-bar');
const similarityText = document.getElementById('similarity-text');
// --- State ---
const SIGNATURE_KEY = 'behavioral_profile';
const SIMILARITY_THRESHOLD = 70; // User must have a 70% pattern match
const MAX_SIMILARITY = 100;
const SAMPLE_SIZE = 15; // Analyze the last 15 keystrokes
let wasmInitialized = false;
let scriptLoadPromise = null;
let similarityScore = 0;
// Data collection state
let keydownTime = 0;
let lastKeyTime = 0;
let recentDelays = [];
let recentDurations = [];
// --- 3D Scene (Omitted for brevity) ---
let scene, camera, renderer, particles;
function init3DBackground() { }
function animate() { }
// --- Core Logic ---
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Calculates the average and standard deviation of an array.
 */
function calculateStats(arr) {
    if (arr.length === 0)
        return { avg: 0, std: 0 };
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(arr.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / arr.length);
    return { avg, std };
}
function showPage(pageId) {
    document.removeEventListener('keyup', continuousKeyupHandler);
    if (pageId === 'verify-page') {
        resetSimilarity();
        document.addEventListener('keyup', continuousKeyupHandler);
    }
    allPages.forEach(page => {
        page.style.display = page.id === pageId ? 'block' : 'none';
    });
}
function updateVerifyStatus(message) {
    statusText.textContent = message;
}
function updateSimilarityUI() {
    similarityScore = Math.max(0, Math.min(MAX_SIMILARITY, similarityScore));
    similarityBar.style.width = `${similarityScore}%`;
    similarityText.textContent = `Similarity: ${similarityScore.toFixed(0)}%`;
    if (similarityScore >= SIMILARITY_THRESHOLD) {
        verifyButton.disabled = false;
        similarityBar.style.backgroundColor = 'var(--glow-color)';
    }
    else {
        verifyButton.disabled = true;
        similarityBar.style.backgroundColor = 'var(--error-color)';
    }
}
function resetSimilarity() {
    similarityScore = 0;
    recentDelays = [];
    recentDurations = [];
    lastKeyTime = 0;
    updateSimilarityUI();
    updateVerifyStatus('Awaiting behavioral analysis...');
}
async function handleEnrollment() {
    const passphrase = enrollPassphraseInput.value;
    if (passphrase.length < 8) {
        enrollStatus.textContent = 'Passphrase must be at least 8 characters.';
        return;
    }
    // Use the currently typed data for enrollment
    const pattern = {
        delay: calculateStats(recentDelays),
        duration: calculateStats(recentDurations),
    };
    if (pattern.delay.avg === 0 || pattern.duration.avg === 0) {
        enrollStatus.textContent = 'Could not capture a clear pattern. Please type the phrase again.';
        return;
    }
    enrollStatus.textContent = 'Generating profile hash...';
    const hash = await hashString(passphrase);
    localStorage.setItem(SIGNATURE_KEY, JSON.stringify({ hash, pattern }));
    enrollStatus.textContent = 'Enrollment Successful!';
    recentDelays = [];
    recentDurations = [];
    setTimeout(() => {
        showPage('verify-page');
        verifyPassphraseInput.value = '';
    }, 1000);
}
async function performVerification() {
    verifyButton.disabled = true;
    updateVerifyStatus('Finalizing verification...');
    const passphrase = verifyPassphraseInput.value;
    const storedProfileJSON = localStorage.getItem(SIGNATURE_KEY);
    if (!storedProfileJSON) {
        resetSimilarity();
        return;
    }
    const storedProfile = JSON.parse(storedProfileJSON);
    const currentHash = await hashString(passphrase);
    if (currentHash !== storedProfile.hash) {
        updateVerifyStatus('Final Check Failed: Passphrase is incorrect.');
        resetSimilarity();
        return;
    }
    updateVerifyStatus('Passphrase correct. Generating proof...');
    try {
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
        const encoder = new TextEncoder();
        const proof = wasm_bindgen.generate_zkp(encoder.encode(passphrase), encoder.encode(`challenge_${Date.now()}`));
        updateVerifyStatus(`Proof Generated: [${proof.slice(0, 40)}...]`);
    }
    catch (error) {
        updateVerifyStatus(`Error: ${error.message}`);
    }
}
function handleGoToEnroll() {
    localStorage.removeItem(SIGNATURE_KEY);
    enrollPassphraseInput.value = '';
    enrollStatus.textContent = '';
    showPage('enroll-page');
}
// --- Continuous Authentication Handler ---
const continuousKeyupHandler = (e) => {
    const now = Date.now();
    if (keydownTime !== 0) {
        const duration = now - keydownTime;
        recentDurations.push(duration);
        if (recentDurations.length > SAMPLE_SIZE)
            recentDurations.shift();
    }
    if (lastKeyTime !== 0) {
        const delay = now - lastKeyTime;
        recentDelays.push(delay);
        if (recentDelays.length > SAMPLE_SIZE)
            recentDelays.shift();
    }
    lastKeyTime = now;
    // Don't start scoring until we have a decent sample size
    if (recentDelays.length < 5)
        return;
    const storedProfile = JSON.parse(localStorage.getItem(SIGNATURE_KEY) || '{}');
    if (!storedProfile.pattern)
        return;
    const currentStats = {
        delay: calculateStats(recentDelays),
        duration: calculateStats(recentDurations),
    };
    // Calculate similarity for each metric (0-100 scale)
    // 100% if perfect match, decreases as the difference grows
    const delayAvgSimilarity = Math.max(0, 100 - (Math.abs(storedProfile.pattern.delay.avg - currentStats.delay.avg) / storedProfile.pattern.delay.avg) * 100);
    const delayStdSimilarity = Math.max(0, 100 - (Math.abs(storedProfile.pattern.delay.std - currentStats.delay.std) / storedProfile.pattern.delay.std) * 100);
    const durationAvgSimilarity = Math.max(0, 100 - (Math.abs(storedProfile.pattern.duration.avg - currentStats.duration.avg) / storedProfile.pattern.duration.avg) * 100);
    const durationStdSimilarity = Math.max(0, 100 - (Math.abs(storedProfile.pattern.duration.std - currentStats.duration.std) / storedProfile.pattern.duration.std) * 100);
    // Weighted average of similarities
    similarityScore = (delayAvgSimilarity * 0.4) + (delayStdSimilarity * 0.1) + (durationAvgSimilarity * 0.4) + (durationStdSimilarity * 0.1);
    updateSimilarityUI();
};
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
    // Attach event listeners for enrollment typing
    enrollPassphraseInput.addEventListener('keydown', () => { keydownTime = Date.now(); });
    enrollPassphraseInput.addEventListener('keyup', () => {
        if (keydownTime !== 0) {
            recentDurations.push(Date.now() - keydownTime);
            if (lastKeyTime !== 0) {
                recentDelays.push(Date.now() - lastKeyTime);
            }
            lastKeyTime = Date.now();
        }
    });
    // Attach navigation/action buttons
    enrollButton.addEventListener('click', handleEnrollment);
    verifyButton.addEventListener('click', performVerification);
    goToVerifyButton.addEventListener('click', () => showPage('verify-page'));
    goToEnrollButton.addEventListener('click', handleGoToEnroll);
    // Initial page load logic
    if (localStorage.getItem(SIGNATURE_KEY)) {
        showPage('verify-page');
    }
    else {
        showPage('enroll-page');
    }
});
