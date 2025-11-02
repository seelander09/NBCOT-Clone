import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds localStorage analytics data for fake students across different practice sets.
 * This script creates realistic analytics payloads that can be injected into browser localStorage
 * during testing to simulate students with activity history.
 *
 * Usage:
 *   npx tsx scripts/seed-fake-student-analytics.ts --student test.student1@example.com --set otr-baseline
 *   npx tsx scripts/seed-fake-student-analytics.ts --all
 */

type AnalyticsEntry = {
  submittedAt: string;
  accuracyPercent: number;
  domainBreakdown?: Array<{
    domainId: string;
    domainTitle: string;
    total: number;
    answered: number;
    correct: number;
    timeMs: number;
  }>;
};

type PracticeSetConfig = {
  id: string;
  analyticsStorageKey: string;
  sessionStorageKey: string;
  domains: string[];
};

const PRACTICE_SETS: Record<string, PracticeSetConfig> = {
  'otr-baseline': {
    id: 'otr-baseline',
    analyticsStorageKey: 'nbcot-practice-analytics-v1',
    sessionStorageKey: 'nbcot-practice-session-v1',
    domains: ['domain1', 'domain2', 'domain3', 'domain4'],
  },
  'otr-set-4': {
    id: 'otr-set-4',
    analyticsStorageKey: 'nbcot-practice-analytics-otr4',
    sessionStorageKey: 'nbcot-practice-session-otr4',
    domains: ['domain2', 'domain3'],
  },
};

function generateDomainBreakdown(
  domains: string[],
  totalAccuracy: number,
  questionsPerDomain: number = 25,
): AnalyticsEntry['domainBreakdown'] {
  // Create variation: some domains perform better/worse than overall
  const variations = domains.map(() => (Math.random() - 0.5) * 0.2); // ±10% variation
  
  return domains.map((domainId, index) => {
    const domainAccuracy = Math.max(0, Math.min(100, totalAccuracy + variations[index] * 100));
    const answered = questionsPerDomain;
    const correct = Math.round((answered * domainAccuracy) / 100);
    const timeMs = Math.round(answered * (60000 + Math.random() * 30000)); // 1-1.5 min per question

    return {
      domainId,
      domainTitle: `Domain ${domainId.slice(-1)}`,
      total: questionsPerDomain,
      answered,
      correct,
      timeMs,
    };
  });
}

function generateAnalyticsEntry(
  daysAgo: number,
  baseAccuracy: number,
  domains: string[],
): AnalyticsEntry {
  const now = new Date();
  const submittedAt = new Date(now);
  submittedAt.setDate(now.getDate() - daysAgo);
  submittedAt.setHours(Math.floor(Math.random() * 12) + 9); // 9 AM - 9 PM
  submittedAt.setMinutes(Math.floor(Math.random() * 60));

  // Add some variation to accuracy (±5%)
  const accuracyVariation = (Math.random() - 0.5) * 0.1;
  const accuracyPercent = Math.max(0, Math.min(100, Math.round((baseAccuracy + accuracyVariation * 100) * 100) / 100));

  return {
    submittedAt: submittedAt.toISOString(),
    accuracyPercent,
    domainBreakdown: generateDomainBreakdown(domains, accuracyPercent),
  };
}

function generateAnalyticsArray(
  setConfig: PracticeSetConfig,
  count: number = 3,
  baseAccuracy: number = 75,
): AnalyticsEntry[] {
  const entries: AnalyticsEntry[] = [];
  
  for (let i = 0; i < count; i++) {
    entries.push(generateAnalyticsEntry(i, baseAccuracy + (count - i - 1) * 2, setConfig.domains));
  }

  return entries.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
}

async function seedStudentAnalytics(email: string, setIds: string[] = ['otr-baseline']) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!user) {
    throw new Error(`User not found: ${email}. Run create-fake-students.ts first.`);
  }

  console.info(`[seed-analytics] Seeding analytics for ${email} (${user.firstName} ${user.lastName})`);

  const analyticsData: Record<string, AnalyticsEntry[]> = {};

  for (const setId of setIds) {
    const setConfig = PRACTICE_SETS[setId];
    if (!setConfig) {
      console.warn(`[seed-analytics] Unknown practice set: ${setId}, skipping`);
      continue;
    }

    // Generate 2-4 submissions with improving accuracy over time
    const submissionCount = 2 + Math.floor(Math.random() * 3);
    const baseAccuracy = 70 + Math.floor(Math.random() * 20); // 70-90%

    analyticsData[setConfig.analyticsStorageKey] = generateAnalyticsArray(
      setConfig,
      submissionCount,
      baseAccuracy,
    );

    console.info(
      `  - ${setId}: ${submissionCount} submissions, avg accuracy: ${baseAccuracy}%`,
    );
  }

  // Output as JSON that can be injected into localStorage
  console.info('\n[seed-analytics] Generated analytics data (copy into browser console):\n');
  console.info('// Run this in browser console after logging in as the student:');
  console.info(`// User: ${email}`);
  console.info('');
  
  for (const [storageKey, entries] of Object.entries(analyticsData)) {
    console.info(`localStorage.setItem('${storageKey}', JSON.stringify(${JSON.stringify(entries, null, 2)}));`);
  }

  return analyticsData;
}

async function seedAllFakeStudents() {
  const students = await prisma.user.findMany({
    where: {
      email: {
        startsWith: 'test.student',
      },
    },
    select: { email: true },
    orderBy: { email: 'asc' },
  });

  if (students.length === 0) {
    throw new Error('No fake students found. Run create-fake-students.ts first.');
  }

  console.info(`[seed-analytics] Found ${students.length} fake students`);

  const sets = ['otr-baseline', 'otr-set-4'];
  
  for (const student of students) {
    try {
      // Vary which sets each student has completed
      const studentSets = sets.slice(0, 1 + Math.floor(Math.random() * sets.length));
      await seedStudentAnalytics(student.email, studentSets);
      console.info('');
    } catch (error) {
      console.error(`[seed-analytics] Failed for ${student.email}:`, error);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const studentArg = args.find((arg) => arg.startsWith('--student='))?.split('=')[1];
  const setArg = args.find((arg) => arg.startsWith('--set='))?.split('=')[1];
  const allFlag = args.includes('--all');

  try {
    if (allFlag) {
      await seedAllFakeStudents();
    } else if (studentArg) {
      const sets = setArg ? [setArg] : ['otr-baseline'];
      await seedStudentAnalytics(studentArg, sets);
    } else {
      console.error('Usage:');
      console.error('  npx tsx scripts/seed-fake-student-analytics.ts --student=test.student1@example.com [--set=otr-baseline]');
      console.error('  npx tsx scripts/seed-fake-student-analytics.ts --all');
      process.exit(1);
    }
  } catch (error) {
    console.error('[seed-analytics] Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

