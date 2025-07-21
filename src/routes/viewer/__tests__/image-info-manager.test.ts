import { describe, it, expect, beforeEach } from 'vitest';
import { ImageInfoManager } from '../image-info-manager.svelte';
import { ImageInfo } from '../image-info';

describe('ImageInfoManager', () => {
  let manager: ImageInfoManager;
  let testImages: ImageInfo[];

  beforeEach(() => {
    manager = new ImageInfoManager();
    testImages = [
      new ImageInfo('/path/to/image1.jpg'),
      new ImageInfo('/path/to/image2.png'),
      new ImageInfo('/path/to/image3.gif'),
    ];
  });

  describe('addImages', () => {
    it('should add new images to the list', async () => {
      await manager.addImages(testImages);

      expect(manager.getList()).toHaveLength(3);
      expect(manager.getList()[0].path).toBe('/path/to/image1.jpg');
      expect(manager.getList()[1].path).toBe('/path/to/image2.png');
      expect(manager.getList()[2].path).toBe('/path/to/image3.gif');
    });

    it('should prevent duplicate images', async () => {
      await manager.addImages(testImages);
      await manager.addImages([testImages[0], new ImageInfo('/path/to/image4.webp')]);

      expect(manager.getList()).toHaveLength(4);
      expect(manager.getList().map(img => img.path)).toEqual([
        '/path/to/image1.jpg',
        '/path/to/image2.png',
        '/path/to/image3.gif',
        '/path/to/image4.webp',
      ]);
    });

    it('should handle empty array', async () => {
      await manager.addImages([]);

      expect(manager.getList()).toHaveLength(0);
    });
  });

  describe('getCurrent', () => {
    it('should return current image', async () => {
      await manager.addImages(testImages);

      const current = manager.getCurrent();
      expect(current.path).toBe('/path/to/image1.jpg');
    });

    it('should throw error when no images', () => {
      expect(() => manager.getCurrent()).toThrow('No images');
    });
  });

  describe('getCaret', () => {
    it('should return current position', async () => {
      await manager.addImages(testImages);

      expect(manager.getCaret()).toBe(0);
    });
  });

  describe('navigation methods', () => {
    beforeEach(async () => {
      await manager.addImages(testImages);
    });

    describe('gotoNext', () => {
      it('should move to next image', () => {
        manager.gotoNext();

        expect(manager.getCaret()).toBe(1);
        expect(manager.getCurrent().path).toBe('/path/to/image2.png');
      });

      it('should wrap to first image at end', () => {
        manager.gotoAt(2); // Move to last image
        manager.gotoNext();

        expect(manager.getCaret()).toBe(0);
        expect(manager.getCurrent().path).toBe('/path/to/image1.jpg');
      });

      it('should handle step parameter', () => {
        manager.gotoNext(2);

        expect(manager.getCaret()).toBe(2);
        expect(manager.getCurrent().path).toBe('/path/to/image3.gif');
      });

      it('should clamp to last image when step exceeds bounds', () => {
        manager.gotoNext(10);

        expect(manager.getCaret()).toBe(2);
        expect(manager.getCurrent().path).toBe('/path/to/image3.gif');
      });
    });

    describe('gotoPrev', () => {
      it('should move to previous image', () => {
        manager.gotoAt(1);
        manager.gotoPrev();

        expect(manager.getCaret()).toBe(0);
        expect(manager.getCurrent().path).toBe('/path/to/image1.jpg');
      });

      it('should wrap to last image at beginning', () => {
        manager.gotoPrev();

        expect(manager.getCaret()).toBe(2);
        expect(manager.getCurrent().path).toBe('/path/to/image3.gif');
      });

      it('should handle step parameter', () => {
        manager.gotoAt(2);
        manager.gotoPrev(2);

        expect(manager.getCaret()).toBe(0);
        expect(manager.getCurrent().path).toBe('/path/to/image1.jpg');
      });

      it('should clamp to first image when step exceeds bounds', () => {
        manager.gotoAt(1);
        manager.gotoPrev(10);

        expect(manager.getCaret()).toBe(0);
        expect(manager.getCurrent().path).toBe('/path/to/image1.jpg');
      });
    });

    describe('gotoRandom', () => {
      it('should not change position with single image', async () => {
        const singleManager = new ImageInfoManager();
        await singleManager.addImages([testImages[0]]);

        singleManager.gotoRandom();

        expect(singleManager.getCaret()).toBe(0);
      });

      it('should move to different position with multiple images', () => {
        const initialCaret = manager.getCaret();

        // Try multiple times to ensure randomness works
        let moved = false;
        for (let i = 0; i < 10; i++) {
          manager.gotoRandom();
          if (manager.getCaret() !== initialCaret) {
            moved = true;
            break;
          }
        }

        expect(moved).toBe(true);
      });
    });

    describe('gotoAt', () => {
      it('should move to specified position', () => {
        manager.gotoAt(1);

        expect(manager.getCaret()).toBe(1);
        expect(manager.getCurrent().path).toBe('/path/to/image2.png');
      });

      it('should clamp to valid range', () => {
        manager.gotoAt(-1);
        expect(manager.getCaret()).toBe(0);

        manager.gotoAt(10);
        expect(manager.getCaret()).toBe(2);
      });
    });
  });

  describe('bookmark functionality', () => {
    beforeEach(async () => {
      await manager.addImages(testImages);
    });

    it('should bookmark current image', () => {
      manager.bookmarkCurrent();

      expect(manager.getCurrent().isBookmarked()).toBe(true);
      expect(manager.countBookmarked()).toBe(1);
    });

    it('should toggle bookmark state', () => {
      manager.bookmarkCurrent();
      expect(manager.getCurrent().isBookmarked()).toBe(true);

      manager.bookmarkCurrent();
      expect(manager.getCurrent().isBookmarked()).toBe(false);
      expect(manager.countBookmarked()).toBe(0);
    });

    it('should navigate to next bookmark', () => {
      // Bookmark second image
      manager.gotoAt(1);
      manager.bookmarkCurrent();

      // Go back to first image
      manager.gotoAt(0);

      // Navigate to next bookmark
      manager.gotoNextBookmark();

      expect(manager.getCaret()).toBe(1);
      expect(manager.getCurrent().isBookmarked()).toBe(true);
    });

    it('should wrap around when searching for bookmarks', () => {
      // Bookmark first image
      manager.gotoAt(0);
      manager.bookmarkCurrent();

      // Move to last image
      manager.gotoAt(2);

      // Navigate to next bookmark should wrap to first
      manager.gotoNextBookmark();

      expect(manager.getCaret()).toBe(0);
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      await manager.addImages(testImages);
    });

    it('should delete current image', () => {
      const initialLength = manager.getList().length;
      const currentPath = manager.getCurrent().path;

      manager.deleteCurrent();

      expect(manager.getList()).toHaveLength(initialLength - 1);
      expect(manager.getList().find(img => img.path === currentPath)).toBeUndefined();
    });

    it('should maintain valid caret after deletion at end', () => {
      manager.gotoAt(2); // Move to last image
      manager.deleteCurrent();

      // Caret should be adjusted to valid position
      expect(manager.getCaret()).toBe(1);
      expect(manager.getCurrent().path).toBe('/path/to/image2.png');
    });

    it('should handle deletion of all images gracefully', () => {
      manager.deleteCurrent();
      manager.deleteCurrent();
      manager.deleteCurrent();

      expect(manager.getList()).toHaveLength(0);
      expect(() => manager.getCurrent()).toThrow('No images');
    });
  });

  describe('edge cases', () => {
    it('should handle getCurrentList with count parameter', async () => {
      await manager.addImages(testImages);

      expect(() => manager.getCurrentList(0)).toThrow('Invalid count');
      expect(() => manager.getCurrentList(-1)).toThrow('Invalid count');

      const result = manager.getCurrentList(2);
      expect(result).toHaveLength(2);
      expect(result[0]!.path).toBe('/path/to/image1.jpg');
      expect(result[1]!.path).toBe('/path/to/image2.png');
    });

    it('should handle getCurrentList when count exceeds available images', async () => {
      await manager.addImages(testImages);
      manager.gotoAt(2);

      const result = manager.getCurrentList(5);
      expect(result).toHaveLength(1); // Only one image from current position
      expect(result[0]!.path).toBe('/path/to/image3.gif');
    });

    it('should handle getCurrentList with empty list', () => {
      expect(() => manager.getCurrentList(1)).toThrow('No images');
    });
  });

  describe('image info display', () => {
    beforeEach(async () => {
      await manager.addImages(testImages);
    });

    it('should start with image info display hidden', () => {
      expect(manager.isImageInfoDisplayed()).toBe(false);
    });

    it('should toggle image info display state', () => {
      // Initially false
      expect(manager.isImageInfoDisplayed()).toBe(false);

      // Toggle to true
      manager.toggleImageInfoDisplay();
      expect(manager.isImageInfoDisplayed()).toBe(true);

      // Toggle back to false
      manager.toggleImageInfoDisplay();
      expect(manager.isImageInfoDisplayed()).toBe(false);
    });

    it('should maintain display state independently of other operations', () => {
      // Enable display
      manager.toggleImageInfoDisplay();
      expect(manager.isImageInfoDisplayed()).toBe(true);

      // Other operations should not affect display state
      manager.gotoNext();
      manager.bookmarkCurrent();
      manager.gotoPrev();

      expect(manager.isImageInfoDisplayed()).toBe(true);

      // Disable display
      manager.toggleImageInfoDisplay();
      expect(manager.isImageInfoDisplayed()).toBe(false);
    });
  });
});
