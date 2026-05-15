import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthStateService } from './auth-state.service';
import { TikTokService } from './tiktok.service';

declare global {
  interface Window {
    OkDoc?: any;
  }
}

type ToolResult =
  | { type: 'success'; content: unknown }
  | { type: 'error'; content: { message: string } };

@Injectable({ providedIn: 'root' })
export class OkDocService {
  private sdk: any = null;
  private initialized = false;

  constructor(
    private zone: NgZone,
    private authState: AuthStateService,
    private auth: AuthService,
    private tiktok: TikTokService
  ) {}

  init(): void {
    if (this.initialized) return;
    this.waitForSdk(0);
    this.authState.auth$.subscribe((auth) => {
      this.sdk?.notify?.({
        type: 'auth_state_changed',
        data: {
          isAuthenticated: !!auth,
          user: auth
            ? { openId: auth.openId, username: auth.username, displayName: auth.displayName }
            : null,
        },
      });
    });
  }

  notifyPostCreated(publishId: string, caption: string): void {
    this.sdk?.notify?.({
      type: 'post_published',
      data: { publishId, caption, timestamp: new Date().toISOString() },
    });
  }

  private waitForSdk(attempt: number): void {
    if (window.OkDoc) {
      this.sdk = window.OkDoc;
      this.registerWithHost();
      this.initialized = true;
      return;
    }
    // Try for ~10s then give up — the app still works standalone for dev.
    if (attempt > 100) return;
    setTimeout(() => this.waitForSdk(attempt + 1), 100);
  }

  private registerWithHost(): void {
    this.sdk.init({
      id: 'simple-tiktok-hero-app',
      name: 'Simple TikTok Hero App',
      namespace: 'tiktok',
      version: '1.0.0',
      author: 'OkDoc Community',
      mode: 'foreground',
    });

    this.registerTool({
      id: 'login',
      name: 'Login to TikTok',
      description: 'Open the TikTok login popup so the user can authenticate.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        await this.auth.startOAuthFlow();
        return ok({ message: 'Logged in to TikTok.' });
      },
    });

    this.registerTool({
      id: 'logout',
      name: 'Logout',
      description: 'Sign the current TikTok user out and clear stored credentials.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        this.auth.logout();
        return ok({ message: 'Logged out.' });
      },
    });

    this.registerTool({
      id: 'get_user_info',
      name: 'Get User Info',
      description: 'Return the currently authenticated TikTok user, if any.',
      inputSchema: { type: 'object', properties: {}, required: [] },
      handler: async () => {
        const auth = this.authState.current;
        if (!auth) return err('Not authenticated.');
        return ok({
          openId: auth.openId,
          username: auth.username,
          displayName: auth.displayName,
          avatarUrl: auth.avatarUrl,
        });
      },
    });

    this.registerTool({
      id: 'publish_post',
      name: 'Publish TikTok Post',
      description:
        'Publish a TikTok post. Requires a video file already chosen in the UI — ' +
        'this tool cannot accept files over the SDK channel, so the user must ' +
        'select a file in the post form before calling it.',
      inputSchema: {
        type: 'object',
        properties: {
          caption: { type: 'string', description: 'Caption / post title.' },
          privacy_level: {
            type: 'string',
            description: 'Privacy level (e.g. SELF_ONLY, PUBLIC_TO_EVERYONE).',
          },
        },
        required: ['caption'],
      },
      handler: async (input: any) => {
        // Bridge to the visible PostComponent via a window-scoped hook so the
        // user-selected file stays in the iframe (where the user picked it).
        const bridge = (window as any).__tiktokHeroAppBridge;
        if (!bridge?.publish) {
          return err('Open the app UI and select a video first.');
        }
        const result = await bridge.publish(input?.caption ?? '', input?.privacy_level);
        return ok(result);
      },
    });
  }

  /** Wraps the host-supplied handler so state mutations land inside Angular's zone. */
  private registerTool(tool: {
    id: string;
    name: string;
    description: string;
    inputSchema: unknown;
    handler: (input: any) => Promise<ToolResult>;
  }): void {
    this.sdk.registerTool({
      ...tool,
      handler: (input: any) =>
        this.zone.run(async () => {
          try {
            return await tool.handler(input);
          } catch (e: any) {
            return err(e?.message || String(e));
          }
        }),
    });
  }
}

function ok(content: unknown): ToolResult {
  return { type: 'success', content };
}

function err(message: string): ToolResult {
  return { type: 'error', content: { message } };
}
