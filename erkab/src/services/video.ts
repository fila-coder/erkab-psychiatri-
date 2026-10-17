/**
 * Provider-independent VideoMeetingService.
 * Local adapter creates clearly labelled test meeting records — never real join URLs.
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
  message: string;
  isTestMeeting: boolean;
}

export interface VideoMeetingService {
  createMeeting(input: CreateMeetingInput): Promise<MeetingResult>;
  getMeeting(meetingId: string): Promise<MeetingRecord | null>;
}

class LocalVideoService implements VideoMeetingService {
  async createMeeting(input: CreateMeetingInput): Promise<MeetingResult> {
    const configured = import.meta.env.VITE_VIDEO_PROVIDER;
    if (!configured || configured === 'none' || configured === 'unconfigured') {
      const meeting: MeetingRecord = {
        id: `meet-test-${Date.now()}`,
        appointmentId: input.appointmentId,
        status: 'SCHEDULED',
        provider: 'local',
        joinHint:
          'Test meeting only — no external video link. Connect Zoom/Meet and a backend function to create real meetings.',
        isTestMeeting: true,
        createdAt: new Date().toISOString(),
      };
      await getRepositories().meetings.create(meeting);
      return {
        status: 'unconfigured',
        meetingId: meeting.id,
        message: meeting.joinHint!,
        isTestMeeting: true,
      };
    }
    return {
      status: 'unconfigured',
      message: 'Video provider selected but backend adapter not deployed yet.',
      isTestMeeting: true,
    };
  }

  async getMeeting(meetingId: string) {
    return getRepositories().meetings.get(meetingId);
  }
}

export const videoService: VideoMeetingService = new LocalVideoService();
