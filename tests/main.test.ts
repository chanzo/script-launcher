function isPalindrome(s: string) {
  const count = s.length - 1;

  if (count < 2) return true;

  for (let index = 0; index < (count + 1) / 2; ++index) {
    if (s[index] !== s[count - index]) return false;
  }

  return true;
}

describe('test1', () => {
  test('it detects palindromes', () => {
    expect(isPalindrome('palindrome')).toBe(false);
    expect(isPalindrome('')).toBe(true);
    expect(isPalindrome('aa')).toBe(true);
  });
});

describe('test2', () => {
  test('it detects palindromes', () => {
    expect(isPalindrome('gg')).toBe(true);
    expect(isPalindrome('pop')).toBe(true);
    expect(isPalindrome('1212')).toBe(false);
  });
});
