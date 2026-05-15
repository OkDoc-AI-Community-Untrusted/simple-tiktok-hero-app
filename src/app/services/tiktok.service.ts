import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export interface PostData {
  caption: string;
  videoFile?: File;
  imageFile?: File;
  coverImageUrl?: string;
}

export interface PostResponse {
  success: boolean;
  videoId?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TikTokService {
  private readonly API_BASE_URL = 'https://open.tiktokapis.com/v1';
  private readonly BACKEND_BASE_URL =
    localStorage.getItem('backend_url') || 'http://localhost:3000';

  constructor(private authService: AuthService) {}

  async uploadVideo(file: File): Promise<{ uploadUrl: string; uploadId: string }> {
    const accessToken = this.authService.getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const formData = new FormData();
    formData.append('video', file);
    formData.append('access_token', accessToken);

    const response = await fetch(
      `${this.BACKEND_BASE_URL}/api/tiktok/upload/init`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initialize upload');
    }

    return await response.json();
  }

  async createPost(postData: PostData): Promise<PostResponse> {
    const accessToken = this.authService.getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    try {
      let videoId: string | undefined;

      if (postData.videoFile) {
        const uploadData = await this.uploadVideo(postData.videoFile);
        videoId = uploadData.uploadId;
      }

      const response = await fetch(
        `${this.BACKEND_BASE_URL}/api/tiktok/post/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            caption: postData.caption,
            videoId: videoId,
            coverImageUrl: postData.coverImageUrl,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to create post',
        };
      }

      const result = await response.json();
      return {
        success: true,
        videoId: result.video_id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred',
      };
    }
  }

  async getUserInfo(): Promise<any> {
    const accessToken = this.authService.getAccessToken();
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${this.BACKEND_BASE_URL}/api/tiktok/user/info`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    return await response.json();
  }
}
