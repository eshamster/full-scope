import { describe, it, expect, beforeEach } from 'vitest';
import { ImageShowHistory } from '../image-show-history';

describe('ImageShowHistory', () => {
  let history: ImageShowHistory;

  beforeEach(() => {
    history = new ImageShowHistory();
  });

  describe('add', () => {
    it('should add history entry', () => {
      history.add('/path/to/prev.jpg', '/path/to/next.jpg');

      const prevPath = history.gotoPrevPath();
      expect(prevPath).toBe('/path/to/prev.jpg');
    });

    it('should handle multiple entries', () => {
      history.add('/path/to/image1.jpg', '/path/to/image2.jpg');
      history.add('/path/to/image2.jpg', '/path/to/image3.jpg');

      // Should be able to navigate back through history
      expect(history.gotoPrevPath()).toBe('/path/to/image2.jpg');
      expect(history.gotoPrevPath()).toBe('/path/to/image1.jpg');
    });

    it('should clear forward history when adding new entry', () => {
      history.add('/path/to/image1.jpg', '/path/to/image2.jpg');
      history.add('/path/to/image2.jpg', '/path/to/image3.jpg');
      history.add('/path/to/image3.jpg', '/path/to/image4.jpg');

      // Go back two steps
      history.gotoPrevPath();
      history.gotoPrevPath();

      // Add new entry should clear forward history
      history.add('/path/to/image2.jpg', '/path/to/image5.jpg');

      // After add, we're at the end, so gotoNextPath should return null
      expect(history.gotoNextPath()).toBeNull();
    });
  });

  describe('gotoPrevPath', () => {
    it('should return null when no history', () => {
      expect(history.gotoPrevPath()).toBeNull();
    });

    it('should return null when at beginning of history', () => {
      history.add('/path/to/image1.jpg', '/path/to/image2.jpg');

      // Go to beginning
      history.gotoPrevPath();

      // Should return null on next attempt
      expect(history.gotoPrevPath()).toBeNull();
    });

    it('should navigate backward through history', () => {
      history.add('/path/to/image1.jpg', '/path/to/image2.jpg');
      history.add('/path/to/image2.jpg', '/path/to/image3.jpg');
      history.add('/path/to/image3.jpg', '/path/to/image4.jpg');

      expect(history.gotoPrevPath()).toBe('/path/to/image3.jpg');
      expect(history.gotoPrevPath()).toBe('/path/to/image2.jpg');
      expect(history.gotoPrevPath()).toBe('/path/to/image1.jpg');
      expect(history.gotoPrevPath()).toBeNull();
    });
  });

  describe('gotoNextPath', () => {
    it('should return null when no history', () => {
      expect(history.gotoNextPath()).toBeNull();
    });

    it('should return null when at end of history', () => {
      history.add('/path/to/image1.jpg', '/path/to/image2.jpg');

      // Should return null immediately as we're at the end
      expect(history.gotoNextPath()).toBeNull();
    });

    it('should navigate forward after going back', () => {
      history.add('/path/to/image1.jpg', '/path/to/image2.jpg');
      history.add('/path/to/image2.jpg', '/path/to/image3.jpg');

      // Go back
      history.gotoPrevPath();
      history.gotoPrevPath();

      // Navigate forward
      expect(history.gotoNextPath()).toBe('/path/to/image2.jpg');
      expect(history.gotoNextPath()).toBe('/path/to/image3.jpg');
      expect(history.gotoNextPath()).toBeNull();
    });
  });

  describe('history limit', () => {
    it('should maintain maximum history size', () => {
      // Add more than 500 entries (maxHistory)
      for (let i = 0; i < 600; i++) {
        history.add(`/path/to/image${i}.jpg`, `/path/to/image${i + 1}.jpg`);
      }

      // Should be able to go back exactly 500 steps
      let steps = 0;
      while (history.gotoPrevPath() !== null) {
        steps++;
      }

      expect(steps).toBe(500);
    });
  });

  describe('complex navigation scenarios', () => {
    beforeEach(() => {
      history.add('/path/to/image1.jpg', '/path/to/image2.jpg');
      history.add('/path/to/image2.jpg', '/path/to/image3.jpg');
      history.add('/path/to/image3.jpg', '/path/to/image4.jpg');
    });

    it('should handle back and forth navigation', () => {
      // Go back to beginning
      expect(history.gotoPrevPath()).toBe('/path/to/image3.jpg');
      expect(history.gotoPrevPath()).toBe('/path/to/image2.jpg');
      expect(history.gotoPrevPath()).toBe('/path/to/image1.jpg');

      // Go forward partially
      expect(history.gotoNextPath()).toBe('/path/to/image2.jpg');

      // Go back again
      expect(history.gotoPrevPath()).toBe('/path/to/image1.jpg');

      // Go forward to end
      expect(history.gotoNextPath()).toBe('/path/to/image2.jpg');
      expect(history.gotoNextPath()).toBe('/path/to/image3.jpg');
      expect(history.gotoNextPath()).toBe('/path/to/image4.jpg');
      expect(history.gotoNextPath()).toBeNull();
    });

    it('should handle adding entry in middle of history', () => {
      // Go back one step
      history.gotoPrevPath();

      // Add new entry, should clear forward history
      history.add('/path/to/image3.jpg', '/path/to/image5.jpg');

      // After add, we're at the end, so gotoNextPath should return null
      expect(history.gotoNextPath()).toBeNull();

      // Previous history should still be accessible
      expect(history.gotoPrevPath()).toBe('/path/to/image3.jpg');
      expect(history.gotoPrevPath()).toBe('/path/to/image2.jpg');
    });
  });
});
