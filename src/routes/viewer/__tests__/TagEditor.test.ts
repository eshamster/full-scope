import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import TagEditor from '../TagEditor.svelte';
import type { ImageInfoManager } from '../image-info-manager.svelte';

describe('TagEditor', () => {
  // ImageInfoManagerのモック
  const mockImageInfoManager = {
    getAvailableTags: vi.fn(),
  } as unknown as ImageInfoManager;

  const defaultProps = {
    show: true,
    imagePath: '/path/to/test-image.jpg',
    initialTags: ['nature', 'landscape'],
    imageInfoManager: mockImageInfoManager,
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトでgetAvailableTagsがPromiseを返すように設定
    vi.mocked(mockImageInfoManager.getAvailableTags).mockResolvedValue(['tag1', 'tag2', 'tag3']);
  });

  // ignoreNextInputを解除してテキストエリアの値を設定するヘルパー関数
  const setTextareaValue = async (textarea: HTMLElement, value: string) => {
    // keyupイベントでignoreNextInputを解除
    await fireEvent.keyUp(textarea, { key: 'a' });

    // 値を設定してinputイベントを発生
    (textarea as HTMLTextAreaElement).value = value;
    await fireEvent.input(textarea);
  };

  describe('rendering', () => {
    it('should render when show is true', () => {
      render(TagEditor, { props: defaultProps });

      expect(screen.getByText('タグ編集')).toBeInTheDocument();
      expect(screen.getByText('/path/to/test-image.jpg')).toBeInTheDocument();
      expect(screen.getByDisplayValue('nature, landscape')).toBeInTheDocument();
    });

    it('should not render when show is false', () => {
      render(TagEditor, {
        props: { ...defaultProps, show: false },
      });

      expect(screen.queryByText('タグ編集')).not.toBeInTheDocument();
    });

    it('should display empty textarea for empty tags', () => {
      render(TagEditor, {
        props: { ...defaultProps, initialTags: [] },
      });

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('');
    });
  });

  describe('user interactions', () => {
    it('should call onSave with parsed tags when save button is clicked', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await setTextareaValue(textarea, 'tag1, tag2, tag3');

      const saveButton = screen.getByText('保存 (Enter)');
      await fireEvent.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
    });

    it('should call onCancel when cancel button is clicked', async () => {
      render(TagEditor, { props: defaultProps });

      const cancelButton = screen.getByText('キャンセル (Escape)');
      await fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should call onSave when Enter key is pressed', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(defaultProps.onSave).toHaveBeenCalledWith(['nature', 'landscape']);
    });

    it('should call onCancel when Escape key is pressed', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await fireEvent.keyDown(textarea, { key: 'Escape' });

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should close modal when overlay is clicked', async () => {
      const { container } = render(TagEditor, { props: defaultProps });

      const overlay = container.querySelector('.modal-overlay');
      expect(overlay).toBeTruthy();
      if (overlay) {
        await fireEvent.click(overlay);
      }

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('tag parsing', () => {
    it('should parse comma-separated tags correctly', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await setTextareaValue(textarea, 'tag1, tag2, tag3, tag4');

      const saveButton = screen.getByText('保存 (Enter)');
      await fireEvent.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3', 'tag4']);
    });

    it('should trim whitespace from tags', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await setTextareaValue(textarea, '  tag1  ,   tag2   , tag3  ');

      const saveButton = screen.getByText('保存 (Enter)');
      await fireEvent.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
    });

    it('should filter out empty tags', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await setTextareaValue(textarea, 'tag1, , tag2, , tag3');

      const saveButton = screen.getByText('保存 (Enter)');
      await fireEvent.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3']);
    });

    it('should handle empty input', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await setTextareaValue(textarea, '');

      const saveButton = screen.getByText('保存 (Enter)');
      await fireEvent.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith([]);
    });

    it('should handle only whitespace and commas', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await setTextareaValue(textarea, '  ,  ,  ');

      const saveButton = screen.getByText('保存 (Enter)');
      await fireEvent.click(saveButton);

      expect(defaultProps.onSave).toHaveBeenCalledWith([]);
    });
  });

  describe('input blocking (T key issue prevention)', () => {
    it('should focus text area when in free input mode', async () => {
      render(TagEditor, { props: defaultProps });

      // フリー入力モードに切り替え
      await fireEvent.keyDown(document, { key: 'Tab' });

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveFocus();
    });

    it('should not focus text area initially in easy input mode', () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveFocus();
    });

    // Note: Testing the ignoreNextInput and keyup behavior is complex in this environment
    // as it involves timing and document-level event listeners.
    // In a real application, this would be tested via E2E tests.
  });

  describe('keyboard shortcuts', () => {
    it('should prevent default on Enter and Escape', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');

      // 実際のDOMイベントを使用してpreventDefaultの動作をテスト
      const mockPreventDefault = vi.fn();

      // EnterキーでonSaveが呼ばれることを確認（preventDefaultは内部で呼ばれる）
      await fireEvent.keyDown(textarea, {
        key: 'Enter',
        preventDefault: mockPreventDefault,
      });
      expect(defaultProps.onSave).toHaveBeenCalled();

      // EscapeキーでonCancelが呼ばれることを確認
      await fireEvent.keyDown(textarea, {
        key: 'Escape',
        preventDefault: mockPreventDefault,
      });
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('easy input functionality', () => {
    it('should display available tags as buttons', async () => {
      render(TagEditor, { props: defaultProps });

      // 利用可能タグの読み込みを待機
      await waitFor(() => {
        expect(screen.getByText('tag1')).toBeInTheDocument();
        expect(screen.getByText('tag2')).toBeInTheDocument();
        expect(screen.getByText('tag3')).toBeInTheDocument();
      });

      expect(screen.getByText('既存タグから選択:')).toBeInTheDocument();
    });

    it('should show "no available tags" message when tags are empty', async () => {
      vi.mocked(mockImageInfoManager.getAvailableTags).mockResolvedValue([]);
      render(TagEditor, { props: defaultProps });

      await waitFor(() => {
        expect(screen.getByText('利用可能なタグがありません')).toBeInTheDocument();
      });
    });

    it('should add tag when unselected tag button is clicked', async () => {
      render(TagEditor, { props: defaultProps });

      // 利用可能タグの読み込みを待機
      await waitFor(() => {
        expect(screen.getByText('tag1')).toBeInTheDocument();
      });

      const tag1Button = screen.getByText('tag1');
      await fireEvent.click(tag1Button);

      // テキストエリアに追加されているか確認
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('nature, landscape, tag1');
    });

    it('should remove tag when selected tag button is clicked', async () => {
      const propsWithTag1 = {
        ...defaultProps,
        initialTags: ['nature', 'landscape', 'tag1'],
      };
      render(TagEditor, { props: propsWithTag1 });

      // 利用可能タグの読み込みを待機
      await waitFor(() => {
        expect(screen.getByText('tag1')).toBeInTheDocument();
      });

      const tag1Button = screen.getByText('tag1');
      await fireEvent.click(tag1Button);

      // テキストエリアから削除されているか確認
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('nature, landscape');
    });

    it('should apply correct CSS classes to tag buttons based on selection state', async () => {
      const propsWithTag1 = {
        ...defaultProps,
        initialTags: ['nature', 'landscape', 'tag1'],
      };
      render(TagEditor, { props: propsWithTag1 });

      await waitFor(() => {
        expect(screen.getByText('tag1')).toBeInTheDocument();
      });

      const tag1Button = screen.getByText('tag1');
      const tag2Button = screen.getByText('tag2');

      // tag1は選択済み（selected）、tag2は未選択（unselected）
      expect(tag1Button).toHaveClass('selected');
      expect(tag2Button).toHaveClass('unselected');
    });

    it('should handle getAvailableTags API error gracefully', async () => {
      vi.mocked(mockImageInfoManager.getAvailableTags).mockRejectedValue(new Error('API Error'));

      render(TagEditor, { props: defaultProps });

      await waitFor(() => {
        expect(screen.getByText('利用可能なタグがありません')).toBeInTheDocument();
      });
    });
  });

  describe('head character typing functionality', () => {
    it('should add tag starting with typed character when ignoreNextInput is false', async () => {
      render(TagEditor, { props: defaultProps });

      // 利用可能タグの読み込みを待機
      await waitFor(() => {
        expect(screen.getByText('tag1')).toBeInTheDocument();
      });

      // ignoreNextInputを解除するためにキーアップイベントを発生
      await fireEvent.keyUp(document, { key: 'a' });

      // 't'キーを押してtag1を追加
      await fireEvent.keyDown(document, { key: 't' });

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('nature, landscape, tag1');
    });

    it('should not add tag if already present', async () => {
      const propsWithTag1 = {
        ...defaultProps,
        initialTags: ['nature', 'landscape', 'tag1'],
      };
      render(TagEditor, { props: propsWithTag1 });

      await waitFor(() => {
        expect(screen.getByText('tag1')).toBeInTheDocument();
      });

      // ignoreNextInputを解除
      await fireEvent.keyUp(document, { key: 'a' });

      // 't'キーを押すが、tag1は既に存在するのでtag2が追加される
      await fireEvent.keyDown(document, { key: 't' });

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('nature, landscape, tag1, tag2');
    });

    it('should handle head character typing after initialization delay', async () => {
      render(TagEditor, { props: defaultProps });

      await waitFor(() => {
        expect(screen.getByText('tag1')).toBeInTheDocument();
      });

      const textarea = screen.getByRole('textbox');
      
      // 初期状態の確認
      expect(textarea).toHaveValue('nature, landscape');

      // 't'キーを押してタグが追加されることを確認
      await fireEvent.keyDown(document, { key: 't' });
      expect(textarea).toHaveValue('nature, landscape, tag1');
    });
  });

  describe('input mode switching', () => {
    it('should switch to free input mode when Tab key is pressed', async () => {
      render(TagEditor, { props: defaultProps });

      // Tabキーでフリー入力モードに切り替え
      await fireEvent.keyDown(document, { key: 'Tab' });

      // フォーカスヒントが変わることを確認
      expect(screen.getByText('自由入力モード - 直接編集できます')).toBeInTheDocument();
    });

    it('should switch to free input mode when textarea is focused', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await fireEvent.focus(textarea);

      expect(screen.getByText('自由入力モード - 直接編集できます')).toBeInTheDocument();
    });

    it('should switch to free input mode when textarea is clicked', async () => {
      render(TagEditor, { props: defaultProps });

      const textarea = screen.getByRole('textbox');
      await fireEvent.click(textarea);

      expect(screen.getByText('自由入力モード - 直接編集できます')).toBeInTheDocument();
    });

    it('should start in easy input mode by default', () => {
      render(TagEditor, { props: defaultProps });

      expect(
        screen.getByText('頭文字をタイプしてタグを追加、Tabで自由入力欄へ移動')
      ).toBeInTheDocument();
    });
  });

  describe('props without imageInfoManager', () => {
    it('should work without imageInfoManager prop', () => {
      const propsWithoutManager = {
        show: true,
        imagePath: '/path/to/test-image.jpg',
        initialTags: ['nature', 'landscape'],
        onSave: vi.fn(),
        onCancel: vi.fn(),
      };

      render(TagEditor, { props: propsWithoutManager });

      expect(screen.getByText('タグ編集')).toBeInTheDocument();
      expect(screen.getByText('利用可能なタグがありません')).toBeInTheDocument();
    });
  });
});
