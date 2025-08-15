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

  describe('scale functionality', () => {
    it('should initialize with 100% scale', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      expect(image.getScalePercent()).toBe(100);
      expect(image.getScaleRatio()).toBe(1.0);
    });

    it('should scale up by 10% increments', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      image.scaleUp();
      expect(image.getScalePercent()).toBe(110);
      expect(image.getScaleRatio()).toBe(1.1);

      image.scaleUp();
      expect(image.getScalePercent()).toBe(120);
      expect(image.getScaleRatio()).toBe(1.2);
    });

    it('should scale down by 10% increments', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      image.scaleDown();
      expect(image.getScalePercent()).toBe(90);
      expect(image.getScaleRatio()).toBe(0.9);

      image.scaleDown();
      expect(image.getScalePercent()).toBe(80);
      expect(image.getScaleRatio()).toBe(0.8);
    });

    it('should enforce maximum scale limit of 1000%', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      // Scale up to maximum
      for (let i = 0; i < 100; i++) {
        image.scaleUp();
      }

      expect(image.getScalePercent()).toBe(1000);
      expect(image.getScaleRatio()).toBe(10.0);

      // Try to scale beyond maximum
      image.scaleUp();
      expect(image.getScalePercent()).toBe(1000);
    });

    it('should enforce minimum scale limit of 10%', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      // Scale down to minimum
      for (let i = 0; i < 20; i++) {
        image.scaleDown();
      }

      expect(image.getScalePercent()).toBe(10);
      expect(image.getScaleRatio()).toBe(0.1);

      // Try to scale below minimum
      image.scaleDown();
      expect(image.getScalePercent()).toBe(10);
    });

    it('should handle combined scale operations', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      image.scaleUp();
      image.scaleUp();
      expect(image.getScalePercent()).toBe(120);

      image.scaleDown();
      expect(image.getScalePercent()).toBe(110);

      image.scaleDown();
      image.scaleDown();
      expect(image.getScalePercent()).toBe(90);
    });
  });

  describe('position functionality', () => {
    it('should initialize with (0, 0) position', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      expect(image.getPositionX()).toBe(0);
      expect(image.getPositionY()).toBe(0);
    });

    it('should move position by delta values', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      image.movePosition(10, 20);
      expect(image.getPositionX()).toBe(10);
      expect(image.getPositionY()).toBe(20);

      image.movePosition(-5, 15);
      expect(image.getPositionX()).toBe(5);
      expect(image.getPositionY()).toBe(35);
    });

    it('should handle negative position values', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      image.movePosition(-25, -30);
      expect(image.getPositionX()).toBe(-25);
      expect(image.getPositionY()).toBe(-30);
    });

    it('should accumulate position changes correctly', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      const moves = [
        { x: 10, y: 5 },
        { x: -3, y: 8 },
        { x: 7, y: -12 },
        { x: -5, y: 2 }
      ];

      let expectedX = 0;
      let expectedY = 0;

      moves.forEach(move => {
        image.movePosition(move.x, move.y);
        expectedX += move.x;
        expectedY += move.y;

        expect(image.getPositionX()).toBe(expectedX);
        expect(image.getPositionY()).toBe(expectedY);
      });
    });
  });

  describe('transform reset functionality', () => {
    it('should reset all transform values to defaults', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      // Apply various transformations
      image.scaleUp();
      image.scaleUp();
      image.rotateLocalRight();
      image.movePosition(50, -25);

      // Verify transformations were applied
      expect(image.getScalePercent()).toBe(120);
      expect(image.getLocalRotation()).toBe(90);
      expect(image.getPositionX()).toBe(50);
      expect(image.getPositionY()).toBe(-25);

      // Reset all transforms
      image.resetTransform();

      // Verify all values are reset to defaults
      expect(image.getScalePercent()).toBe(100);
      expect(image.getScaleRatio()).toBe(1.0);
      expect(image.getLocalRotation()).toBe(0);
      expect(image.getPositionX()).toBe(0);
      expect(image.getPositionY()).toBe(0);
    });

    it('should not affect bookmark state when resetting transforms', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      // Set bookmark and apply transformations
      image.bookmark();
      image.scaleUp();
      image.rotateLocalRight();
      image.movePosition(10, 10);

      expect(image.isBookmarked()).toBe(true);

      // Reset transforms
      image.resetTransform();

      // Bookmark should remain unchanged
      expect(image.isBookmarked()).toBe(true);
    });

    it('should reset transforms multiple times correctly', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      for (let i = 0; i < 3; i++) {
        // Apply transformations
        image.scaleUp();
        image.rotateLocalRight();
        image.movePosition(i * 10, i * 5);

        // Reset transforms
        image.resetTransform();

        // Verify reset state
        expect(image.getScalePercent()).toBe(100);
        expect(image.getLocalRotation()).toBe(0);
        expect(image.getPositionX()).toBe(0);
        expect(image.getPositionY()).toBe(0);
      }
    });
  });

  describe('transform operations independence', () => {
    it('should maintain independent state for each transform type', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      // Apply scale transformation
      image.scaleUp();
      expect(image.getScalePercent()).toBe(110);
      expect(image.getLocalRotation()).toBe(0);
      expect(image.getPositionX()).toBe(0);
      expect(image.getPositionY()).toBe(0);

      // Apply rotation transformation
      image.rotateLocalRight();
      expect(image.getScalePercent()).toBe(110);
      expect(image.getLocalRotation()).toBe(90);
      expect(image.getPositionX()).toBe(0);
      expect(image.getPositionY()).toBe(0);

      // Apply position transformation
      image.movePosition(15, -10);
      expect(image.getScalePercent()).toBe(110);
      expect(image.getLocalRotation()).toBe(90);
      expect(image.getPositionX()).toBe(15);
      expect(image.getPositionY()).toBe(-10);
    });

    it('should handle complex transformation sequences', () => {
      const image = new ImageInfo('/path/to/image.jpg');

      // Complex sequence of operations
      image.scaleUp(); // 110%
      image.rotateLocalRight(); // 90°
      image.movePosition(20, 30); // (20, 30)
      image.scaleDown(); // 100%
      image.rotateLocalLeft(); // 0°
      image.movePosition(-10, -5); // (10, 25)
      image.scaleUp(); // 110%
      image.scaleUp(); // 120%

      expect(image.getScalePercent()).toBe(120);
      expect(image.getLocalRotation()).toBe(0);
      expect(image.getPositionX()).toBe(10);
      expect(image.getPositionY()).toBe(25);
    });
  });
});
