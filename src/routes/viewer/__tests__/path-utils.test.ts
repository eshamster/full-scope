import { describe, it, expect } from 'vitest';
import { getDirPath, getFileName } from '../path-utils';

describe('path-utils', () => {
  describe('getDirPath', () => {
    const testCases = [
      {
        name: 'Windows file path',
        path: 'C:\\Users\\test\\Documents\\image.jpg',
        expected: 'C:\\Users\\test\\Documents\\',
      },
      {
        name: 'Unix file path',
        path: '/home/user/images/photo.png',
        expected: '/home/user/images/',
      },
      {
        name: 'Windows root directory',
        path: 'C:\\image.jpg',
        expected: 'C:\\',
      },
      {
        name: 'Unix root directory',
        path: '/image.jpg',
        expected: '/',
      },
      {
        name: 'file name without path',
        path: 'image.jpg',
        expected: '',
      },
      {
        name: 'mixed path separators',
        path: 'C:/Users/test\\Documents/image.jpg',
        expected: 'C:/Users/test\\Documents/',
      },
      {
        name: 'empty string',
        path: '',
        expected: '',
      },
      {
        name: 'path ending with separator',
        path: '/home/user/images/',
        expected: '/home/user/images/',
      },
    ];

    testCases.forEach(({ name, path, expected }) => {
      it(`should handle ${name}`, () => {
        expect(getDirPath(path)).toBe(expected);
      });
    });
  });

  describe('getFileName', () => {
    const testCases = [
      {
        name: 'Windows file path',
        path: 'C:\\Users\\test\\Documents\\image.jpg',
        expected: 'image.jpg',
      },
      {
        name: 'Unix file path',
        path: '/home/user/images/photo.png',
        expected: 'photo.png',
      },
      {
        name: 'file name without path',
        path: 'image.jpg',
        expected: 'image.jpg',
      },
      {
        name: 'mixed path separators',
        path: 'C:/Users/test\\Documents/image.jpg',
        expected: 'image.jpg',
      },
      {
        name: 'empty string',
        path: '',
        expected: '',
      },
      {
        name: 'path ending with separator',
        path: '/home/user/images/',
        expected: '',
      },
      {
        name: 'file names with special characters',
        path: '/home/user/test file (copy).jpg',
        expected: 'test file (copy).jpg',
      },
      {
        name: 'file names with Unicode characters',
        path: 'C:\\画像\\テスト画像.jpg',
        expected: 'テスト画像.jpg',
      },
    ];

    testCases.forEach(({ name, path, expected }) => {
      it(`should handle ${name}`, () => {
        expect(getFileName(path)).toBe(expected);
      });
    });
  });

  describe('integration scenarios', () => {
    const testCases = [
      {
        name: 'typical Windows image path',
        path: 'C:\\Users\\John\\Pictures\\vacation\\beach.jpg',
        expectedDir: 'C:\\Users\\John\\Pictures\\vacation\\',
        expectedFile: 'beach.jpg',
      },
      {
        name: 'typical Unix image path',
        path: '/home/user/photos/2024/IMG_001.png',
        expectedDir: '/home/user/photos/2024/',
        expectedFile: 'IMG_001.png',
      },
      {
        name: 'file without directory',
        path: 'screenshot.png',
        expectedDir: '',
        expectedFile: 'screenshot.png',
      },
    ];

    testCases.forEach(({ name, path, expectedDir, expectedFile }) => {
      it(`should work correctly with ${name}`, () => {
        expect(getDirPath(path)).toBe(expectedDir);
        expect(getFileName(path)).toBe(expectedFile);
      });
    });
  });
});
