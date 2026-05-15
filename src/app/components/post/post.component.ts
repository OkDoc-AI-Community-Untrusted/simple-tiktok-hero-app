import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TikTokService, CreatorInfo } from '../../services/tiktok.service';
import { OkDocService } from '../../services/okdoc.service';
import { TikTokAuth } from '../../services/auth-state.service';

const VALID_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
const CAPTION_LIMIT = 2200;

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class PostComponent implements OnInit, OnDestroy {
  @Input() auth!: TikTokAuth;

  caption = '';
  file: File | null = null;
  filePreview: string | null = null;

  creatorInfo: CreatorInfo | null = null;
  privacyLevel = 'SELF_ONLY';

  busy = false;
  error: string | null = null;
  success: string | null = null;

  readonly captionLimit = CAPTION_LIMIT;

  constructor(private tiktok: TikTokService, private okdoc: OkDocService) {}

  ngOnInit(): void {
    this.loadCreatorInfo();
    // Bridge for the `publish_post` OkDoc tool — the SDK channel can't
    // carry a File, so the tool calls back into the visible form.
    (window as any).__tiktokHeroAppBridge = {
      publish: (caption: string, privacyLevel?: string) =>
        this.publishFromTool(caption, privacyLevel),
    };
  }

  ngOnDestroy(): void {
    delete (window as any).__tiktokHeroAppBridge;
  }

  private async loadCreatorInfo(): Promise<void> {
    try {
      this.creatorInfo = await this.tiktok.getCreatorInfo();
      const options = this.creatorInfo.privacyLevelOptions;
      if (options && options.length && !options.includes(this.privacyLevel)) {
        this.privacyLevel = options[0];
      }
    } catch (e: any) {
      // Non-fatal: posting still works with sensible defaults.
      console.warn('Failed to fetch creator info:', e?.message);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!VALID_VIDEO_TYPES.includes(file.type)) {
      this.error = `Unsupported file type: ${file.type || 'unknown'}. Use MP4, WebM, or MOV.`;
      return;
    }
    if (file.size > MAX_BYTES) {
      this.error = 'File exceeds the 4 GB TikTok upload limit.';
      return;
    }
    this.error = null;
    this.file = file;
    this.filePreview = URL.createObjectURL(file);
  }

  clearFile(): void {
    if (this.filePreview) URL.revokeObjectURL(this.filePreview);
    this.file = null;
    this.filePreview = null;
  }

  resetForm(): void {
    this.caption = '';
    this.clearFile();
    this.error = null;
    this.success = null;
  }

  get canSubmit(): boolean {
    return !this.busy && !!this.file && this.caption.trim().length > 0;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit || !this.file) return;
    this.busy = true;
    this.error = null;
    this.success = null;
    try {
      const result = await this.tiktok.publishVideo(
        this.file,
        this.caption,
        this.privacyLevel
      );
      this.success = `Upload started. publish_id: ${result.publishId}`;
      this.okdoc.notifyPostCreated(result.publishId, this.caption);
      this.resetForm();
    } catch (e: any) {
      this.error = e?.message || 'Posting failed.';
    } finally {
      this.busy = false;
    }
  }

  private async publishFromTool(
    caption: string,
    privacyLevel?: string
  ): Promise<{ publishId: string }> {
    if (!this.file) throw new Error('No video selected in the form.');
    if (caption) this.caption = caption;
    if (privacyLevel) this.privacyLevel = privacyLevel;
    const result = await this.tiktok.publishVideo(
      this.file,
      this.caption,
      this.privacyLevel
    );
    this.okdoc.notifyPostCreated(result.publishId, this.caption);
    this.success = `Upload started. publish_id: ${result.publishId}`;
    this.resetForm();
    return result;
  }
}
