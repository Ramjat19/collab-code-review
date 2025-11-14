import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<LoadingSpinner />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render with custom text', () => {
      render(<LoadingSpinner text="Please wait..." />);
      
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should not render text when text prop is empty string', () => {
      render(<LoadingSpinner text="" />);
      
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should render with custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);
      
      const spinnerContainer = container.firstChild;
      expect(spinnerContainer).toHaveClass('custom-class');
    });

    it('should combine default and custom className', () => {
      const { container } = render(<LoadingSpinner className="mt-4 p-2" />);
      
      const spinnerContainer = container.firstChild;
      expect(spinnerContainer).toHaveClass('flex');
      expect(spinnerContainer).toHaveClass('items-center');
      expect(spinnerContainer).toHaveClass('justify-center');
      expect(spinnerContainer).toHaveClass('mt-4');
      expect(spinnerContainer).toHaveClass('p-2');
    });
  });

  describe('size variants', () => {
    it('should render small size spinner', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      
      // Check for Loader2 icon with small size class
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4');
      expect(svg).toHaveClass('w-4');
    });

    it('should render medium size spinner (default)', () => {
      const { container } = render(<LoadingSpinner size="md" />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6');
      expect(svg).toHaveClass('w-6');
    });

    it('should render large size spinner', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8');
      expect(svg).toHaveClass('w-8');
    });

    it('should use medium size as default when size not specified', () => {
      const { container } = render(<LoadingSpinner />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-6');
      expect(svg).toHaveClass('w-6');
    });
  });

  describe('styling', () => {
    it('should have spinning animation', () => {
      const { container } = render(<LoadingSpinner />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });

    it('should have blue color', () => {
      const { container } = render(<LoadingSpinner />);
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-600');
    });

    it('should have flex layout', () => {
      const { container } = render(<LoadingSpinner />);
      
      const spinnerContainer = container.firstChild;
      expect(spinnerContainer).toHaveClass('flex');
      expect(spinnerContainer).toHaveClass('items-center');
      expect(spinnerContainer).toHaveClass('justify-center');
    });

    it('should style text correctly', () => {
      render(<LoadingSpinner text="Loading data..." />);
      
      const text = screen.getByText('Loading data...');
      expect(text).toHaveClass('ml-2');
      expect(text).toHaveClass('text-sm');
      expect(text).toHaveClass('text-gray-600');
    });
  });

  describe('accessibility', () => {
    it('should render svg element', () => {
      const { container } = render(<LoadingSpinner />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have readable text', () => {
      render(<LoadingSpinner text="Processing request..." />);
      
      expect(screen.getByText('Processing request...')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle all props together', () => {
      const { container } = render(
        <LoadingSpinner 
          size="lg" 
          text="Custom loading message" 
          className="my-custom-class" 
        />
      );
      
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8');
      expect(svg).toHaveClass('w-8');
      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('my-custom-class');
    });

    it('should handle undefined text gracefully', () => {
      render(<LoadingSpinner text={undefined} />);
      
      // Should not throw error and should render spinner
      const { container } = render(<LoadingSpinner text={undefined} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should handle very long text', () => {
      const longText = 'This is a very long loading message that might wrap to multiple lines in the UI';
      render(<LoadingSpinner text={longText} />);
      
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });
});
