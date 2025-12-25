import { InteractionEvent, KeyEventData } from "@neuralkey/sdk-core";

/**
 * @notice Represents the internal state of the learned behavioral model.
 * @dev In a real ML implementation, this would be a complex structure of
 * weights, biases, and normalized feature vectors.
 */
interface BehavioralModelState {
  // Typing rhythm model
  typing: {
    lastTimestamp: number;
    averageDelay: number; // Using a simple moving average
    rhythmScore: number;
  };
  // TODO: Add state for mouse and motion models
}

/**
 * @notice A stateful class for the Dynamic Biometric Synthesis (DBS) engine.
 * @dev This class maintains a live model of the user's behavior and provides a
 * continuous Trust Score. It replaces the previous stateless function.
 */
export class TrustScoreModel {
  private state: BehavioralModelState;
  private readonly smoothingFactor = 0.1; // How quickly the model adapts

  /**
   * @param initialState Optional initial state to load a pre-trained model.
   */
  constructor(initialState?: BehavioralModelState) {
    this.state = initialState || {
      typing: {
        lastTimestamp: -1,
        averageDelay: 150, // Start with a baseline assumption of 150ms inter-key delay
        rhythmScore: 0.5,  // Start with a neutral score
      },
    };
  }

  /**
   * @notice Updates the behavioral model with a new interaction event.
   * @param event The real-time event from the user's device.
   */
  public update(event: InteractionEvent): void {
    switch (event.type) {
      case 'key':
        this.updateTypingModel(event.data, event.timestamp);
        break;
      case 'mouse':
        // TODO: Implement mouse model update
        break;
      case 'motion':
        // TODO: Implement motion model update
        break;
    }
  }

  /**
   * @returns The current live Trust Score, a value between 0 and 1.
   */
  public getScore(): number {
    // For now, the score is just the typing rhythm score.
    // A real implementation would combine scores from all models.
    const finalScore = this.state.typing.rhythmScore;
    return Math.max(0, Math.min(1, finalScore)); // Clamp score between 0 and 1
  }

  /**
   * @returns The internal state of the model for persistence.
   */
  public serialize(): BehavioralModelState {
    return this.state;
  }

  private updateTypingModel(data: KeyEventData, timestamp: number): void {
    if (data.direction === 'down') {
      const { typing } = this.state;
      if (typing.lastTimestamp > 0) {
        const delay = timestamp - typing.lastTimestamp;

        // Calculate deviation from the learned average
        const deviation = Math.abs(delay - typing.averageDelay);
        const currentRhythmScore = Math.max(0, 1 - (deviation / typing.averageDelay));

        // Update the moving average for the rhythm score itself
        typing.rhythmScore = (this.smoothingFactor * currentRhythmScore) + ((1 - this.smoothingFactor) * typing.rhythmScore);

        // Update the moving average for the delay
        typing.averageDelay = (this.smoothingFactor * delay) + ((1 - this.smoothingFactor) * typing.averageDelay);
      }
      typing.lastTimestamp = timestamp;
    }
  }
}
