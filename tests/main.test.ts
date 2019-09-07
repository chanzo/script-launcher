import { promisify } from "util";


describe('Describe 1', () => {
  test('Test 1', async () => {
    // console.log('1a', new Date().toISOString());
    await promisify(setTimeout)(10);
    expect(true).toBe(true);
  });
  test('Test 2', async () => {
    // console.log('2a', new Date().toISOString());
    await promisify(setTimeout)(10);
    expect(true).toBe(true);
  });
});

describe('Describe 2', () => {
  test('it detects palindromes', async () => {
    // console.log('6a', new Date().toISOString());
    await promisify(setTimeout)(10);
    expect(true).toBe(true);
  });
});
