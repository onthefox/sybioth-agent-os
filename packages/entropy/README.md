# @sybioth/entropy

Shannon entropy engine for intelligent task routing and RAG optimization.

## Install

```bash
npm install @sybioth/entropy
```

## Usage

```typescript
import { ShannonEntropyEngine, EntropyRouter } from '@sybioth/entropy';

// Entropy calculation
const engine = new ShannonEntropyEngine();
const result = engine.calculateEntropy('Fix the typo in README');
console.log(result.entropy);     // 3.87
console.log(result.complexity);  // 'medium'

// Cross-entropy for RAG ranking
const score = engine.calculateCrossEntropy(query, document);
console.log(score.similarity);   // 0.85

// Model routing
const router = new EntropyRouter({
  brainModel: 'claude-opus-4-6',
  handsModel: 'gpt-5.4',
  analysisModel: 'kimi-2.5',
});

const decision = router.route('Design a distributed consensus algorithm');
console.log(decision.model);     // 'claude-opus-4-6'
console.log(decision.complexity); // 'medium'
```

## How It Works

Shannon entropy H(X) = -Σ p(x) · log₂(p(x))

- **Low entropy (< 2.0)** — simple, specific tasks → fast model (hands)
- **Medium entropy (2.0-4.0)** — standard complexity → balanced model (brain)
- **High entropy (>= 4.0)** — complex, ambiguous → analysis model

## API

| Class | Description |
|-------|-------------|
| `ShannonEntropyEngine` | H(X), cross-entropy, mutual information, KL divergence |
| `EntropyRouter` | Route tasks to models by entropy thresholds |
| `ShannonUtils` | normalizeEntropy, calculatePerplexity, combineEntropyScores |
