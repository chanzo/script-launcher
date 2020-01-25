import * as fs from 'fs';
import { IConfig } from '../src/config-loader';

export interface ISectionTest {
  title: string;
  config: IConfig;
  commands: string[];
  error?: string;
}

export class MarkdownParser {
  private readonly sections: Map<string, string[]>;

  constructor(fileName: string, exclude: string[] = []) {
    const buffer = fs.readFileSync(fileName);
    const fileContent = buffer.toString().split('\n');

    this.sections = new Map();

    try {
      const sections = MarkdownParser.getSections(fileContent, '^(###|##) (.+)');

      for (const [key, value] of sections) {
        if (exclude.includes(key)) continue;

        this.sections.set(key, value);
      }
    } catch (error) {
      console.error('Error loading \"' + fileName + '\" markdown file ', error.message);
    }
  }

  public getSectionTests(): ISectionTest[] {
    const result: ISectionTest[] = [];

    for (const [title, content] of this.sections) {
      const commands = MarkdownParser.getCommands(content, '^\\*\\*Run\\*\\*\\: ');
      let config: IConfig = {} as any;
      let sectionError: string = null;

      try {
        const configContent = MarkdownParser.getSections(content, '^```(.+)').get('JSON');

        config = JSON.parse(configContent ? configContent.join('\n') : '{}');
      } catch (error) {
        sectionError = 'Unable to load markdown example: ' + error.message;
      }

      result.push({
        title: title,
        config: config,
        commands: commands,
        error: sectionError
      });
    }

    return result;
  }

  private static getCommands(content: string[], pattern: string): string[] {
    const result: string[] = [];
    const expression = new RegExp(pattern);

    for (const line of content) {
      if (line.match(expression) !== null) {
        const expression = /`(.*?)`/g;
        let match: RegExpExecArray;

        while ((match = expression.exec(line)) != null) {
          result.push(match[1]);
        }
      }
    }

    return result;
  }

  private static getSections(content: string[], pattern: string): Map<string, string[]> {
    const result: Map<string, string[]> = new Map();
    const expression = new RegExp(pattern);
    let block = [];

    for (const line of content) {
      const matches = line.match(expression);

      if (matches !== null) {
        const key = matches[matches.length - 1].trim();

        block = [];

        if (result.has(key)) {

          console.log('matches:', matches);

          throw new Error('Duplicate section key: ' + key);
        }

        result.set(key, block);
      } else {
        block.push(line);
      }
    }

    return result;
  }
}
