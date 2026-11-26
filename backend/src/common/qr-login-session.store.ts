import { randomBytes } from 'crypto';

export interface QrLoginSession {
  status: 'pending' | 'scanned' | 'confirmed';
  expiresAt: number;
  technicianId?: number;
}

const QR_SESSION_TTL_MS = 3 * 60 * 1000;
const MAX_QR_SESSIONS = 5000;

class QrLoginSessionStore {
  private readonly sessions = new Map<string, QrLoginSession>();

  private prune(now = Date.now()) {
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(token);
      }
    }
    while (this.sessions.size >= MAX_QR_SESSIONS) {
      const oldestKey = this.sessions.keys().next().value;
      if (!oldestKey) break;
      this.sessions.delete(oldestKey);
    }
  }

  create(): { sceneToken: string; expiresAt: number } {
    const now = Date.now();
    this.prune(now);
    const sceneToken = randomBytes(16).toString('hex');
    const expiresAt = now + QR_SESSION_TTL_MS;
    this.sessions.set(sceneToken, { status: 'pending', expiresAt });
    return { sceneToken, expiresAt };
  }

  get(sceneToken: string): QrLoginSession | null {
    if (!sceneToken) return null;
    const session = this.sessions.get(sceneToken);
    if (!session || Date.now() > session.expiresAt) {
      this.sessions.delete(sceneToken);
      return null;
    }
    return session;
  }

  markScanned(sceneToken: string): boolean {
    const session = this.get(sceneToken);
    if (!session) return false;
    if (session.status === 'pending') {
      session.status = 'scanned';
    }
    return true;
  }

  confirm(sceneToken: string, technicianId: number): boolean {
    const session = this.get(sceneToken);
    if (!session) return false;
    session.status = 'confirmed';
    session.technicianId = technicianId;
    return true;
  }

  delete(sceneToken: string) {
    this.sessions.delete(sceneToken);
  }
}

export const qrLoginSessionStore = new QrLoginSessionStore();
