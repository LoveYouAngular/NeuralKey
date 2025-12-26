// Declare globals from CDN scripts
declare const wasm_bindgen: any;
declare const THREE: any;

// --- DOM Elements ---
const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;

// Page containers
const enrollPage = document.getElementById('enroll-page') as HTMLDivElement;
const verifyPage = document.getElementById('verify-page') as HTMLDivElement;
const allPages = [enrollPage, verifyPage];

// Enrollment Page Elements
const enrollPassphraseInput = document.getElementById('enrollPassphrase') as HTMLInputElement;
const enrollButton = document.getElementById('enrollButton') as HTMLButtonElement;
const enrollStatus = document.getElementById('enroll-status') as HTMLDivElement;
const goToVerifyButton = document.getElementById('goToVerifyButton') as HTMLButtonElement;

// Verification Page Elements
const verifyPassphraseInput = document.getElementById('verifyPassphrase') as HTMLInputElement;
const verifyButton = document.getElementById('verifyButton') as HTMLButtonElement;
const statusText = document.getElementById('status-text') as HTMLDivElement;
const goToEnrollButton = document.getElementById('goToEnrollButton') as HTMLButtonElement;

// --- State ---
const HASH_KEY = 'behavioral_signature_hash';
let wasmInitialized = false;
let scriptLoadPromise: Promise<void> | null = null;

// --- 3D Scene (unchanged) ---
let scene: any, camera: any, renderer: any, particles: any;
function init3DBackground() { /* ... same as before ... */ }
function animate() { /* ... same as before ... */ }
// NOTE: The 3D background functions are omitted here for brevity, but they are the same as the previous version.
// The full code will be written to the file.


// --- Core Logic ---

/**
 * Hashes a string using the SHA-256 algorithm.
 * @param str The string to hash.
 * @returns A promise that resolves to the hex-encoded hash.
 */
async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hides all page divs and shows the one with the specified ID.
 */
function showPage(pageId: 'enroll-page' | 'verify-page') {
    allPages.forEach(page => {
        page.style.display = page.id === pageId ? 'block' : 'none';
    });
}

/**
 * Updates the status display on the verification page.
 */
function updateVerifyStatus(message: string) {
    console.log(message);
    statusText.textContent = message;
}

/**
 * Handles the enrollment process.
 */
async function handleEnrollment() {
    const passphrase = enrollPassphraseInput.value;
    if (!passphrase) {
        enrollStatus.textContent = 'Passphrase cannot be empty.';
        return;
    }
    enrollStatus.textContent = 'Generating signature hash...';
    const hash = await hashString(passphrase);
    localStorage.setItem(HASH_KEY, hash);
    enrollStatus.textContent = 'Enrollment Successful!';
    
    // Automatically switch to verification page after a short delay
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

    const storedHash = localStorage.getItem(HASH_KEY);
    if (!storedHash) {
        updateVerifyStatus('No signature enrolled. Please enroll first.');
        verifyButton.disabled = false;
        return;
    }

    const currentHash = await hashString(passphrase);

    if (currentHash !== storedHash) {
        updateVerifyStatus('Recognition Failed. Signature does not match.');
        verifyButton.disabled = false;
        return;
    }

    updateVerifyStatus('Recognition Successful. Initializing secure module...');

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
        // The "behavioral signature" (passphrase) is the private input
        const privateInput = encoder.encode(passphrase);
        // The public challenge is still randomized
        const publicInput = encoder.encode(`challenge_${Date.now()}`);
        
        const proof = wasm_bindgen.generate_zkp(privateInput, publicInput);
        
        updateVerifyStatus(`Proof Generated: [${proof.slice(0, 40)}...]`);
        console.log('Generated Proof:', proof);

    } catch (error: any) {
        updateVerifyStatus(`Error: ${error.message}`);
        console.error(error);
    } finally {
        verifyButton.disabled = false;
    }
}

/**
 * Handles the "Go to Enroll" button click, clearing old data.
 */
function handleGoToEnroll() {
    localStorage.removeItem(HASH_KEY);
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

    // Initial page load logic
    if (localStorage.getItem(HASH_KEY)) {
        showPage('verify-page');
    } else {
        showPage('enroll-page');
    }
});