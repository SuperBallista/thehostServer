import { LLMService } from './src/bot/llm.service';

// Test the fixActionFormat method
const llmService = new LLMService(null as any, null as any);

// Access the private method for testing
const fixActionFormat = (llmService as any).fixActionFormat.bind(llmService);

// Test cases
const testCases = [
  {
    input: { action: 'myStatus', params: { location: '해안' } },
    expected: { action: 'myStatus.next', params: { location: '해안' } }
  },
  {
    input: { action: 'myStatus', params: { action: 'hide' } },
    expected: { action: 'myStatus.act', params: { action: 'hide' } }
  },
  {
    input: { action: 'myStatus', params: { next: { location: '정글' } } },
    expected: { action: 'myStatus.next', params: { location: '정글' } }
  },
  {
    input: { action: 'hostAct', params: { target: '말많은다람쥐' } },
    expected: { action: 'hostAct.infect', params: { target: '말많은다람쥐' } }
  },
  {
    input: { action: 'hostAct', params: { zombies: [{ zombie: '느릿한거북이' }] } },
    expected: { action: 'hostAct.zombieList', params: { zombies: [{ zombie: '느릿한거북이' }] } }
  },
  {
    input: { action: 'myStatus.next', params: { location: '해안' } },
    expected: { action: 'myStatus.next', params: { location: '해안' } } // Should not change
  }
];

console.log('Testing fixActionFormat...\n');

testCases.forEach((testCase, index) => {
  const result = fixActionFormat(testCase.input);
  const passed = JSON.stringify(result) === JSON.stringify(testCase.expected);
  
  console.log(`Test ${index + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Input:    ${JSON.stringify(testCase.input)}`);
  console.log(`  Expected: ${JSON.stringify(testCase.expected)}`);
  console.log(`  Result:   ${JSON.stringify(result)}`);
  console.log();
});