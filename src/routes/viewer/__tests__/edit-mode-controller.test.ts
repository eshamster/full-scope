import { describe, it, expect } from 'vitest';
import { EditModeController } from '../edit-mode-controller.svelte';

describe('EditModeController', () => {
  describe('constructor', () => {
    it('should initialize with edit mode disabled', () => {
      const controller = new EditModeController();

      expect(controller.isInEditMode()).toBe(false);
    });
  });

  describe('edit mode state management', () => {
    it('should enter edit mode when enterEditMode is called', () => {
      const controller = new EditModeController();

      expect(controller.isInEditMode()).toBe(false);

      controller.enterEditMode();
      expect(controller.isInEditMode()).toBe(true);
    });

    it('should exit edit mode when exitEditMode is called', () => {
      const controller = new EditModeController();

      controller.enterEditMode();
      expect(controller.isInEditMode()).toBe(true);

      controller.exitEditMode();
      expect(controller.isInEditMode()).toBe(false);
    });

    it('should handle multiple enter/exit cycles', () => {
      const controller = new EditModeController();

      for (let i = 0; i < 5; i++) {
        expect(controller.isInEditMode()).toBe(false);
        
        controller.enterEditMode();
        expect(controller.isInEditMode()).toBe(true);
        
        controller.exitEditMode();
        expect(controller.isInEditMode()).toBe(false);
      }
    });

    it('should maintain state when entering edit mode multiple times', () => {
      const controller = new EditModeController();

      controller.enterEditMode();
      expect(controller.isInEditMode()).toBe(true);

      // Entering edit mode again should maintain the state
      controller.enterEditMode();
      expect(controller.isInEditMode()).toBe(true);

      controller.exitEditMode();
      expect(controller.isInEditMode()).toBe(false);
    });

    it('should maintain state when exiting edit mode multiple times', () => {
      const controller = new EditModeController();

      expect(controller.isInEditMode()).toBe(false);

      // Exiting edit mode when already disabled should maintain the state
      controller.exitEditMode();
      expect(controller.isInEditMode()).toBe(false);

      controller.enterEditMode();
      expect(controller.isInEditMode()).toBe(true);

      controller.exitEditMode();
      expect(controller.isInEditMode()).toBe(false);

      // Exit again
      controller.exitEditMode();
      expect(controller.isInEditMode()).toBe(false);
    });
  });

  describe('edit mode instructions', () => {
    it('should return consistent instruction array', () => {
      const controller = new EditModeController();

      const instructions1 = controller.getEditModeInstructions();
      const instructions2 = controller.getEditModeInstructions();

      expect(instructions1).toEqual(instructions2);
      expect(Array.isArray(instructions1)).toBe(true);
      expect(instructions1.length).toBeGreaterThan(0);
    });

    it('should include expected instruction types', () => {
      const controller = new EditModeController();

      const instructions = controller.getEditModeInstructions();
      const instructionText = instructions.join(' ').toLowerCase();

      // Check for key instruction types
      expect(instructionText).toContain('ドラッグ');
      expect(instructionText).toContain('移動');
      expect(instructionText).toContain('ホイール');
      expect(instructionText).toContain('拡大縮小');
      expect(instructionText).toContain('リセット');
      expect(instructionText).toContain('終了');
    });

    it('should return instructions regardless of edit mode state', () => {
      const controller = new EditModeController();

      // Get instructions when edit mode is disabled
      const instructionsDisabled = controller.getEditModeInstructions();
      expect(instructionsDisabled.length).toBeGreaterThan(0);

      // Get instructions when edit mode is enabled
      controller.enterEditMode();
      const instructionsEnabled = controller.getEditModeInstructions();
      expect(instructionsEnabled.length).toBeGreaterThan(0);

      // Instructions should be the same regardless of state
      expect(instructionsDisabled).toEqual(instructionsEnabled);
    });

    it('should return specific expected instructions', () => {
      const controller = new EditModeController();

      const instructions = controller.getEditModeInstructions();
      const expectedInstructions = [
        'ドラッグ: 移動',
        'ホイール: 拡大縮小',
        'Ctrl+R: リセット',
        'Esc: 終了'
      ];

      expect(instructions).toEqual(expectedInstructions);
    });
  });

  describe('immutable behavior', () => {
    it('should not be affected by external state changes', () => {
      const controller = new EditModeController();

      controller.enterEditMode();
      expect(controller.isInEditMode()).toBe(true);

      // Simulating external attempts to modify state shouldn't affect the controller
      const instructions = controller.getEditModeInstructions();
      instructions.push('Invalid instruction');

      // Original instructions should remain unchanged
      const originalInstructions = controller.getEditModeInstructions();
      expect(originalInstructions).not.toContain('Invalid instruction');
    });
  });

  describe('state transitions', () => {
    it('should handle rapid state changes correctly', () => {
      const controller = new EditModeController();

      // Rapid transitions
      for (let i = 0; i < 100; i++) {
        controller.enterEditMode();
        expect(controller.isInEditMode()).toBe(true);
        
        controller.exitEditMode();
        expect(controller.isInEditMode()).toBe(false);
      }
    });

    it('should maintain consistent state during mixed operations', () => {
      const controller = new EditModeController();

      // Mix of state changes and instruction calls
      controller.enterEditMode();
      expect(controller.isInEditMode()).toBe(true);

      const instructions1 = controller.getEditModeInstructions();
      expect(instructions1.length).toBeGreaterThan(0);

      controller.exitEditMode();
      expect(controller.isInEditMode()).toBe(false);

      const instructions2 = controller.getEditModeInstructions();
      expect(instructions2).toEqual(instructions1);

      controller.enterEditMode();
      expect(controller.isInEditMode()).toBe(true);

      const instructions3 = controller.getEditModeInstructions();
      expect(instructions3).toEqual(instructions1);
    });
  });
});