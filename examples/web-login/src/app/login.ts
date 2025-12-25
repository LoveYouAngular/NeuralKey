import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NeuralHandshakeClient, ZeroKnowledgeProof } from '@neuralkey/sdk-core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule], // Import CommonModule for ngIf, etc.
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  status: string = 'Initializing Neural Key...';
  isLoggedIn: boolean = false;
  protected neuralClient: NeuralHandshakeClient | undefined;

  async ngOnInit() {
    try {
      this.status = 'Creating Neural Key client...';
      this.neuralClient = await NeuralHandshakeClient.create();
      this.status = 'Neural Key client ready. Click "Login" to verify.';
    } catch (error) {
      this.status = `Error initializing Neural Key: ${error}`;
      console.error('Error initializing Neural Key:', error);
    }
  }

  async performLogin() {
    if (!this.neuralClient) {
      this.status = 'Neural Key client not initialized.';
      return;
    }

    this.status = 'Requesting verification...';
    try {
      // In a real scenario, the challenge would come from a server.
      // For this example, we'll use a simple timestamp as a challenge.
      const challenge = `login_challenge_${Date.now()}`;
      const proof: ZeroKnowledgeProof = await this.neuralClient.requestVerification(challenge);

      // In a real scenario, this proof would be sent to a server for verification.
      // For this example, we'll just log it and assume success.
      console.log('Generated ZKP:', proof);
      this.status = 'Zero-Knowledge Proof generated. (Simulated) Login successful!';
      this.isLoggedIn = true;
    } catch (error) {
      this.status = `Verification failed: ${error}`;
      console.error('Verification failed:', error);
      this.isLoggedIn = false;
    }
  }
}
