# Project Genesis: The Neural Key (NK) Manifesto

## 1. Principle of Inherent Trust

We believe security should be inherent, not additive. The current paradigm of passwords, keys, and physical tokens is a bolted-on security model that creates friction and vulnerability. Neural Key asserts that **you are the key**. Trust is derived from the unique, living patterns of your interaction with the world. Our mission is to make this inherent trust computationally verifiable.

## 2. The Edge-Only Mandate

Centralized systems are antithetical to true security and privacy. All user data, behavioral patterns, and cryptographic material must remain on the user's device. Neural Key will never rely on a central server for authentication or data storage. The system is and always will be "Edge-Only."

## 3. Zero-Knowledge, Maximum Privacy

We commit to using Zero-Knowledge Proofs (ZKP) as our core authentication mechanism. The user must be able to prove their identity without revealing the underlying data that constitutes it. This ensures privacy and protects against replay attacks.

## 4. Decentralization through Community

Neural Key is not a product; it is a protocol. Its strength comes from its community. We adopt a "Zero-Budget" community build model. This project is an open invitation to builders, cryptographers, and visionaries who believe in a passwordless future.

---

## Coding Standards

1.  **API-First Development:** Define interfaces and data contracts before implementation. All core logic should be exposed through a clear, well-documented SDK.
2.  **TypeScript Everywhere:** Use strict TypeScript for all packages to ensure type safety and code clarity.
3.  **Convention over Configuration:** Follow standard monorepo practices. Use Lerna for package management.
4.  **Lean Dependencies:** Every dependency is a potential vulnerability. Use minimal, well-vetted libraries. `@noble/hashes` and `ethers` are approved for core cryptographic operations.
5.  **Documentation as Code:** All public methods must be documented using TSDoc. The `README.md` and `GEMINI.md` files are living documents to be updated with the project's evolution.
