/**
 * @notice A stateful class for the Dynamic Biometric Synthesis (DBS) engine.
 * @dev This class maintains a live model of the user's behavior and provides a
 * continuous Trust Score. It replaces the previous stateless function.
 */
export class TrustScoreModel {
    /**
     * @param initialState Optional initial state to load a pre-trained model.
     */
    constructor(initialState) {
        this.smoothingFactor = 0.1; // How quickly the model adapts
        this.state = initialState || {
            typing: {
                lastTimestamp: -1,
                averageDelay: 150, // Start with a baseline assumption of 150ms inter-key delay
                rhythmScore: 0.5, // Start with a neutral score
            },
        };
    }
    /**
     * @notice Updates the behavioral model with a new interaction event.
     * @param event The real-time event from the user's device.
     */
    update(event) {
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
    getScore() {
        // For now, the score is just the typing rhythm score.
        // A real implementation would combine scores from all models.
        const finalScore = this.state.typing.rhythmScore;
        return Math.max(0, Math.min(1, finalScore)); // Clamp score between 0 and 1
    }
    /**
     * @returns The internal state of the model for persistence.
     */
    serialize() {
        return this.state;
    }
    updateTypingModel(data, timestamp) {
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
