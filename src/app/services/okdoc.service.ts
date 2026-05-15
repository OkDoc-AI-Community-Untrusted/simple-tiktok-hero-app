import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { TikTokService } from './tiktok.service';

declare global {
  interface Window {
    OkDoc?: any;
  }
}

export interface ToolResult {
  type: string;
  content: any;
}

@Injectable({
  providedIn: 'root',
})
export class OkDocService {
  private okDocSDK: any = null;
  private isInitialized = false;

  constructor(
    private authService: AuthService,
    private tiktokService: TikTokService
  ) {}

  initializeOkDoc(): void {
    if (this.isInitialized) {
      return;
    }

    const checkOkDoc = () => {
      if (window.OkDoc) {
        this.okDocSDK = window.OkDoc;
        this.setupTools();
        this.isInitialized = true;
      } else {
        setTimeout(checkOkDoc, 100);
      }
    };

    checkOkDoc();
  }

  private setupTools(): void {
    if (!this.okDocSDK) {
      return;
    }

    this.okDocSDK.init({
      id: 'simple-tiktok-hero-app',
      name: 'Simple TikTok Hero App',
      namespace: 'tiktok',
      version: '1.0.0',
      author: 'TikTok Hero App Community',
      mode: 'foreground',
    });

    this.registerLoginTool();
    this.registerPostTool();
    this.registerLogoutTool();
    this.registerGetUserInfoTool();
  }

  private registerLoginTool(): void {
    this.okDocSDK.registerTool({
      id: 'login',
      name: 'Login to TikTok',
      description:
        'Authenticate with TikTok account to enable posting capabilities',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (): Promise<ToolResult> => {
        try {
          this.authService.startOAuthFlow();
          return {
            type: 'success',
            content: {
              message: 'Redirecting to TikTok login...',
            },
          };
        } catch (error: any) {
          return {
            type: 'error',
            content: {
              message: error.message || 'Failed to initiate login',
            },
          };
        }
      },
    });
  }

  private registerPostTool(): void {
    this.okDocSDK.registerTool({
      id: 'create_post',
      name: 'Create TikTok Post',
      description:
        'Create a new TikTok post with caption and optional video file',
      inputSchema: {
        type: 'object',
        properties: {
          caption: {
            type: 'string',
            description: 'The caption/text for the post',
          },
          videoUrl: {
            type: 'string',
            description:
              'Optional URL to a video file to upload (must be MP4 or WebM)',
          },
        },
        required: ['caption'],
      },
      handler: async (input: any): Promise<ToolResult> => {
        try {
          if (!this.authService.isAuthenticated()) {
            return {
              type: 'error',
              content: {
                message: 'Not authenticated. Please login first.',
              },
            };
          }

          const result = await this.tiktokService.createPost({
            caption: input.caption,
            coverImageUrl: input.videoUrl,
          });

          if (result.success) {
            return {
              type: 'success',
              content: {
                message: 'Post created successfully!',
                videoId: result.videoId,
              },
            };
          } else {
            return {
              type: 'error',
              content: {
                message: result.error || 'Failed to create post',
              },
            };
          }
        } catch (error: any) {
          return {
            type: 'error',
            content: {
              message: error.message || 'An error occurred while creating post',
            },
          };
        }
      },
    });
  }

  private registerLogoutTool(): void {
    this.okDocSDK.registerTool({
      id: 'logout',
      name: 'Logout',
      description: 'Logout from TikTok Hero App',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (): Promise<ToolResult> => {
        try {
          this.authService.logout();
          return {
            type: 'success',
            content: {
              message: 'Logged out successfully',
            },
          };
        } catch (error: any) {
          return {
            type: 'error',
            content: {
              message: error.message || 'Failed to logout',
            },
          };
        }
      },
    });
  }

  private registerGetUserInfoTool(): void {
    this.okDocSDK.registerTool({
      id: 'get_user_info',
      name: 'Get User Info',
      description: 'Retrieve current authenticated user information',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
      handler: async (): Promise<ToolResult> => {
        try {
          const auth = this.authService.getStoredAuth();
          if (!auth) {
            return {
              type: 'error',
              content: {
                message: 'Not authenticated',
              },
            };
          }

          return {
            type: 'success',
            content: {
              userId: auth.userId,
              username: auth.username,
              displayName: auth.displayName,
              profileImageUrl: auth.profileImageUrl,
            },
          };
        } catch (error: any) {
          return {
            type: 'error',
            content: {
              message: error.message || 'Failed to get user info',
            },
          };
        }
      },
    });
  }

  notifyPostCreated(videoId: string, caption: string): void {
    if (!this.okDocSDK) {
      return;
    }

    this.okDocSDK.notify({
      type: 'post_created',
      data: {
        videoId,
        caption,
        timestamp: new Date().toISOString(),
      },
    });
  }

  notifyAuthStateChanged(isAuthenticated: boolean, user?: any): void {
    if (!this.okDocSDK) {
      return;
    }

    this.okDocSDK.notify({
      type: 'auth_state_changed',
      data: {
        isAuthenticated,
        user: user || null,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
