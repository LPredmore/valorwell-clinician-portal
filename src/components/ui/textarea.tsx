
import * as React from "react"
import { cn, withPdfAttributes } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  pdfVisible?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, pdfVisible = true, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    
    const setRefs = React.useCallback((element: HTMLTextAreaElement | null) => {
      textareaRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    }, [ref]);

    const resizeTextarea = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      // Use requestAnimationFrame to prevent layout thrashing
      requestAnimationFrame(() => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      });
    }, []);

    // Debounced resize to prevent excessive calls
    const debouncedResize = React.useCallback(() => {
      const timeoutId = setTimeout(() => {
        resizeTextarea();
      }, 10);
      
      return () => clearTimeout(timeoutId);
    }, [resizeTextarea]);

    React.useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      resizeTextarea();
      
      const handleInput = () => debouncedResize();
      const handleResize = () => debouncedResize();
      
      textarea.addEventListener('input', handleInput);
      window.addEventListener('resize', handleResize);
      
      return () => {
        textarea.removeEventListener('input', handleInput);
        window.removeEventListener('resize', handleResize);
      };
    }, [resizeTextarea, debouncedResize]);

    // Resize if value changes from outside (e.g. form state)
    React.useEffect(() => {
      if (props.value !== undefined) {
        debouncedResize();
      }
    }, [props.value, debouncedResize]);

    // Data attributes to help with PDF generation
    const pdfAttributes = pdfVisible ? {
      'data-pdf-value': props.value,
      'data-pdf-visible': 'true',
    } : { 'data-pdf-visible': 'false' };

    return (
      <div className="relative w-full">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            className
          )}
          ref={setRefs}
          {...props}
          {...pdfAttributes}
          onInput={e => {
            if (props.onInput) {
              props.onInput(e);
            }
          }}
        />
        {/* Hidden div for PDF rendering with same content */}
        {pdfVisible && (
          <div 
            className="hidden pdf-only pdf-value-display"
            data-field-value={props.value}
          >
            {props.value}
          </div>
        )}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
