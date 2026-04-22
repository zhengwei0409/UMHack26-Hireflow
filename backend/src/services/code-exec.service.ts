const JUDGE0_API_BASE = process.env.JUDGE0_API_BASE;
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

const LANGUAGE_MAP: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  cpp: 54,
  java: 62,
};

export interface CodeExecutionInput {
  language: string;
  sourceCode: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
}

export interface CodeExecutionResult {
  provider: 'judge0' | 'stub';
  status: 'COMPLETED' | 'NOT_CONFIGURED' | 'FAILED';
  passRate: number;
  stdout?: string;
  stderr?: string;
  testResults: Array<{
    input: string;
    expectedOutput: string;
    actualOutput?: string;
    passed: boolean;
  }>;
  metadata?: Record<string, unknown>;
}

function normalizeOutput(value: string | undefined) {
  return (value ?? '').trim();
}

function createStubResult(input: CodeExecutionInput): CodeExecutionResult {
  const looksLikeCode = input.sourceCode.trim().length >= 20;
  const testCases = input.testCases ?? [];
  const fallbackPass = looksLikeCode ? 0.5 : 0;

  return {
    provider: 'stub',
    status: 'NOT_CONFIGURED',
    passRate: fallbackPass,
    testResults: testCases.map((testCase, index) => ({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: looksLikeCode && index === 0 ? testCase.expectedOutput : '',
      passed: looksLikeCode && index === 0,
    })),
    metadata: {
      reason: 'Judge0 is not configured. Returning a deterministic stub result for MVP flow.',
    },
  };
}

async function runJudge0Case(languageId: number, sourceCode: string, stdin: string) {
  const response = await fetch(`${JUDGE0_API_BASE}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(JUDGE0_API_KEY ? { 'X-Auth-Token': JUDGE0_API_KEY } : {}),
    },
    body: JSON.stringify({
      language_id: languageId,
      source_code: sourceCode,
      stdin,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`JUDGE0_ERROR ${response.status}: ${error}`);
  }

  return (await response.json()) as {
    stdout?: string;
    stderr?: string;
    compile_output?: string;
    status?: { description?: string };
    time?: string;
    memory?: number;
  };
}

export async function executeCode(input: CodeExecutionInput): Promise<CodeExecutionResult> {
  const languageKey = input.language.toLowerCase();
  const languageId = LANGUAGE_MAP[languageKey];
  const testCases = input.testCases ?? [];

  if (!JUDGE0_API_BASE || !languageId) {
    return createStubResult(input);
  }

  try {
    const testResults: CodeExecutionResult['testResults'] = [];
    let passCount = 0;
    let lastStdout = '';
    let lastStderr = '';

    for (const testCase of testCases) {
      const result = await runJudge0Case(languageId, input.sourceCode, testCase.input);
      const actualOutput = normalizeOutput(result.stdout);
      const passed = actualOutput === normalizeOutput(testCase.expectedOutput);
      if (passed) passCount += 1;
      lastStdout = result.stdout ?? lastStdout;
      lastStderr = result.stderr || result.compile_output || lastStderr;
      testResults.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput,
        passed,
      });
    }

    return {
      provider: 'judge0',
      status: 'COMPLETED',
      passRate: testCases.length > 0 ? passCount / testCases.length : 0,
      stdout: lastStdout,
      stderr: lastStderr,
      testResults,
    };
  } catch (error) {
    console.error('Judge0 execution failed, returning stub result:', error);
    return {
      ...createStubResult(input),
      status: 'FAILED',
      metadata: {
        reason: String(error),
      },
    };
  }
}
