import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TikTokService, PostData } from '../../services/tiktok.service';
import { OkDocService } from '../../services/okdoc.service';

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class PostComponent implements OnInit {
  @Input() user: any;

  caption = '';
  selectedFile: File | null = null;
  selectedFileName = '';
  isPosting = false;
  postError: string | null = null;
  postSuccess: string | null = null;
  videoPreview: string | null = null;

  constructor(
    private tiktokService: TikTokService,
    private okDocService: OkDocService
  ) {}

  ngOnInit(): void {
    this.resetForm();
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];

    if (file) {
      const validTypes = ['video/mp4', 'video/webm', 'image/jpeg', 'image/png'];
      const maxSize = 4 * 1024 * 1024 * 1024;

      if (!validTypes.includes(file.type)) {
        this.postError = 'Only MP4, WebM video and image files are supported';
        return;
      }

      if (file.size > maxSize) {
        this.postError = 'File size exceeds 4GB limit';
        return;
      }

      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.postError = null;

      if (file.type.startsWith('video/')) {
        this.createVideoPreview(file);
      } else if (file.type.startsWith('image/')) {
        this.createImagePreview(file);
      }
    }
  }

  private createVideoPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.videoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  private createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.videoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.videoPreview = null;
  }

  async submitPost(): Promise<void> {
    if (!this.caption.trim() && !this.selectedFile) {
      this.postError = 'Please add a caption or select a file';
      return;
    }

    this.isPosting = true;
    this.postError = null;
    this.postSuccess = null;

    try {
      const postData: PostData = {
        caption: this.caption,
        videoFile: this.selectedFile || undefined,
      };

      const result = await this.tiktokService.createPost(postData);

      if (result.success) {
        this.postSuccess = 'Post created successfully!';
        this.okDocService.notifyPostCreated(
          result.videoId || '',
          this.caption
        );
        this.resetForm();

        setTimeout(() => {
          this.postSuccess = null;
        }, 3000);
      } else {
        this.postError = result.error || 'Failed to create post';
      }
    } catch (error: any) {
      this.postError = error.message || 'An error occurred';
    } finally {
      this.isPosting = false;
    }
  }

  resetForm(): void {
    this.caption = '';
    this.selectedFile = null;
    this.selectedFileName = '';
    this.videoPreview = null;
    this.postError = null;
    this.postSuccess = null;
  }

  get charCount(): number {
    return this.caption.length;
  }

  get charLimit(): number {
    return 2200;
  }

  get canSubmit(): boolean {
    return (
      (this.caption.trim().length > 0 || this.selectedFile !== null) &&
      !this.isPosting
    );
  }
}
