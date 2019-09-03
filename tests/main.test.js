function isPalindrome(s) {
  const count = s.length - 1
  if (count < 2) {
    return true
  }

  for (i = 0; i < (count + 1) / 2; ++i) {
    if (s[i] !== s[count - i])
      return false
  }
  return true
}

describe('test1', () => {
  test('it detects palindromes', () => {
    expect(isPalindrome('palindrome')).toBe(false)
    expect(isPalindrome('')).toBe(true)
    expect(isPalindrome('aa')).toBe(true)
  })
});

describe('test2', () => {
  test('it detects palindromes', () => {
    expect(isPalindrome('gg')).toBe(true)
    expect(isPalindrome('pop')).toBe(true)
    expect(isPalindrome('1212')).toBe(false)
  })
});
