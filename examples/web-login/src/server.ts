import { createServer, IncomingMessage, ServerResponse } from 'http';
import { NeuralVerifier, ZeroKnowledgeProof } from '@neuralkey/sdk-core';
import { verify_zkp } from '@neuralkey/zkp-prover';

class SimpleNeuralVerifier implements NeuralVerifier {
    async validateProof(proof: ZeroKnowledgeProof, originalChallenge: string): Promise<boolean> {
        // In a real scenario, you might have more complex logic here,
        // like checking the challenge against a list of active challenges.
        const isValid = verify_zkp(proof.proof, proof.publicSignals);
        const isChallengeMatching = new TextDecoder().decode(proof.publicSignals) === originalChallenge;
        return isValid && isChallengeMatching;
    }
}

const verifier = new SimpleNeuralVerifier();

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/verify' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { proof, challenge } = JSON.parse(body);

                // The proof from the client is a plain object, we need to convert the arrays back to Uint8Array
                const proofAsZkp: ZeroKnowledgeProof = {
                    proof: new Uint8Array(Object.values(proof.proof)),
                    publicSignals: new Uint8Array(Object.values(proof.publicSignals)),
                };

                const isValid = await verifier.validateProof(proofAsZkp, challenge);

                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, verified: isValid }));
            } catch (error) {
                console.error('Verification error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: false, error: 'Invalid request body' }));
            }
        });
    } else if (req.method === 'OPTIONS') {
        // Handle CORS preflight requests
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Verification server running on http://localhost:${PORT}`);
});
