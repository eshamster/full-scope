import { describe, it, expect } from 'vitest';
import { ImageInfo } from '../image-info.svelte';

describe('ImageInfo', () => {
  describe('constructor', () => {
    it('should create instance with path', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      expect(image.path).toBe('/path/to/image.jpg');
      expect(image.isBookmarked()).toBe(false);
    });
  });

  describe('bookmark functionality', () => {
    it('should toggle bookmark state', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      expect(image.isBookmarked()).toBe(false);

      image.bookmark();
      expect(image.isBookmarked()).toBe(true);

      image.bookmark();
      expect(image.isBookmarked()).toBe(false);
    });

    it('should handle multiple toggles', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      for (let i = 0; i < 10; i++) {
        image.bookmark();
        expect(image.isBookmarked()).toBe(i % 2 === 0);
      }
    });
  });

  describe('immutable path', () => {
    it('should maintain path value', () => {
      const path = '/path/to/image.jpg';
      const image = new ImageInfo(path);

      expect(image.path).toBe(path);

      // Path should remain unchanged after operations
      image.bookmark();
      expect(image.path).toBe(path);
    });
  });
});
