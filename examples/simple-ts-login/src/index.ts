// Declare globals from CDN scripts
declare const wasm_bindgen: any;
declare const THREE: any;

// --- DOM Elements ---
const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;

// Page containers
const loginPage = document.getElementById('login-page') as HTMLDivElement;
const dashboardPage = document.getElementById('dashboard-page') as HTMLDivElement;
const unauthorizedPage = document.getElementById('unauthorized-page') as HTMLDivElement;
const allPages = [loginPage, dashboardPage, unauthorizedPage];

// Buttons
const loginButton = document.getElementById('loginButton') as HTMLButtonElement;
const proofButton = document.getElementById('proofButton') as HTMLButtonElement;
const logoutButton = document.getElementById('logoutButton') as HTMLButtonElement;
const returnButton = document.getElementById('returnButton') as HTMLButtonElement;

// Status display
const statusText = document.getElementById('status-text') as HTMLDivElement;


// --- State ---
let wasmInitialized = false;
let scriptLoadPromise: Promise<void> | null = null;

// --- 3D Scene State ---
let scene: any, camera: any, renderer: any, particles: any;

/**
 * Hides all page divs and shows the one with the specified ID.
 * @param pageId The ID of the page to show.
 */
function showPage(pageId: 'login-page' | 'dashboard-page' | 'unauthorized-page') {
    allPages.forEach(page => {
        page.style.display = page.id === pageId ? 'block' : 'none';
    });
}

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
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        size: 1.5,
        color: 0x00ffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.7,
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
    particles.rotation.y = time;
    renderer.render(scene, camera);
}

/**
 * Updates the status display on the dashboard page.
 */
function updateStatus(message: string) {
    console.log(message);
    statusText.textContent = message;
}

/**
 * Dynamically loads the /assets/zkp_prover.js script.
 */
function loadWasmScript(): Promise<void> {
    if (scriptLoadPromise) return scriptLoadPromise;
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
 * The main proof generation function, called from the dashboard.
 */
async function performProofGeneration() {
    proofButton.disabled = true;
    updateStatus('Initiating...');

    if (localStorage.getItem('isAuthorized') !== 'true') {
        showPage('unauthorized-page');
        proofButton.disabled = false;
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
        
        updateStatus(`Proof Generated: [${proof.slice(0, 40)}...]`);
        console.log('Generated Proof:', proof);

    } catch (error: any) {
        updateStatus(`Error: ${error.message}`);
        console.error(error);
    } finally {
        proofButton.disabled = false;
    }
}

// --- Event Handlers ---
function handleLogin() {
    localStorage.setItem('isAuthorized', 'true');
    showPage('dashboard-page');
    updateStatus('Awaiting command...');
}

function handleLogout() {
    localStorage.removeItem('isAuthorized');
    showPage('login-page');
}

// --- Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    init3DBackground();
    
    // Attach event listeners
    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);
    proofButton.addEventListener('click', performProofGeneration);
    returnButton.addEventListener('click', handleLogout); // Return button logs user out

    // Initial page load logic
    if (localStorage.getItem('isAuthorized') === 'true') {
        showPage('dashboard-page');
    } else {
        showPage('login-page');
    }
});
