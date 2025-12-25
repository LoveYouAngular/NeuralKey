# The Genesis Ceremony

## Root of Trust Generation for the Neural Key Protocol

### "In Math We Trust"

---

## 1. Purpose

The Genesis Ceremony is a cryptographically secure procedure to generate the initial root keys and parameters for the Neural Key protocol's Zero-Knowledge Proof (ZKP) system. The integrity of the entire protocol rests on the integrity of this ceremony.

The primary goal is to generate the structured reference string (SRS) required for our ZKP scheme (e.g., Groth16) without any single party ever knowing the toxic waste (`tau`) used in its creation. If `tau` were ever compromised, it would be possible to forge fraudulent proofs.

## 2. The Ceremony Process (Multi-Party Computation)

The ceremony will be conducted as a Multi-Party Computation (MPC) involving a global and diverse set of participants from the Guardian Council and the open-source community.

1.  **Initialization:** A random starting value (`tau_0`) is generated.
2.  **The Chain:** Each participant `i` in the ceremony will:
    a. Download the previous participant's output (`tau_{i-1}`).
    b. Generate a new secret random value (`delta_i`).
    c. Compute their contribution (`tau_i = tau_{i-1} * delta_i`).
    d. Immediately destroy their secret (`delta_i`).
    e. Upload their output (`tau_i`) for the next participant.
3.  **Finalization:** After all participants have contributed, the final parameters are published.

As long as **at least one** participant in the entire chain successfully generates and destroys their secret without collusion, the final SRS is secure.

## 3. Participants & The Guardian Council

The ceremony will be led by the Lead Architects and overseen by the **Guardian Council**, which includes:
-   Trusted cryptographers.
-   Representatives from privacy-focused NGOs.
-   Academics in the security field.
-   [List of participants to be confirmed]

Participation will also be open to the public. Instructions on how to apply to become a participant will be published here.

## 4. Security & Transparency

-   **Public Verifiability:** All inputs and outputs for each step of the ceremony will be publicly logged and verifiable.
-   **Audits:** The ceremony software and procedure will be independently audited before the ceremony begins.
-   **Livestream:** The coordination of the ceremony will be livestreamed to ensure transparency.

**The date for the Genesis Ceremony is TBD (Target: Day 121 of the roadmap).**
