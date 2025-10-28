# Vector Database Setup for Practice Test Deep Analysis

This document explains how to set up and use the vector database collections for deep analysis of practice test questions, enabling AI to learn exam structures and generate similar new questions.

## Overview

Each practice test now has its own vector database collection in Qdrant. This allows the AI to:

1. **Analyze exam structure** - Understand question types, domains, difficulty distribution
2. **Find similar questions** - Search for questions with similar content, difficulty, or domain
3. **Generate new questions** - Use patterns learned from existing questions to create new ones

## Architecture

- **Vector Database**: Qdrant (running in Docker)
- **Embeddings**: OpenAI or local Xenova transformers
- **Collections**: One per practice test template (named `practice-test-{templateId}`)

## Setup

### 1. Start Services

```bash
# Start both PostgreSQL and Qdrant
docker compose up -d

# Or start individually
docker compose up -d db
docker compose up -d qdrant
```

### 2. Environment Variables

Add to your `.env` file:

```env
# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=  # Optional, for cloud Qdrant

# Optional: OpenAI for embeddings (falls back to local transformers)
OPENAI_API_KEY=your_openai_key_here
EMBEDDING_MODEL=text-embedding-3-small
```

### 3. Populate Collections

After seeding your database with questions:

```bash
npm run vectors:populate
```

This will:
- Create a collection for each exam template
- Generate embeddings for all questions
- Store them in the vector database
- Analyze the collection structure

## Usage

### Analyzing Exam Structure

```typescript
import { analyzeExamStructure } from '@/services/vector-store/qdrant';

const structure = await analyzeExamStructure(templateId);
console.log(structure);
// {
//   totalQuestions: 150,
//   domains: { "Pediatrics": 45, "Mental Health": 50, "Physical Rehab": 55 },
//   difficultyDistribution: { "level-1": 30, "level-2": 70, "level-3": 50 },
//   questionTypes: { "SINGLE_BEST": 120, "MULTI_SELECT": 30 }
// }
```

### Finding Similar Questions

```typescript
import { searchSimilarQuestions, generateEmbedding } from '@/services/vector-store/qdrant';

const queryEmbedding = await generateEmbedding(
  "A question about pediatric sensory processing disorders"
);

const similar = await searchSimilarQuestions(
  templateId,
  queryEmbedding,
  10, // limit
  {
    domain: "Pediatrics",
    difficulty: 2,
    excludeIds: ["already-used-id"]
  }
);
```

### Getting Available Domains, Types, and Difficulty Levels

```typescript
import { getPracticeTestMetadata } from '@/services/vector-store/qdrant';

// Get all available filter options
const metadata = await getPracticeTestMetadata(templateId);
console.log(metadata);
// {
//   domains: [
//     { domain: "Upper Extremity", count: 45 },
//     { domain: "Pediatrics", count: 38 },
//     { domain: "Mental Health", count: 32 },
//     ...
//   ],
//   questionTypes: [
//     { type: "SINGLE_BEST", count: 120 },
//     { type: "MULTI_SELECT", count: 30 },
//     ...
//   ],
//   difficultyLevels: [
//     { level: 1, count: 40 },
//     { level: 2, count: 70 },
//     { level: 3, count: 40 },
//   ],
//   totalQuestions: 150
// }
```

Or just get domains:
```typescript
import { getAvailableDomains } from '@/services/vector-store/qdrant';

const domains = await getAvailableDomains(templateId);
// Returns: [{ domain: "Upper Extremity", count: 45 }, ...]
```

### API Endpoints

#### Get Practice Test Metadata

GET `/api/exams/metadata?templateId=your-template-id`

Response:
```json
{
  "domains": [
    { "domain": "Upper Extremity", "count": 45 },
    { "domain": "Pediatrics", "count": 38 }
  ],
  "questionTypes": [
    { "type": "SINGLE_BEST", "count": 120 },
    { "type": "MULTI_SELECT", "count": 30 }
  ],
  "difficultyLevels": [
    { "level": 1, "count": 40 },
    { "level": 2, "count": 70 },
    { "level": 3, "count": 40 }
  ],
  "totalQuestions": 150
}
```

#### Find Similar Questions

POST `/api/exams/generate-questions`

```json
{
  "templateId": "template-id",
  "query": "upper extremity rehabilitation",
  "options": {
    "limit": 10,
    "domain": "Upper Extremity",
    "difficulty": 2
  }
}
```

Response:
```json
{
  "structure": {
    "totalQuestions": 150,
    "domains": { ... },
    "difficultyDistribution": { ... },
    "questionTypes": { ... }
  },
  "similarQuestions": [ ... ],
  "metadata": [
    {
      "score": 0.92,
      "metadata": { ... }
    }
  ]
}
```

## How It Works

### 1. Question Embedding

Each question is converted to an embedding vector by combining:
- Domain
- Question stem
- Answer options
- Rationale (if available)

This creates a rich semantic representation that captures the question's meaning and context.

### 2. Collection Structure

```
practice-test-{templateId}
  ├── Vectors (1536 or 3072 dimensions)
  ├── Metadata:
  │   ├── questionId
  │   ├── domain
  │   ├── difficulty
  │   ├── type
  │   ├── tags
  │   └── ...
  └── Index: HNSW for fast similarity search
```

### 3. AI Analysis

The AI can:
- **Understand patterns**: "This exam uses 40% single-best, 60% multi-select"
- **Identify gaps**: "No level 3 questions in Pediatrics domain"
- **Generate similar content**: "Create a question similar to this but about adults"

## Benefits

1. **Intelligent Question Selection**: Find the most appropriate questions for a specific learning objective
2. **Adaptive Testing**: Generate exams tailored to difficulty level and domain distribution
3. **Content Analysis**: Understand what makes a good question in each domain
4. **Question Generation**: Create new questions that match the style and difficulty of existing ones

## Troubleshooting

### Qdrant Connection Error

```bash
# Check if Qdrant is running
docker ps | grep qdrant

# View logs
docker compose logs qdrant

# Restart Qdrant
docker compose restart qdrant
```

### Embedding Generation Failed

If OpenAI API fails, the system automatically falls back to local transformers. The first run may download the model (~100MB).

### Empty Collections

Make sure you've:
1. Seeded the database with questions
2. Run `npm run vectors:populate`
3. Checked that the template exists in the database

## Next Steps

- Implement AI-powered question generation
- Add automatic difficulty assessment
- Create adaptive exam generation based on user performance
- Build recommendation system for study materials
