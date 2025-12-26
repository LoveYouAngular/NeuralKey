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
const similarityBar = document.getElementById('similarity-bar') as HTMLDivElement;
const similarityText = document.getElementById('similarity-text') as HTMLDivElement;

// --- State ---
const SIGNATURE_KEY = 'behavioral_profile';
const SIMILARITY_THRESHOLD = 70;
const ENROLLMENT_SAMPLE_SIZE = 15;
const VERIFY_SAMPLE_SIZE = 15;

let wasmInitialized = false;
let scriptLoadPromise: Promise<void> | null = null;
let similarityScore = 0;

// Data collection state
let keydownTime = 0;
let lastKeyTime = 0;
let recentDelays: number[] = [];
let recentDurations: number[] = [];

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

function calculateStats(arr: number[]): { avg: number, std: number } {
    if (arr.length < 2) return { avg: 0, std: 0 };
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std = Math.sqrt(arr.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / arr.length);
    return { avg, std };
}

function showPage(pageId: 'enroll-page' | 'verify-page') {
    document.removeEventListener('keyup', continuousKeyupHandler);
    document.removeEventListener('keydown', continuousKeydownHandler);
    enrollPassphraseInput.removeEventListener('keyup', enrollmentKeyupHandler);
    enrollPassphraseInput.removeEventListener('keydown', enrollmentKeydownHandler);

    if (pageId === 'verify-page') {
        resetSimilarity();
        document.addEventListener('keyup', continuousKeyupHandler);
        document.addEventListener('keydown', continuousKeydownHandler);
    } else {
        enrollButton.disabled = true;
        enrollStatus.textContent = '';
        recentDelays = [];
        recentDurations = [];
        enrollPassphraseInput.addEventListener('keyup', enrollmentKeyupHandler);
        enrollPassphraseInput.addEventListener('keydown', enrollmentKeydownHandler);
    }
    allPages.forEach(page => {
        page.style.display = page.id === pageId ? 'block' : 'none';
    });
}

function updateVerifyStatus(message: string) {
    statusText.textContent = message;
}

function updateSimilarityUI() {
    similarityScore = Math.max(0, Math.min(100, similarityScore));
    similarityBar.style.width = `${similarityScore}%`;
    similarityText.textContent = `Similarity: ${similarityScore.toFixed(0)}%`;

    if (similarityScore >= SIMILARITY_THRESHOLD) {
        verifyButton.disabled = false;
        similarityBar.style.backgroundColor = 'var(--glow-color)';
    } else {
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
    const pattern = {
        delay: calculateStats(recentDelays),
        duration: calculateStats(recentDurations),
    };

    if (pattern.delay.avg === 0 || pattern.duration.avg === 0) {
        enrollStatus.textContent = 'Could not capture a clear pattern. Please type the full phrase.';
        return;
    }

    enrollStatus.textContent = 'Generating profile hash...';
    const hash = await hashString(passphrase);
    
    localStorage.setItem(SIGNATURE_KEY, JSON.stringify({ hash, pattern }));
    
    enrollStatus.textContent = 'Enrollment Successful!';
    setTimeout(() => showPage('verify-page'), 1000);
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
    } catch (error: any) {
        updateVerifyStatus(`Error: ${error.message}`);
    }
}

function handleGoToEnroll() {
    localStorage.removeItem(SIGNATURE_KEY);
    enrollPassphraseInput.value = '';
    showPage('enroll-page');
}

// --- Event Handlers ---
const enrollmentKeydownHandler = () => {
    keydownTime = Date.now();
    if (enrollPassphraseInput.value.length < 2) {
        recentDelays = [];
        recentDurations = [];
        lastKeyTime = 0;
    }
};

const enrollmentKeyupHandler = () => {
    if (keydownTime !== 0) {
        const now = Date.now();
        recentDurations.push(now - keydownTime);
        if (lastKeyTime !== 0) {
            recentDelays.push(now - lastKeyTime);
        }
        lastKeyTime = now;

        if (recentDelays.length >= ENROLLMENT_SAMPLE_SIZE) {
            enrollButton.disabled = false;
            enrollStatus.textContent = 'Pattern detected. Ready to enroll.';
        } else {
            enrollStatus.textContent = `Capturing pattern... ${recentDelays.length}/${ENROLLMENT_SAMPLE_SIZE}`;
        }
    }
};

const continuousKeydownHandler = (e: KeyboardEvent) => {
    keydownTime = Date.now();
};

const continuousKeyupHandler = (e: KeyboardEvent) => {
    const now = Date.now();
    if (keydownTime !== 0) {
        const duration = now - keydownTime;
        recentDurations.push(duration);
        if (recentDurations.length > VERIFY_SAMPLE_SIZE) recentDurations.shift();
    }
    if (lastKeyTime !== 0) {
        const delay = now - lastKeyTime;
        recentDelays.push(delay);
        if (recentDelays.length > VERIFY_SAMPLE_SIZE) recentDelays.shift();
    }
    lastKeyTime = now;

    if (recentDelays.length < 5) return;

    const storedProfile = JSON.parse(localStorage.getItem(SIGNATURE_KEY) || '{}');
    if (!storedProfile.pattern || !storedProfile.pattern.delay || !storedProfile.pattern.duration) return;

    const currentStats = {
        delay: calculateStats(recentDelays),
        duration: calculateStats(recentDurations),
    };

    const delayAvgSimilarity = Math.max(0, 100 - (Math.abs(storedProfile.pattern.delay.avg - currentStats.delay.avg) / (storedProfile.pattern.delay.avg || 1)) * 100);
    const delayStdSimilarity = Math.max(0, 100 - (Math.abs(storedProfile.pattern.delay.std - currentStats.delay.std) / (storedProfile.pattern.delay.std || 1)) * 50);
    const durationAvgSimilarity = Math.max(0, 100 - (Math.abs(storedProfile.pattern.duration.avg - currentStats.duration.avg) / (storedProfile.pattern.duration.avg || 1)) * 100);
    const durationStdSimilarity = Math.max(0, 100 - (Math.abs(storedProfile.pattern.duration.std - currentStats.duration.std) / (storedProfile.pattern.duration.std || 1)) * 50);

    similarityScore = (delayAvgSimilarity * 0.45) + (delayStdSimilarity * 0.05) + (durationAvgSimilarity * 0.45) + (durationStdSimilarity * 0.05);

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

    // Attach event listeners
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
