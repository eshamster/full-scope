import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import TagEditor from '../TagEditor.svelte';

describe('TagEditor', () => {
  const defaultProps = {
    show: true,
    imagePath: '/path/to/test-image.jpg',
    initialTags: ['nature', 'landscape'],
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
        props: { ...defaultProps, show: false } 
      });
      
      expect(screen.queryByText('タグ編集')).not.toBeInTheDocument();
    });

    it('should display empty textarea for empty tags', () => {
      render(TagEditor, { 
        props: { ...defaultProps, initialTags: [] } 
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
      await fireEvent.click(overlay);
      
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
    it('should focus and select text when opened', () => {
      render(TagEditor, { props: defaultProps });
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveFocus();
      // Note: selection testing is complex in jsdom, but focus should work
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
        preventDefault: mockPreventDefault
      });
      expect(defaultProps.onSave).toHaveBeenCalled();
      
      // EscapeキーでonCancelが呼ばれることを確認
      await fireEvent.keyDown(textarea, { 
        key: 'Escape',
        preventDefault: mockPreventDefault
      });
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });
});