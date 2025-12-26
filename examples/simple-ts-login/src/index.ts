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

// --- State ---
const SIGNATURE_KEY = 'behavioral_signature_vector';
const TOLERANCE = { // Tolerances for each metric
    typingDelay: 40, // ms
    keyDuration: 25, // ms
    mouseVelocity: 150 // pixels/sec
};
let wasmInitialized = false;
let scriptLoadPromise: Promise<void> | null = null;

// Data collection objects with explicit types
let enrollMetrics = { delays: [] as number[], durations: [] as number[], velocities: [] as number[], lastKeyTime: 0 };
let verifyMetrics = { delays: [] as number[], durations: [] as number[], velocities: [] as number[], lastKeyTime: 0 };
let keydownTime = 0;
let lastMousePoint = { x: 0, y: 0, time: 0 };

// --- 3D Scene (Omitted for brevity, same as before) ---
let scene: any, camera: any, renderer: any, particles: any;
function init3DBackground() { /* ... */ }
function animate() { /* ... */ }


// --- Core Logic ---

/**
 * Hashes a string using the SHA-256 algorithm.
 */
async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculates the average of an array of numbers.
 */
function calculateAverage(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
}

/**
 * Calculates the behavioral vector from collected metrics.
 */
function calculateBehavioralVector(metrics: { delays: number[], durations: number[], velocities: number[] }): { typingDelay: number, keyDuration: number, mouseVelocity: number } {
    return {
        typingDelay: calculateAverage(metrics.delays),
        keyDuration: calculateAverage(metrics.durations),
        mouseVelocity: calculateAverage(metrics.velocities)
    };
}

function showPage(pageId: 'enroll-page' | 'verify-page') {
    allPages.forEach(page => {
        page.style.display = page.id === pageId ? 'block' : 'none';
    });
}

function updateVerifyStatus(message: string) {
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

    const vector = calculateBehavioralVector(enrollMetrics);
    if (vector.typingDelay === 0 || vector.keyDuration === 0) {
        enrollStatus.textContent = 'Please type the phrase naturally to capture your rhythm.';
        return;
    }

    enrollStatus.textContent = 'Generating signature hash...';
    const hash = await hashString(passphrase);
    
    const signature = { hash, vector };
    localStorage.setItem(SIGNATURE_KEY, JSON.stringify(signature));
    
    enrollStatus.textContent = 'Enrollment Successful!';
    enrollMetrics = { delays: [], durations: [], velocities: [], lastKeyTime: 0 }; // Reset metrics

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
        verifyMetrics = { delays: [], durations: [], velocities: [], lastKeyTime: 0 };
        return;
    }

    updateVerifyStatus('Passphrase correct. Verifying behavioral pattern...');
    
    const currentVector = calculateBehavioralVector(verifyMetrics);
    
    const delayDiff = Math.abs(currentVector.typingDelay - storedSignature.vector.typingDelay);
    const durationDiff = Math.abs(currentVector.keyDuration - storedSignature.vector.keyDuration);
    const velocityDiff = Math.abs(currentVector.mouseVelocity - storedSignature.vector.mouseVelocity);

    if (delayDiff > TOLERANCE.typingDelay) {
        updateVerifyStatus(`Recognition Failed: Typing rhythm anomaly. (Delta: ${delayDiff.toFixed(0)}ms)`);
        verifyButton.disabled = false;
        verifyMetrics = { delays: [], durations: [], velocities: [], lastKeyTime: 0 };
        return;
    }
    if (durationDiff > TOLERANCE.keyDuration) {
        updateVerifyStatus(`Recognition Failed: Key press duration anomaly. (Delta: ${durationDiff.toFixed(0)}ms)`);
        verifyButton.disabled = false;
        verifyMetrics = { delays: [], durations: [], velocities: [], lastKeyTime: 0 };
        return;
    }
    if (storedSignature.vector.mouseVelocity > 0 && velocityDiff > TOLERANCE.mouseVelocity) {
        updateVerifyStatus(`Recognition Failed: Mouse movement anomaly. (Delta: ${velocityDiff.toFixed(0)}px/s)`);
        verifyButton.disabled = false;
        verifyMetrics = { delays: [], durations: [], velocities: [], lastKeyTime: 0 };
        return;
    }

    updateVerifyStatus('Behavioral pattern matched. Initializing module...');

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
        updateVerifyStatus('Generating proof...');

        const encoder = new TextEncoder();
        const privateInput = encoder.encode(passphrase);
        const publicInput = encoder.encode(`challenge_${Date.now()}`);
        
        const proof = wasm_bindgen.generate_zkp(privateInput, publicInput);
        
        updateVerifyStatus(`Proof Generated: [${proof.slice(0, 40)}...]`);
        
    } catch (error: any) {
        updateVerifyStatus(`Error: ${error.message}`);
    } finally {
        verifyButton.disabled = false;
        verifyMetrics = { delays: [], durations: [], velocities: [], lastKeyTime: 0 };
    }
}

function handleGoToEnroll() {
    localStorage.removeItem(SIGNATURE_KEY);
    enrollPassphraseInput.value = '';
    enrollStatus.textContent = '';
    showPage('enroll-page');
}

// --- Event Listeners for Data Collection ---
const mouseMoveHandler = (e: MouseEvent) => {
    const now = Date.now();
    if (lastMousePoint.time === 0) {
        lastMousePoint = { x: e.clientX, y: e.clientY, time: now };
        return;
    }
    const timeDelta = now - lastMousePoint.time;
    if (timeDelta > 20) {
        const dx = e.clientX - lastMousePoint.x;
        const dy = e.clientY - lastMousePoint.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        const velocity = distance / (timeDelta / 1000);
        
        const currentMetrics = enrollPage.style.display === 'block' ? enrollMetrics : verifyMetrics;
        currentMetrics.velocities.push(velocity);

        lastMousePoint = { x: e.clientX, y: e.clientY, time: now };
    }
};

const keydownHandler = (e: KeyboardEvent) => {
    const currentMetrics = e.target === enrollPassphraseInput ? enrollMetrics : verifyMetrics;
    // Reset metrics on the first keypress of a new attempt
    if (currentMetrics.durations.length === 0 && currentMetrics.delays.length === 0) {
        currentMetrics.velocities = [];
        lastMousePoint = { x: 0, y: 0, time: 0 };
        document.addEventListener('mousemove', mouseMoveHandler);
    }
    keydownTime = Date.now();
};

const keyupHandler = (e: KeyboardEvent) => {
    const currentMetrics = e.target === enrollPassphraseInput ? enrollMetrics : verifyMetrics;
    if (keydownTime !== 0) {
        const now = Date.now();
        const duration = now - keydownTime;
        currentMetrics.durations.push(duration);
        
        if (currentMetrics.lastKeyTime !== 0) {
            const delay = now - currentMetrics.lastKeyTime;
            currentMetrics.delays.push(delay);
        }
        currentMetrics.lastKeyTime = now;
    }
    keydownTime = 0;
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
    enrollButton.addEventListener('click', () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        handleEnrollment();
    });
    verifyButton.addEventListener('click', () => {
        document.removeEventListener('mousemove', mouseMoveHandler);
        performVerification();
    });
    goToVerifyButton.addEventListener('click', () => showPage('verify-page'));
    goToEnrollButton.addEventListener('click', handleGoToEnroll);
    
    enrollPassphraseInput.addEventListener('keydown', keydownHandler);
    enrollPassphraseInput.addEventListener('keyup', keyupHandler);
    verifyPassphraseInput.addEventListener('keydown', keydownHandler);
    verifyPassphraseInput.addEventListener('keyup', keyupHandler);

    // Initial page load logic
    if (localStorage.getItem(SIGNATURE_KEY)) {
        showPage('verify-page');
    } else {
        showPage('enroll-page');
    }
});
