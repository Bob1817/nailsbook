import { Injectable } from '@nestjs/common';

interface TypingTimers {
  /** 防抖定时器（2s 无新输入即停止） */
  debounce: NodeJS.Timeout;
  /** 硬超时定时器（5s 强制停止，防止泄漏） */
  hardTimeout: NodeJS.Timeout;
}

@Injectable()
export class TypingService {
  private typingTimers = new Map<number, Map<number, TypingTimers>>();
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

    // 清除之前的定时器（用户重新输入）
    const existing = convMap.get(userId);
    if (existing) {
      clearTimeout(existing.debounce);
      clearTimeout(existing.hardTimeout);
    }

    // 2s 无输入即视为停止 typing
    const debounce = setTimeout(() => {
      this.stopTyping(conversationId, userId);
      onStopTyping();
    }, this.DEBOUNCE_MS);

    // 5s 强制兜底，防止 debounce 被意外重置导致永不停止
    const hardTimeout = setTimeout(() => {
      if (convMap.has(userId)) {
        this.stopTyping(conversationId, userId);
        onStopTyping();
      }
    }, this.SERVER_TIMEOUT_MS);

    convMap.set(userId, { debounce, hardTimeout });
    return debounce;
  }

  stopTyping(conversationId: number, userId: number): void {
    const convMap = this.typingTimers.get(conversationId);
    if (!convMap) return;
    const timers = convMap.get(userId);
    if (timers) {
      clearTimeout(timers.debounce);
      clearTimeout(timers.hardTimeout);
      convMap.delete(userId);
    }
    if (convMap.size === 0) this.typingTimers.delete(conversationId);
  }
}
