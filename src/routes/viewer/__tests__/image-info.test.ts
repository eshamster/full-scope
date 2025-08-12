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

  describe('local rotation functionality', () => {
    it('should initialize with 0 degree rotation', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      expect(image.getLocalRotation()).toBe(0);
    });

    it('should rotate right by 90 degrees', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      image.rotateLocalRight();
      expect(image.getLocalRotation()).toBe(90);

      image.rotateLocalRight();
      expect(image.getLocalRotation()).toBe(180);

      image.rotateLocalRight();
      expect(image.getLocalRotation()).toBe(270);

      image.rotateLocalRight();
      expect(image.getLocalRotation()).toBe(0);
    });

    it('should rotate left by 90 degrees', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      image.rotateLocalLeft();
      expect(image.getLocalRotation()).toBe(270);

      image.rotateLocalLeft();
      expect(image.getLocalRotation()).toBe(180);

      image.rotateLocalLeft();
      expect(image.getLocalRotation()).toBe(90);

      image.rotateLocalLeft();
      expect(image.getLocalRotation()).toBe(0);
    });

    it('should handle combined right and left rotations', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      image.rotateLocalRight();
      image.rotateLocalRight();
      expect(image.getLocalRotation()).toBe(180);

      image.rotateLocalLeft();
      expect(image.getLocalRotation()).toBe(90);

      image.rotateLocalLeft();
      image.rotateLocalLeft();
      expect(image.getLocalRotation()).toBe(270);
    });

    it('should maintain rotation independent of bookmark operations', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      image.rotateLocalRight();
      image.bookmark();
      expect(image.getLocalRotation()).toBe(90);
      expect(image.isBookmarked()).toBe(true);

      image.rotateLocalLeft();
      expect(image.getLocalRotation()).toBe(0);
      expect(image.isBookmarked()).toBe(true);
    });
  });
});
