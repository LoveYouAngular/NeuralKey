import { split, combine } from 'shamir-secret-sharing';
const TOTAL_SHARDS = 7;
const THRESHOLD = 5;
/**
 * @notice Splits a secret into a series of cryptographic shards.
 * @dev This uses Shamir's Secret Sharing to split a secret into 7 shards,
 * requiring 5 to reconstruct. This is the core of the "Blind Threshold Escrow".
 * The shards would be distributed to members of the "Guardian Council".
 *
 * @param secret The secret data to be sharded (e.g., a wallet mnemonic or private key).
 * @returns A promise that resolves to an array of 7 shards as Uint8Arrays.
 */
export async function createShards(secret) {
    if (secret.length === 0) {
        throw new Error('Cannot shard an empty secret.');
    }
    const shards = await split(secret, TOTAL_SHARDS, THRESHOLD);
    return shards;
}
/**
 * @notice Reconstructs a secret from a set of cryptographic shards.
 * @dev This requires at least 5 of the 7 original shards to successfully
 * reconstruct the original secret.
 *
 * @param shards An array of shards provided by members of the "Guardian Council".
 * @returns A promise that resolves to the original reconstructed secret.
 * @throws An error if fewer than 5 shards are provided or if the shards are invalid.
 */
export async function reconstructSecret(shards) {
    if (shards.length < THRESHOLD) {
        throw new Error(`Insufficient number of shards provided. Received ${shards.length}, but require ${THRESHOLD}.`);
    }
    const reconstructed = await combine(shards);
    return reconstructed;
}
