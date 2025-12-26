// Declare globals from CDN scripts
declare const wasm_bindgen: any;
declare const THREE: any;

// --- DOM Elements ---
const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
const enrollPage = document.getElementById('enroll-page') as HTMLDivElement;
const verifyPage = document.getElementById('verify-page') as HTMLDivElement;
const allPages = [enrollPage, verifyPage];
const enrollPassphraseInput = document.getElementById('enrollPassphrase') as HTMLInputElement;
const enrollButton = document.getElementById('enrollButton') as HTMLButtonElement;
const enrollStatus = document.getElementById('enroll-status') as HTMLDivElement;
const goToVerifyButton = document.getElementById('goToVerifyButton') as HTMLButtonElement;
const verifyPassphraseInput = document.getElementById('verifyPassphrase') as HTMLInputElement;
const verifyButton = document.getElementById('verifyButton') as HTMLButtonElement;
const statusText = document.getElementById('status-text') as HTMLDivElement;
const goToEnrollButton = document.getElementById('goToEnrollButton') as HTMLButtonElement;
const confidenceBar = document.getElementById('confidence-bar') as HTMLDivElement;
const confidenceText = document.getElementById('confidence-text') as HTMLDivElement;

// --- State ---
const SIGNATURE_KEY = 'behavioral_signature_vector';
const CONFIDENCE_THRESHOLD = 75;
const MAX_CONFIDENCE = 100;
const SCORE_INCREASE = 2;
const SCORE_DECREASE = 1;
const TOLERANCE = { typingDelay: 50, keyDuration: 30 };

let wasmInitialized = false;
let scriptLoadPromise: Promise<void> | null = null;
let confidenceScore = 0;

// Data collection state
let keydownTime = 0;
let lastKeyTime = 0;
let enrollMetrics = { delays: [] as number[], durations: [] as number[] };

// --- 3D Scene (Omitted for brevity) ---
let scene: any, camera: any, renderer: any, particles: any;
function init3DBackground() { /* ... */ }
function animate() { /* ... */ }


// --- Core Logic ---

async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function showPage(pageId: 'enroll-page' | 'verify-page') {
    // Detach all global listeners when switching pages
    document.removeEventListener('keydown', continuousKeydownHandler);
    document.removeEventListener('keyup', continuousKeyupHandler);

    if (pageId === 'verify-page') {
        resetConfidence();
        // Attach listeners for continuous authentication
        document.addEventListener('keydown', continuousKeydownHandler);
        document.addEventListener('keyup', continuousKeyupHandler);
    }
    allPages.forEach(page => {
        page.style.display = page.id === pageId ? 'block' : 'none';
    });
}

function updateVerifyStatus(message: string) {
    statusText.textContent = message;
}

function updateConfidenceUI() {
    confidenceScore = Math.max(0, Math.min(MAX_CONFIDENCE, confidenceScore));
    confidenceBar.style.width = `${confidenceScore}%`;
    confidenceText.textContent = `Confidence: ${confidenceScore.toFixed(0)}%`;

    if (confidenceScore >= CONFIDENCE_THRESHOLD) {
        verifyButton.disabled = false;
        confidenceBar.style.backgroundColor = 'var(--glow-color)';
    } else {
        verifyButton.disabled = true;
        confidenceBar.style.backgroundColor = 'var(--error-color)';
    }
}

function resetConfidence() {
    confidenceScore = 0;
    updateConfidenceUI();
    updateVerifyStatus('Awaiting user behavior...');
}

async function handleEnrollment() {
    const passphrase = enrollPassphraseInput.value;
    if (passphrase.length < 8) {
        enrollStatus.textContent = 'Passphrase must be at least 8 characters.';
        return;
    }

    const vector = {
        typingDelay: calculateAverage(enrollMetrics.delays),
        keyDuration: calculateAverage(enrollMetrics.durations),
    };

    if (vector.typingDelay === 0 || vector.keyDuration === 0) {
        enrollStatus.textContent = 'Could not capture a clear pattern. Please type the phrase again.';
        return;
    }

    enrollStatus.textContent = 'Generating signature hash...';
    const hash = await hashString(passphrase);
    
    localStorage.setItem(SIGNATURE_KEY, JSON.stringify({ hash, vector }));
    
    enrollStatus.textContent = 'Enrollment Successful!';
    enrollMetrics = { delays: [], durations: [] }; // Reset metrics

    setTimeout(() => {
        showPage('verify-page');
        verifyPassphraseInput.value = '';
    }, 1000);
}

async function performVerification() {
    verifyButton.disabled = true;
    updateVerifyStatus('Finalizing verification...');

    const passphrase = verifyPassphraseInput.value;
    const storedSignatureJSON = localStorage.getItem(SIGNATURE_KEY);
    if (!storedSignatureJSON) { // Should not happen if button is enabled, but good practice
        resetConfidence();
        return;
    }
    const storedSignature = JSON.parse(storedSignatureJSON);
    const currentHash = await hashString(passphrase);

    if (currentHash !== storedSignature.hash) {
        updateVerifyStatus('Final Check Failed: Passphrase is incorrect.');
        resetConfidence();
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
    } catch (error: any) {
        updateVerifyStatus(`Error: ${error.message}`);
    }
}

function handleGoToEnroll() {
    localStorage.removeItem(SIGNATURE_KEY);
    enrollPassphraseInput.value = '';
    enrollStatus.textContent = '';
    showPage('enroll-page');
}

// --- Continuous Authentication Handlers ---
const continuousKeydownHandler = (e: KeyboardEvent) => {
    // We don't want to measure typing in the main passphrase box as behavior
    if (e.target === verifyPassphraseInput) return;
    keydownTime = Date.now();
};

const continuousKeyupHandler = (e: KeyboardEvent) => {
    if (e.target === verifyPassphraseInput) return;

    const storedSignature = JSON.parse(localStorage.getItem(SIGNATURE_KEY) || '{}');
    if (!storedSignature.vector || keydownTime === 0) return;

    const duration = Date.now() - keydownTime;
    const durationDiff = Math.abs(duration - storedSignature.vector.keyDuration);
    confidenceScore += (durationDiff < TOLERANCE.keyDuration) ? SCORE_INCREASE : -SCORE_DECREASE;

    if (lastKeyTime !== 0) {
        const delay = Date.now() - lastKeyTime;
        const delayDiff = Math.abs(delay - storedSignature.vector.typingDelay);
        confidenceScore += (delayDiff < TOLERANCE.typingDelay) ? SCORE_INCREASE : -SCORE_DECREASE;
    }
    lastKeyTime = Date.now();
    updateConfidenceUI();
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
    enrollPassphraseInput.addEventListener('keydown', () => {
        keydownTime = Date.now();
        // Reset on new typing session
        if (enrollMetrics.delays.length > 10) {
            enrollMetrics = { delays: [], durations: [] };
        }
    });
    enrollPassphraseInput.addEventListener('keyup', () => {
        if (keydownTime !== 0) {
            enrollMetrics.durations.push(Date.now() - keydownTime);
            if (lastKeyTime !== 0) {
                enrollMetrics.delays.push(Date.now() - lastKeyTime);
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
    } else {
        showPage('enroll-page');
    }
});
