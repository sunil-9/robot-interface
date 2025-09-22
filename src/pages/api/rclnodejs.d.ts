// rclnodejs.d.ts - Type declarations for rclnodejs
declare module "rclnodejs" {
  export function init(): Promise<void>;
  export function shutdown(): void;
  export function spin(node: Node): void;

  export class Node {
    constructor(name: string);
    createSubscription(
      messageType: string,
      topicName: string,
      callback: (message: unknown) => void
    ): void;
  }
}
