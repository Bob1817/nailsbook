import { Injectable } from '@nestjs/common';

export interface UserPresence {
  userType: 'client' | 'technician';
  connectionCount: number;
}

@Injectable()
export class PresenceService {
  private onlineUsers = new Map<number, UserPresence>();

  userConnected(userId: number, userType: 'client' | 'technician'): 'joined' | 'already_online' {
    const existing = this.onlineUsers.get(userId);
    if (existing) {
      existing.connectionCount++;
      return 'already_online';
    }
    this.onlineUsers.set(userId, { userType, connectionCount: 1 });
    return 'joined';
  }

  userDisconnected(userId: number): 'left' | 'still_online' {
    const existing = this.onlineUsers.get(userId);
    if (!existing) return 'still_online';
    existing.connectionCount--;
    if (existing.connectionCount <= 0) {
      this.onlineUsers.delete(userId);
      return 'left';
    }
    return 'still_online';
  }

  isOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  getOnlineUsers(): Array<{ userId: number; userType: string }> {
    const result: Array<{ userId: number; userType: string }> = [];
    for (const [userId, presence] of this.onlineUsers.entries()) {
      result.push({ userId, userType: presence.userType });
    }
    return result;
  }
}
