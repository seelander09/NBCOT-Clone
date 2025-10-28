# Vector Database Helper Functions Added

## New Helper Functions

I've added helper functions to easily discover what domains, question types, and difficulty levels are available in your practice test questions.

### 1. Get Available Domains

Find all domains in a practice test (like "Upper Extremity", "Pediatrics", etc.):

```typescript
import { getAvailableDomains } from '@/services/vector-store/qdrant';

const domains = await getAvailableDomains(templateId);
// Returns: [
//   { domain: "Upper Extremity", count: 45 },
//   { domain: "Pediatrics", count: 38 },
//   ...
// ]
```

### 2. Get Available Question Types

Find all question types used in the practice test:

```typescript
import { getAvailableQuestionTypes } from '@/services/vector-store/qdrant';

const types = await getAvailableQuestionTypes(templateId);
// Returns: [
//   { type: "SINGLE_BEST", count: 120 },
//   { type: "MULTI_SELECT", count: 30 },
//   ...
// ]
```

### 3. Get Available Difficulty Levels

Find all difficulty levels and how many questions exist at each level:

```typescript
import { getAvailableDifficultyLevels } from '@/services/vector-store/qdrant';

const levels = await getAvailableDifficultyLevels(templateId);
// Returns: [
//   { level: 1, count: 40 },
//   { level: 2, count: 70 },
//   { level: 3, count: 40 },
// ]
```

### 4. Get All Metadata (One Call)

Get everything at once:

```typescript
import { getPracticeTestMetadata } from '@/services/vector-store/qdrant';

const metadata = await getPracticeTestMetadata(templateId);
// Returns: {
//   domains: [...],
//   questionTypes: [...],
//   difficultyLevels: [...],
//   totalQuestions: 150
// }
```

## API Endpoint

### GET `/api/exams/metadata?templateId=your-template-id`

Returns comprehensive metadata about what's available in the practice test:

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

## Use Cases

### Example 1: Find Upper Extremity Questions

```typescript
// First, check what domains exist
const domains = await getAvailableDomains(templateId);
// Find "Upper Extremity" in the list

// Then search for those questions
const results = await searchSimilarQuestions(
  templateId,
  queryEmbedding,
  10,
  { domain: "Upper Extremity" }
);
```

### Example 2: Build a Filter UI

```typescript
const metadata = await getPracticeTestMetadata(templateId);

// Create dropdown options
const domainOptions = metadata.domains.map(d => ({
  label: `${d.domain} (${d.count})`,
  value: d.domain
}));

const difficultyOptions = metadata.difficultyLevels.map(l => ({
  label: `Level ${l.level} (${l.count} questions)`,
  value: l.level
}));
```

### Example 3: Validate Filter Before Applying

```typescript
const domains = await getAvailableDomains(templateId);
const requestedDomain = "Upper Extremity";

const domainExists = domains.some(d => d.domain === requestedDomain);
if (!domainExists) {
  console.error("Domain not found in this practice test!");
}
```

## Files Modified

1. **src/services/vector-store/qdrant.ts** - Added 4 new helper functions
2. **src/app/api/exams/metadata/route.ts** - New API endpoint
3. **docs/vector-stores-setup.md** - Updated documentation

## Benefits

✅ **Discover what's available** - No need to guess what domains exist  
✅ **See question counts** - Know how many questions are in each category  
✅ **Build better filters** - Create dynamic filter UIs based on actual data  
✅ **Validate inputs** - Check if a domain/type exists before filtering  
✅ **AI understands structure** - Help the AI know what content patterns exist  

These helpers make it easy to work with your practice test data!
