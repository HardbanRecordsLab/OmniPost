import { Post } from '../../../types';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface PublishResult {
  externalId: string;
}

export interface ErrorHandlingResult {
  shouldRetry: boolean;
  reason?: string;
  delayMs?: number;
}

export interface PlatformAdapter {
  validateContent(post: Post): ValidationResult;
  publish(post: Post): Promise<PublishResult>;
  handleErrors(error: any, post: Post): ErrorHandlingResult;
}

export abstract class BaseAdapter implements PlatformAdapter {
  validateContent(post: Post): ValidationResult {
    if (!post?.content || post.content.trim().length === 0) {
      return { valid: false, errors: ['content_required'] };
    }
    return { valid: true };
  }

  abstract publish(post: Post): Promise<PublishResult>;

  handleErrors(error: any, _post: Post): ErrorHandlingResult {
    const code = typeof error?.code === 'number' ? error.code : Number(error?.code);
    if (code === 190) {
      return { shouldRetry: true, reason: 'auth_expired', delayMs: 5 * 60 * 1000 };
    }
    if (code === 368) {
      return { shouldRetry: true, reason: 'rate_limited', delayMs: 15 * 60 * 1000 };
    }
    if (code === 100) {
      return { shouldRetry: true, reason: 'temporary_bad_request', delayMs: 60 * 1000 };
    }
    return { shouldRetry: false, reason: 'non_retryable' };
  }
}
