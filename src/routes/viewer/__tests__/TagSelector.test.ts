import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import TagSelector from '../TagSelector.svelte';

describe('TagSelector', () => {
  const defaultProps = {
    availableTags: ['nature', 'landscape', 'urban', 'travel', 'photography'],
    selectedTags: ['nature', 'landscape'],
    onTagToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all available tags as buttons', () => {
      render(TagSelector, { props: defaultProps });

      expect(screen.getByText('nature')).toBeInTheDocument();
      expect(screen.getByText('landscape')).toBeInTheDocument();
      expect(screen.getByText('urban')).toBeInTheDocument();
      expect(screen.getByText('travel')).toBeInTheDocument();
      expect(screen.getByText('photography')).toBeInTheDocument();
    });

    it('should apply selected class to selected tags', () => {
      render(TagSelector, { props: defaultProps });

      const natureButton = screen.getByText('nature');
      const landscapeButton = screen.getByText('landscape');
      const urbanButton = screen.getByText('urban');

      expect(natureButton).toHaveClass('tag-button', 'selected');
      expect(landscapeButton).toHaveClass('tag-button', 'selected');
      expect(urbanButton).toHaveClass('tag-button', 'unselected');
    });

    it('should show no tags message when availableTags is empty', () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          availableTags: [],
        },
      });

      expect(screen.getByText('利用可能なタグがありません')).toBeInTheDocument();
    });

    it('should show custom no tags message when provided', () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          availableTags: [],
          noTagsMessage: 'カスタムメッセージ',
        },
      });

      expect(screen.getByText('カスタムメッセージ')).toBeInTheDocument();
    });

    it('should not show no tags message when showNoTagsMessage is false', () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          availableTags: [],
          showNoTagsMessage: false,
        },
      });

      expect(screen.queryByText('利用可能なタグがありません')).not.toBeInTheDocument();
    });

    it('should apply custom containerClass when provided', () => {
      const { container } = render(TagSelector, {
        props: {
          ...defaultProps,
          containerClass: 'custom-class',
        },
      });

      const tagsContainer = container.querySelector('.tags-container');
      expect(tagsContainer).toHaveClass('custom-class');
    });
  });

  describe('tag interactions', () => {
    it('should call onTagToggle when tag button is clicked', async () => {
      render(TagSelector, { props: defaultProps });

      const urbanButton = screen.getByText('urban');
      await fireEvent.click(urbanButton);

      expect(defaultProps.onTagToggle).toHaveBeenCalledWith('urban');
    });

    it('should call onTagToggle for selected tags', async () => {
      render(TagSelector, { props: defaultProps });

      const natureButton = screen.getByText('nature');
      await fireEvent.click(natureButton);

      expect(defaultProps.onTagToggle).toHaveBeenCalledWith('nature');
    });

    it('should handle multiple tag clicks', async () => {
      render(TagSelector, { props: defaultProps });

      const urbanButton = screen.getByText('urban');
      const travelButton = screen.getByText('travel');

      await fireEvent.click(urbanButton);
      await fireEvent.click(travelButton);

      expect(defaultProps.onTagToggle).toHaveBeenCalledTimes(2);
      expect(defaultProps.onTagToggle).toHaveBeenCalledWith('urban');
      expect(defaultProps.onTagToggle).toHaveBeenCalledWith('travel');
    });
  });

  describe('keyboard input functionality', () => {
    const mockOnHeadCharMatch = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      // キーボードイベントリスナーのクリーンアップを確実に行う
      document.removeEventListener('keydown', expect.any(Function), true);
    });

    it('should not handle keyboard input when enableKeyboardInput is false', async () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          enableKeyboardInput: false,
          onHeadCharMatch: mockOnHeadCharMatch,
        },
      });

      await fireEvent.keyDown(document, { key: 'n' });

      expect(mockOnHeadCharMatch).not.toHaveBeenCalled();
    });

    it('should handle keyboard input when enableKeyboardInput is true', async () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          enableKeyboardInput: true,
          onHeadCharMatch: mockOnHeadCharMatch,
        },
      });

      await fireEvent.keyDown(document, { key: 'n' });

      expect(mockOnHeadCharMatch).toHaveBeenCalledWith(['nature'], 'n');
    });

    it('should find multiple matching tags for head character', async () => {
      const tagsWithSameLetter = ['test1', 'test2', 'other', 'travel'];
      render(TagSelector, {
        props: {
          ...defaultProps,
          availableTags: tagsWithSameLetter,
          enableKeyboardInput: true,
          onHeadCharMatch: mockOnHeadCharMatch,
        },
      });

      await fireEvent.keyDown(document, { key: 't' });

      expect(mockOnHeadCharMatch).toHaveBeenCalledWith(['test1', 'test2', 'travel'], 't');
    });

    it('should handle case insensitive matching', async () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          availableTags: ['Nature', 'LANDSCAPE', 'urban'],
          enableKeyboardInput: true,
          onHeadCharMatch: mockOnHeadCharMatch,
        },
      });

      await fireEvent.keyDown(document, { key: 'n' });

      expect(mockOnHeadCharMatch).toHaveBeenCalledWith(['Nature'], 'n');
    });

    it('should handle numeric characters', async () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          availableTags: ['1st', '2nd', 'test'],
          enableKeyboardInput: true,
          onHeadCharMatch: mockOnHeadCharMatch,
        },
      });

      await fireEvent.keyDown(document, { key: '1' });

      expect(mockOnHeadCharMatch).toHaveBeenCalledWith(['1st'], '1');
    });

    it('should not handle special characters', async () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          enableKeyboardInput: true,
          onHeadCharMatch: mockOnHeadCharMatch,
        },
      });

      await fireEvent.keyDown(document, { key: '!' });
      await fireEvent.keyDown(document, { key: '@' });
      await fireEvent.keyDown(document, { key: 'Enter' });

      expect(mockOnHeadCharMatch).not.toHaveBeenCalled();
    });

    it('should not call onHeadCharMatch when no matching tags found', async () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          availableTags: ['nature', 'landscape'],
          enableKeyboardInput: true,
          onHeadCharMatch: mockOnHeadCharMatch,
        },
      });

      await fireEvent.keyDown(document, { key: 'z' });

      expect(mockOnHeadCharMatch).not.toHaveBeenCalled();
    });

    it('should not call onHeadCharMatch when onHeadCharMatch is not provided', async () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          enableKeyboardInput: true,
          // onHeadCharMatch is undefined
        },
      });

      // キーダウンイベントが正常に処理されることを確認（エラーが発生しない）
      await expect(
        fireEvent.keyDown(document, { key: 'n' })
      ).resolves.not.toThrow();
    });
  });

  describe('state management', () => {
    it('should update selected state when selectedTags prop changes', async () => {
      const { rerender } = render(TagSelector, { props: defaultProps });

      // 初期状態
      expect(screen.getByText('nature')).toHaveClass('selected');
      expect(screen.getByText('urban')).toHaveClass('unselected');

      // selectedTagsを変更
      await rerender({
        ...defaultProps,
        selectedTags: ['urban', 'travel'],
      });

      expect(screen.getByText('nature')).toHaveClass('unselected');
      expect(screen.getByText('urban')).toHaveClass('selected');
      expect(screen.getByText('travel')).toHaveClass('selected');
    });

    it('should handle empty selectedTags array', () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          selectedTags: [],
        },
      });

      defaultProps.availableTags.forEach(tag => {
        expect(screen.getByText(tag)).toHaveClass('unselected');
      });
    });

    it('should handle selectedTags with non-existent tags', () => {
      render(TagSelector, {
        props: {
          ...defaultProps,
          selectedTags: ['nature', 'nonexistent'],
        },
      });

      expect(screen.getByText('nature')).toHaveClass('selected');
      expect(screen.getByText('landscape')).toHaveClass('unselected');
    });
  });

  describe('component lifecycle', () => {
    it('should properly clean up event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = render(TagSelector, {
        props: {
          ...defaultProps,
          enableKeyboardInput: true,
          onHeadCharMatch: vi.fn(),
        },
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        true
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        true
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('should not add keydown event listener when enableKeyboardInput is false', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      render(TagSelector, {
        props: {
          ...defaultProps,
          enableKeyboardInput: false,
        },
      });

      // keydownイベントリスナーが追加されていないことを確認
      const keydownCalls = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'keydown'
      );
      expect(keydownCalls).toHaveLength(0);

      addEventListenerSpy.mockRestore();
    });
  });
});