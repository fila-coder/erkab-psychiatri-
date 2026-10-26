/**
 * Video meetings — Jitsi Meet (free, iframe-friendly).
 * Room: https://meet.jit.si/erkab-{appointmentId}
 */

import { getRepositories } from '../repositories';
import type { MeetingRecord } from '../types';

export interface CreateMeetingInput {
  appointmentId: string;
  startAt: string;
  durationMin: number;
  topic: string;
}

export interface MeetingResult {
  status: 'unconfigured' | 'scheduled' | 'failed';
  meetingId?: string;
  joinUrl?: string;
  message: string;
  isTestMeeting: boolean;
}

export interface VideoMeetingService {
  createMeeting(input: CreateMeetingInput): Promise<MeetingResult>;
  getMeeting(meetingId: string): Promise<MeetingRecord | null>;
  getJoinUrlForAppointment(appointmentId: string): string;
}

function jitsiRoomUrl(appointmentId: string): string {
  const safe = appointmentId.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 64) || 'session';
  return `https://meet.jit.si/erkab-${safe}`;
}

class JitsiVideoService implements VideoMeetingService {
  getJoinUrlForAppointment(appointmentId: string): string {
    return jitsiRoomUrl(appointmentId);
  }

  async createMeeting(input: CreateMeetingInput): Promise<MeetingResult> {
    const joinUrl = jitsiRoomUrl(input.appointmentId);
    const meeting: MeetingRecord = {
      id: `meet-jitsi-${input.appointmentId}`,
      appointmentId: input.appointmentId,
      status: 'SCHEDULED',
      provider: 'jitsi',
      joinHint: joinUrl,
      joinUrl,
      isTestMeeting: false,
      createdAt: new Date().toISOString(),
    };
    try {
      await getRepositories().meetings.create(meeting);
    } catch {
      /* ignore duplicate */
    }
    return {
      status: 'scheduled',
      meetingId: meeting.id,
      joinUrl,
      message: 'Jitsi room ready. Open Join session to enter the video call.',
      isTestMeeting: false,
    };
  }

  async getMeeting(meetingId: string) {
    return getRepositories().meetings.get(meetingId);
  }
}

class UnconfiguredVideoService implements VideoMeetingService {
  getJoinUrlForAppointment(appointmentId: string): string {
    return jitsiRoomUrl(appointmentId);
  }

  async createMeeting(input: CreateMeetingInput): Promise<MeetingResult> {
    const meeting: MeetingRecord = {
      id: `meet-test-${Date.now()}`,
      appointmentId: input.appointmentId,
      status: 'SCHEDULED',
      provider: 'local',
      joinHint:
        'Video not configured. Set VITE_VIDEO_PROVIDER=jitsi for embedded Jitsi Meet.',
      isTestMeeting: true,
      createdAt: new Date().toISOString(),
    };
    try {
      await getRepositories().meetings.create(meeting);
    } catch {
      /* ignore */
    }
    return {
      status: 'unconfigured',
      meetingId: meeting.id,
      message: meeting.joinHint!,
      isTestMeeting: true,
    };
  }

  async getMeeting(meetingId: string) {
    return getRepositories().meetings.get(meetingId);
  }
}

function buildService(): VideoMeetingService {
  const p = (import.meta.env.VITE_VIDEO_PROVIDER as string | undefined)?.toLowerCase();
  if (p === 'jitsi') return new JitsiVideoService();
  return new UnconfiguredVideoService();
}

export const videoService: VideoMeetingService = buildService();

export function jitsiJoinUrl(appointmentId: string): string {
  return jitsiRoomUrl(appointmentId);
}
