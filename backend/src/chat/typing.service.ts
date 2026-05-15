import { Injectable } from '@nestjs/common';

@Injectable()
export class TypingService {
  private typingTimers = new Map<number, Map<number, NodeJS.Timeout>>();
  private readonly DEBOUNCE_MS = 2000;
  private readonly SERVER_TIMEOUT_MS = 5000;

  startTyping(
    conversationId: number,
    userId: number,
    onStopTyping: () => void,
  ): NodeJS.Timeout | null {
    if (!this.typingTimers.has(conversationId)) {
      this.typingTimers.set(conversationId, new Map());
    }
    const convMap = this.typingTimers.get(conversationId)!;
    const existing = convMap.get(userId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.stopTyping(conversationId, userId);
      onStopTyping();
    }, this.DEBOUNCE_MS);

    convMap.set(userId, timer);

    // Hard server timeout
    setTimeout(() => {
      if (convMap.has(userId)) {
        this.stopTyping(conversationId, userId);
        onStopTyping();
      }
    }, this.SERVER_TIMEOUT_MS);

    return timer;
  }

  stopTyping(conversationId: number, userId: number): void {
    const convMap = this.typingTimers.get(conversationId);
    if (!convMap) return;
    const timer = convMap.get(userId);
    if (timer) {
      clearTimeout(timer);
      convMap.delete(userId);
    }
    if (convMap.size === 0) this.typingTimers.delete(conversationId);
  }
}
