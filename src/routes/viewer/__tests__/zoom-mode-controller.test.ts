import { describe, it, expect, beforeEach } from 'vitest';
import { ZoomModeController } from '../zoom-mode-controller.svelte';

describe('ZoomModeController', () => {
  let zoom: ZoomModeController;

  beforeEach(() => {
    zoom = new ZoomModeController();
  });

  it('開始・終了でモード状態と組の区切りが切り替わる', () => {
    expect(zoom.isActive()).toBe(false);
    expect(zoom.getGroup()).toBeNull();

    zoom.enter(3, 2);
    expect(zoom.isActive()).toBe(true);
    expect(zoom.getGroup()?.align(2)).toBe(1);

    zoom.exit();
    expect(zoom.isActive()).toBe(false);
    expect(zoom.getGroup()).toBeNull();
  });

  it('拡大・縮小は 20% 刻みで 80%〜1000% に制限される', () => {
    expect(zoom.getScalePercent()).toBe(100);

    zoom.zoomOut();
    zoom.zoomOut();
    expect(zoom.getScalePercent()).toBe(80);

    zoom.zoomIn();
    zoom.zoomIn();
    expect(zoom.getScalePercent()).toBe(120);

    for (let i = 0; i < 100; i++) {
      zoom.zoomIn();
    }
    expect(zoom.getScalePercent()).toBe(1000);
  });

  it('移動はカーソルの逆方向へ、制限なく動く', () => {
    zoom.move(10, -20);
    zoom.move(100000, 0);
    expect(zoom.getOffsetX()).toBe(-100010);
    expect(zoom.getOffsetY()).toBe(20);
  });

  it('拡大・縮小しても画面中央に映っている点は動かない', () => {
    zoom.zoomIn(); // 120%
    zoom.move(-11, 22);
    // 画面中央に映っているキャンバス上の点 (キャンバス中心基準)
    const centerPoint = () => ({
      x: -zoom.getOffsetX() / (zoom.getScalePercent() / 100),
      y: -zoom.getOffsetY() / (zoom.getScalePercent() / 100),
    });
    const before = centerPoint();

    zoom.zoomIn();
    zoom.zoomIn();
    expect(centerPoint().x).toBeCloseTo(before.x);
    expect(centerPoint().y).toBeCloseTo(before.y);

    zoom.zoomOut();
    expect(centerPoint().x).toBeCloseTo(before.x);
    expect(centerPoint().y).toBeCloseTo(before.y);
  });

  it('開始・終了・リセットで変形が元に戻る', () => {
    zoom.enter(0, 1);
    zoom.zoomIn();
    zoom.move(10, 10);
    zoom.resetTransform();
    expect(zoom.getCanvasTransform()).toBe('translate(0px, 0px) scale(1)');

    zoom.zoomIn();
    zoom.exit();
    expect(zoom.getScalePercent()).toBe(100);

    zoom.zoomIn();
    zoom.enter(0, 1);
    expect(zoom.getScalePercent()).toBe(100);
  });
});
