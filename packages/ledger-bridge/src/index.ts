/**
 * @notice A generic transaction that can be recorded on the ledger.
 * @dev This could represent a key registration, a recovery event, or a
 * revocation. The structure is designed to be abstract from the underlying
 * ledger technology.
 */
export interface LedgerTransaction {
  timestamp: number;
  type: 'REGISTRATION' | 'RECOVERY' | 'REVOCATION';
  proof: Uint8Array; // A proof of the event, e.g., a signature from a recovery agent
  metadata: Record<string, any>;
}

/**
 * @notice The response from submitting a transaction to the ledger.
 */
export interface LedgerSubmissionResponse {
  success: boolean;
  transactionId: string;
  error?: string;
}

/**
 * @notice The interface for the Ledger Bridge.
 * @dev This abstraction allows the Neural Key protocol to interact with various
 * immutable ledger technologies (e.g., public blockchains, private ledgers)
 * without being tightly coupled to a specific implementation. Its primary role
 * is to provide a tamper-resistant, publicly verifiable audit log for critical
 * identity events.
 */
export interface LedgerBridge {
  /**
   * @notice Submits a transaction to the immutable ledger.
   * @param transaction The transaction to be recorded.
   * @returns A promise that resolves with the submission response.
   */
  submitTransaction(transaction: LedgerTransaction): Promise<LedgerSubmissionResponse>;

  /**
   * @notice Verifies that a transaction exists on the ledger.
   * @param transactionId The unique identifier of the transaction to verify.
   * @returns A promise that resolves to a boolean indicating if the transaction is valid and recorded.
   */
  verifyTransaction(transactionId: string): Promise<boolean>;
}
