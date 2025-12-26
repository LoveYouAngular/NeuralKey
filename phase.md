# Project Genesis: Development Phases

This document outlines the development phases for Project Genesis, a system designed around the core principle: **"one that does not require a key, but recognizes the owner."**

---

### Phase 0: Ideation & Core Principles

- **Objective:** Define the project's mission and core philosophy.
- **Outcome:** A clear goal to build a proof-of-concept for a keyless authentication system based on behavioral recognition, rather than traditional secrets or tokens.
- **Status:** Complete. This principle guides all development.

---

### Phase 1: Foundational Technology & Proof of Concept

- **Objective:** Overcome the initial technical hurdles of integrating the core cryptographic technology (WASM module) into a web environment.
- **Key Activities:**
    - Debugged complex WASM loading issues within a modern JavaScript framework (Angular).
    - Identified and resolved stale build and caching problems in the monorepo.
    - Created a minimal, stable TypeScript application (`/examples/simple-ts-login`) to serve as a reliable foundation for future development.
- **Outcome:** A stable, working environment where the WASM module can be reliably called from the browser.
- **Status:** Complete.

---

### Phase 2: Basic Simulation - Keyless Recognition

- **Objective:** Create the first functional simulation of the core principle.
- **Key Activities:**
    - Implemented an "Enrollment" and "Verification" flow.
    - Simulated a "behavioral signature" by hashing a user's secret passphrase.
    - Stored only the hash (not the secret itself), representing a keyless system where the application owner does not know the user's secret.
    - Verified the user by comparing a newly entered passphrase hash against the stored one.
- **Outcome:** A working application that demonstrates recognition based on a committed secret without storing the secret itself.
- **Status:** Complete.

---

### Phase 3: Advanced Simulation - Behavioral Biometrics (Current Phase)

- **Objective:** Enhance the simulation to distinguish *how* a user acts from *what* they know.
- **Key Activities:**
    - Implemented a "Typing DNA" feature by measuring the average time delay between keystrokes during passphrase entry.
    - The enrolled signature was expanded to include both the passphrase hash and the "Typing DNA" metric.
    - Verification now performs a two-factor check:
        1. Is the passphrase correct (hash match)?
        2. Is the typing rhythm similar to the enrolled rhythm (DNA match within a tolerance)?
- **Outcome:** A more sophisticated simulation that can reject a user even if they enter the correct passphrase, demonstrating true behavioral recognition.
- **Status:** Complete.

---

### Phase 4: Next Steps - Towards a Realistic Model

- **Objective:** Evolve the simulation to incorporate more complex behavioral data and a more realistic analysis model.
- **Proposed Next Steps:**
    1.  **Expand Data Collection:**
        -   Capture more detailed typing metrics (e.g., time each key is held down, not just the delay between presses).
        -   Incorporate mouse movement data (e.g., velocity, acceleration, click patterns, cursor path).
        -   Add scroll behavior analysis.
    2.  **Develop a "Behavioral Vector":**
        -   Instead of just a single "DNA" number, the enrolled signature will become a "vector" (an array of numbers) representing multiple averaged metrics (e.g., `[avg_typing_delay, avg_key_hold_time, avg_mouse_speed]`).
    3.  **Simulate a "Local AI Model":**
        -   Create a function that simulates a client-side machine learning model.
        -   During verification, this function will take the user's current behavioral vector and compare it to the enrolled vector.
        -   Instead of a simple tolerance check, it will calculate a "similarity score" (e.g., using Euclidean distance between the vectors). The user is recognized only if the score is above a certain threshold.
    4.  **Implement Continuous Authentication:**
        -   Refactor the UI to demonstrate passive, continuous recognition.
        -   The system could constantly monitor mouse and keyboard usage in the background. A "confidence score" would be displayed in real-time, increasing as the behavior matches the enrolled signature and decreasing if anomalies are detected. This moves from a one-time login event to a persistent state of trust.
