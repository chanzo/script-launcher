import { Prompt } from './prompt';

export class ConfirmPrompt extends Prompt {
  constructor(opts: any);
  submit(): void;
  abort(): void;
}
