import { Injectable } from '@angular/core';
import { AuthStateService } from './auth-state.service';
import { ConfigService } from './config.service';

export interface CreatorInfo {
  creatorAvatarUrl?: string;
  creatorUsername?: string;
  creatorNickname?: string;
  privacyLevelOptions?: string[];
  commentDisabled?: boolean;
  duetDisabled?: boolean;
  stitchDisabled?: boolean;
  maxVideoPostDurationSec?: number;
}

export interface PostResult {
  publishId: string;
}

/**
 * Calls our backend, which proxies to TikTok's v2 Content Posting API.
 * Token exchange and the secret-bearing endpoints stay on the backend;
 * the frontend just forwards the user's access token.
 */
@Injectable({ providedIn: 'root' })
export class TikTokService {
  constructor(
    private state: AuthStateService,
    private config: ConfigService
  ) {}

  async getCreatorInfo(): Promise<CreatorInfo> {
    const res = await this.backend('/api/tiktok/creator-info', { method: 'POST' });
    const data = res.data ?? {};
    return {
      creatorAvatarUrl: data.creator_avatar_url,
      creatorUsername: data.creator_username,
      creatorNickname: data.creator_nickname,
      privacyLevelOptions: data.privacy_level_options,
      commentDisabled: data.comment_disabled,
      duetDisabled: data.duet_disabled,
      stitchDisabled: data.stitch_disabled,
      maxVideoPostDurationSec: data.max_video_post_duration_sec,
    };
  }

  async publishVideo(file: File, caption: string, privacyLevel: string): Promise<PostResult> {
    const init = await this.backend('/api/tiktok/video/init', {
      method: 'POST',
      body: {
        title: caption,
        privacy_level: privacyLevel,
        video_size: file.size,
      },
    });

    const uploadUrl: string = init.data?.upload_url;
    const publishId: string = init.data?.publish_id;
    if (!uploadUrl || !publishId) {
      throw new Error('Backend did not return upload_url and publish_id.');
    }

    await this.uploadFile(uploadUrl, file);
    return { publishId };
  }

  async getPublishStatus(publishId: string): Promise<{ status: string; failReason?: string }> {
    const res = await this.backend('/api/tiktok/publish/status', {
      method: 'POST',
      body: { publish_id: publishId },
    });
    return {
      status: res.data?.status,
      failReason: res.data?.fail_reason,
    };
  }

  private async uploadFile(uploadUrl: string, file: File): Promise<void> {
    // TikTok expects a PUT with Content-Range and Content-Type matching the file.
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'video/mp4',
        'Content-Range': `bytes 0-${file.size - 1}/${file.size}`,
      },
      body: file,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Video upload failed: ${res.status} ${detail}`);
    }
  }

  private async backend(
    path: string,
    init: { method: string; body?: unknown }
  ): Promise<any> {
    const token = this.state.current?.accessToken;
    if (!token) throw new Error('Not authenticated.');

    const res = await fetch(`${this.config.backendUrl}${path}`, {
      method: init.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`${path} failed: ${res.status} ${detail}`);
    }
    return res.json();
  }
}
