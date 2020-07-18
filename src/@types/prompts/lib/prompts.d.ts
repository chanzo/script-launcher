export interface IOptions {
  onState?(...args: any[]): any;
  onAbort?(...args: any[]): any;
  onSubmit?(...args: any[]): any;
}
