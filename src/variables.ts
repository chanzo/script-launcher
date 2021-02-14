interface IMatches {
  seperator?: string;
  value: string;
}

export class Variables {
  public static expand(text: string, variables: Array<[string, string]>): string {
    let previousText: string;

    do {
      previousText = text;

      for (const [name, value] of variables) {
        const expressions = Variables.createExpressions(name);

        text = text.replace(expressions.pattern1, '$1' + value + '$2');
        text = text.replace(expressions.pattern2, (substring, args) => {
          const matches = substring.match(expressions.pattern3);
          const operator = matches[1];
          const prefix = args.length > 0 ? args[0] : '';

          return prefix + Variables.evaluateSubstitution(value, operator);
        });

        if (text.match(/([^\\]|^)\$/) === null) break;
      }
    } while (text.match(/([^\\]|^)\$/) !== null && text !== previousText);

    return text;
  }

  public static createExpressions(pattern: string): { pattern1: RegExp; pattern2: RegExp; pattern3: RegExp } {
    return {
      pattern1: new RegExp('([^\\\\]|^)\\$' + pattern + '([^\\w]|$)', 'g'),
      pattern2: new RegExp('([^\\\\]|^)\\$\\{' + pattern + '([%:#/,^].*?)?\\}', 'g'),
      pattern3: new RegExp('\\$\\{' + pattern + '(.*?)\\}')
    };
  }

  public static remove(text: string, pattern: string): string {
    const expressions = Variables.createExpressions(pattern);

    text = text.replace(expressions.pattern1, '$1$2');
    text = text.replace(expressions.pattern2, '$1');

    return text;
  }

  private static split(value: string, seperators: string[]): IMatches[] {
    const result: IMatches[] = [];
    let origin = 0;
    let offset = 0;

    while (origin + offset < value.length) {
      for (const seperator of seperators) {
        if (value.startsWith(seperator, origin + offset)) {
          result.push({
            seperator: seperator,
            value: value.substr(origin, offset)
          });

          origin += offset + seperator.length;
          offset = 0;
        }
      }
      offset++;
    }

    result.push({
      value: value.substr(origin, offset)
    });

    return result;
  }

  private static evaluateSubstitution(value: string, operator: string): string {
    if (operator.startsWith(':')) {
      // ${var:num1:num2}	Substring
      const columns = operator.split(':');

      if (columns.length === 3) {
        let index = Number.parseInt(columns[1], 10);
        let length = Number.parseInt(columns[2], 10);

        if (isNaN(index)) index = 0;
        if (length < 0) length = value.length + length;

        return value.substr(index, length);
      }

      if (columns.length === 2) {
        const index = Number.parseInt(columns[1], 10);

        return value.substr(index);
      }

      throw new Error('Syntax error in expression: ' + operator);
    }

    if (operator.startsWith('%%')) {
      // ${var%%pattern}	Remove from longest rear (end) pattern
      const seperators = operator
        .substr(2)
        .split('*')
        .filter(item => item);
      const matches = Variables.split(value, seperators);

      return matches.length > 0 ? matches[0].value : value;
    }

    if (operator.startsWith('%')) {
      // ${var%%pattern}	Remove from longest rear (end) pattern

      throw new Error('Not implemented');
    }

    if (operator.startsWith('##')) {
      // ${var%%pattern}	Remove from longest rear (end) pattern

      const seperators = operator
        .substr(2)
        .split('*')
        .filter(item => item);
      const matches = Variables.split(value, seperators);

      return matches.length > 0 ? matches[matches.length - 1].value : value;
    }

    if (operator.startsWith('#')) {
      // ${var#pattern}	Remove from shortest front pattern

      throw new Error('Not implemented');
    }

    if (operator.startsWith('//')) {
      // ${var//pattern/string}	Find and replace all occurrences
      const columns = operator.split('/');

      if (columns.length === 4) {
        const searchValue = columns[2];
        const replaceValue = columns[3];

        return value.replace(new RegExp(searchValue, 'g'), replaceValue);
      }

      throw new Error('Syntax error in expression: ' + operator);
    }

    if (operator.startsWith('/')) {
      // ${var/pattern/string}	Find and replace (only replace first occurrence)
      const columns = operator.split('/');

      if (columns.length === 3) {
        const searchValue = columns[1];
        const replaceValue = columns[2];

        return value.replace(new RegExp(searchValue), replaceValue);
      }

      throw new Error('Syntax error in expression: ' + operator);
    }

    if (operator.startsWith(',,')) {
      // ${var,,}	Convert all characters to lowercase.
      return value.toLowerCase();
    }

    if (operator.startsWith(',')) {
      // ${var,}	Convert first character to lowercase.
      if (value.length === 0) return value;

      return value[0].toLowerCase() + value.substr(1);
    }

    if (operator.startsWith('^^')) {
      // ${var^^}	Convert all character to uppercase..
      return value.toUpperCase();
    }

    if (operator.startsWith('^')) {
      // ${var^}	Convert first character to uppercase.
      if (value.length === 0) return value;

      return value[0].toUpperCase() + value.substr(1);
    }

    return value;
  }
}
