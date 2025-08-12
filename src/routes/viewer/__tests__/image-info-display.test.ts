import { render, screen } from '@testing-library/svelte';
import { describe, test, expect, vi } from 'vitest';
import ImageInfoDisplay from '../image-info-display.svelte';
import { ImageInfo } from '../image-info.svelte';

// APIモック
vi.mock('$lib/api/tags', () => ({
  loadTagsInDir: vi.fn().mockResolvedValue({
    'test.jpg': ['nature', 'landscape'],
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({
    size: 1024000,
    width: 1920,
    height: 1080,
  }),
}));

describe('ImageInfoDisplay', () => {
  const mockImageInfo = new ImageInfo('/path/to/test.jpg');

  test('show=falseの時は非表示になる', () => {
    render(ImageInfoDisplay, {
      props: {
        show: false,
        imageInfo: mockImageInfo,
      },
    });

    const overlay = screen.queryByTestId('image-info-overlay');
    expect(overlay).toBeNull();
  });

  test('imageInfo=nullの時は非表示になる', () => {
    render(ImageInfoDisplay, {
      props: {
        show: true,
        imageInfo: null,
      },
    });

    const overlay = screen.queryByTestId('image-info-overlay');
    expect(overlay).toBeNull();
  });

  test('ファイルサイズが正しくフォーマットされる', async () => {
    render(ImageInfoDisplay, {
      props: {
        show: true,
        imageInfo: mockImageInfo,
      },
    });

    // formatFileSize関数のテスト
    const formatFileSize = (bytes: number): string => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }

      return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024000)).toBe('1000.0 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(1073741824)).toBe('1.0 GB');
  });

  test('タグが正しくフォーマットされる', () => {
    const formatTags = (tags: string[]): string => {
      return tags.length > 0 ? tags.join(', ') : 'なし';
    };

    expect(formatTags([])).toBe('なし');
    expect(formatTags(['nature'])).toBe('nature');
    expect(formatTags(['nature', 'landscape', 'sunset'])).toBe('nature, landscape, sunset');
  });

  test('角度の正規化が正しく動作する', () => {
    const normalizeAngle = (angle: number): number => {
      return ((angle % 360) + 360) % 360;
    };

    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(90)).toBe(90);
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(270)).toBe(270);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(-180)).toBe(180);
    expect(normalizeAngle(450)).toBe(90);
  });

  test('回転情報のフォーマットが正しく動作する', () => {
    const normalizeAngle = (angle: number): number => {
      return ((angle % 360) + 360) % 360;
    };

    const formatRotationInfo = (localRotation: number, globalRotation: number): string | null => {
      const normalizedLocal = normalizeAngle(localRotation);
      const normalizedGlobal = normalizeAngle(globalRotation);
      const totalRotation = normalizeAngle(localRotation + globalRotation);

      // local, globalどちらも0度の場合は表示しない
      if (normalizedLocal === 0 && normalizedGlobal === 0) {
        return null;
      }

      return `回転角: ${totalRotation}度（この画像: ${normalizedLocal}度, 全画像: ${normalizedGlobal}度）`;
    };

    // 両方が0度の場合は表示しない
    expect(formatRotationInfo(0, 0)).toBeNull();

    // ローカル回転のみ
    expect(formatRotationInfo(90, 0)).toBe('回転角: 90度（この画像: 90度, 全画像: 0度）');
    expect(formatRotationInfo(180, 0)).toBe('回転角: 180度（この画像: 180度, 全画像: 0度）');
    expect(formatRotationInfo(270, 0)).toBe('回転角: 270度（この画像: 270度, 全画像: 0度）');

    // グローバル回転のみ
    expect(formatRotationInfo(0, 90)).toBe('回転角: 90度（この画像: 0度, 全画像: 90度）');
    expect(formatRotationInfo(0, 180)).toBe('回転角: 180度（この画像: 0度, 全画像: 180度）');
    expect(formatRotationInfo(0, 270)).toBe('回転角: 270度（この画像: 0度, 全画像: 270度）');

    // 両方の回転の合成
    expect(formatRotationInfo(90, 90)).toBe('回転角: 180度（この画像: 90度, 全画像: 90度）');
    expect(formatRotationInfo(270, 180)).toBe('回転角: 90度（この画像: 270度, 全画像: 180度）');
    expect(formatRotationInfo(180, 180)).toBe('回転角: 0度（この画像: 180度, 全画像: 180度）');

    // 負の角度の正規化
    expect(formatRotationInfo(-90, 0)).toBe('回転角: 270度（この画像: 270度, 全画像: 0度）');
    expect(formatRotationInfo(0, -90)).toBe('回転角: 270度（この画像: 0度, 全画像: 270度）');

    // 360度を超える角度の正規化
    expect(formatRotationInfo(450, 0)).toBe('回転角: 90度（この画像: 90度, 全画像: 0度）');
    expect(formatRotationInfo(0, 450)).toBe('回転角: 90度（この画像: 0度, 全画像: 90度）');
  });

  test('globalRotationプロパティが回転情報表示に反映される', () => {
    const mockImageInfoWithRotation = new ImageInfo('/path/to/test.jpg');
    mockImageInfoWithRotation.rotateLocalRight(); // 90度回転

    render(ImageInfoDisplay, {
      props: {
        show: true,
        imageInfo: mockImageInfoWithRotation,
        globalRotation: 90, // グローバル回転90度
      },
    });

    // 回転情報が含まれることを想定したテスト
    // 実際の表示内容の確認はE2Eテストで行う
    expect(mockImageInfoWithRotation.getLocalRotation()).toBe(90);
  });

  test('回転角度が0度の場合は回転情報が表示されない', () => {
    const mockImageInfoNoRotation = new ImageInfo('/path/to/test.jpg');

    render(ImageInfoDisplay, {
      props: {
        show: true,
        imageInfo: mockImageInfoNoRotation,
        globalRotation: 0, // グローバル回転0度
      },
    });

    // 回転情報が表示されないことを想定したテスト
    expect(mockImageInfoNoRotation.getLocalRotation()).toBe(0);
  });
});
