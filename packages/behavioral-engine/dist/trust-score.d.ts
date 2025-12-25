import { InteractionEvent } from "@neuralkey/sdk-core";
/**
 * @notice Represents the internal state of the learned behavioral model.
 * @dev In a real ML implementation, this would be a complex structure of
 * weights, biases, and normalized feature vectors.
 */
interface BehavioralModelState {
    typing: {
        lastTimestamp: number;
        averageDelay: number;
        rhythmScore: number;
    };
}
/**
 * @notice A stateful class for the Dynamic Biometric Synthesis (DBS) engine.
 * @dev This class maintains a live model of the user's behavior and provides a
 * continuous Trust Score. It replaces the previous stateless function.
 */
export declare class TrustScoreModel {
    private state;
    private readonly smoothingFactor;
    /**
     * @param initialState Optional initial state to load a pre-trained model.
     */
    constructor(initialState?: BehavioralModelState);
    /**
     * @notice Updates the behavioral model with a new interaction event.
     * @param event The real-time event from the user's device.
     */
    update(event: InteractionEvent): void;
    /**
     * @returns The current live Trust Score, a value between 0 and 1.
     */
    getScore(): number;
    /**
     * @returns The internal state of the model for persistence.
     */
    serialize(): BehavioralModelState;
    private updateTypingModel;
}
export {};
