import React, { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CalendarDebugUtils } from './calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'AccessibilityUtils';

/**
 * Key Code Enum
 * Defines keyboard key codes for accessibility
 */
export enum KeyCode {
  ENTER = 'Enter',
  SPACE = ' ',
  ESCAPE = 'Escape',
  TAB = 'Tab',
  ARROW_UP = 'ArrowUp',
  ARROW_DOWN = 'ArrowDown',
  ARROW_LEFT = 'ArrowLeft',
  ARROW_RIGHT = 'ArrowRight',
  HOME = 'Home',
  END = 'End',
  PAGE_UP = 'PageUp',
  PAGE_DOWN = 'PageDown'
}

/**
 * Focus Direction Enum
 * Defines directions for focus movement
 */
export enum FocusDirection {
  NEXT = 'next',
  PREV = 'prev',
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  FIRST = 'first',
  LAST = 'last'
}

/**
 * Calendar Grid Position
 * Represents a position in the calendar grid
 */
export interface CalendarGridPosition {
  row: number;
  col: number;
}

/**
 * Calendar Keyboard Navigation Options
 * Options for keyboard navigation in the calendar
 */
export interface CalendarKeyboardNavigationOptions {
  gridSelector: string;
  cellSelector: string;
  rowCount: number;
  colCount: number;
  onFocusChange?: (position: CalendarGridPosition) => void;
  onSelect?: (position: CalendarGridPosition) => void;
  onEscape?: () => void;
  wrap?: boolean;
  allowTabNavigation?: boolean;
}

/**
 * Check if an element is focusable
 * @param element The element to check
 * @returns Whether the element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  // Check if the element is visible
  if (element.offsetParent === null) return false;
  
  // Check if the element is disabled
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('aria-disabled') === 'true') return false;
  
  // Check if the element is hidden
  if (element.getAttribute('aria-hidden') === 'true') return false;
  
  // Check if the element has tabindex
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex !== null && parseInt(tabIndex) < 0) return false;
  
  // Check if the element is a focusable element type
  const focusableElements = [
    'a', 'button', 'input', 'textarea', 'select', 'details',
    '[tabindex]:not([tabindex="-1"])'
  ];
  
  const selector = focusableElements.join(',');
  return element.matches(selector);
}

/**
 * Get all focusable elements within a container
 * @param container The container element
 * @returns An array of focusable elements
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableElements = [
    'a', 'button', 'input', 'textarea', 'select', 'details',
    '[tabindex]:not([tabindex="-1"])'
  ];
  
  const selector = focusableElements.join(',');
  const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
  
  return elements.filter(element => isFocusable(element));
}

/**
 * Move focus to the next focusable element
 * @param container The container element
 * @param currentElement The current focused element
 * @param direction The direction to move focus
 * @param wrap Whether to wrap around to the beginning/end
 * @returns The newly focused element
 */
export function moveFocus(
  container: HTMLElement,
  currentElement: HTMLElement | null,
  direction: FocusDirection,
  wrap: boolean = true
): HTMLElement | null {
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length === 0) return null;
  
  // If no element is focused, focus the first element
  if (!currentElement) {
    const firstElement = focusableElements[0];
    firstElement.focus();
    return firstElement;
  }
  
  // Find the index of the current element
  const currentIndex = focusableElements.indexOf(currentElement);
  
  if (currentIndex === -1) {
    // Current element is not in the list, focus the first element
    const firstElement = focusableElements[0];
    firstElement.focus();
    return firstElement;
  }
  
  let nextIndex = currentIndex;
  
  switch (direction) {
    case FocusDirection.NEXT:
      nextIndex = currentIndex + 1;
      break;
    case FocusDirection.PREV:
      nextIndex = currentIndex - 1;
      break;
    case FocusDirection.FIRST:
      nextIndex = 0;
      break;
    case FocusDirection.LAST:
      nextIndex = focusableElements.length - 1;
      break;
    default:
      break;
  }
  
  // Handle wrapping
  if (wrap) {
    if (nextIndex < 0) {
      nextIndex = focusableElements.length - 1;
    } else if (nextIndex >= focusableElements.length) {
      nextIndex = 0;
    }
  } else {
    if (nextIndex < 0) {
      nextIndex = 0;
    } else if (nextIndex >= focusableElements.length) {
      nextIndex = focusableElements.length - 1;
    }
  }
  
  // Focus the next element
  const nextElement = focusableElements[nextIndex];
  nextElement.focus();
  
  return nextElement;
}

/**
 * Handle keyboard navigation in a calendar grid
 * @param event The keyboard event
 * @param options The navigation options
 */
export function handleCalendarKeyboardNavigation(
  event: ReactKeyboardEvent<HTMLElement>,
  options: CalendarKeyboardNavigationOptions
): void {
  const {
    gridSelector,
    cellSelector,
    rowCount,
    colCount,
    onFocusChange,
    onSelect,
    onEscape,
    wrap = true,
    allowTabNavigation = false
  } = options;
  
  // Get the grid element
  const gridElement = document.querySelector(gridSelector) as HTMLElement;
  
  if (!gridElement) {
    CalendarDebugUtils.error(COMPONENT_NAME, 'Grid element not found', {
      gridSelector
    });
    return;
  }
  
  // Get all cell elements
  const cellElements = Array.from(gridElement.querySelectorAll(cellSelector)) as HTMLElement[];
  
  if (cellElements.length === 0) {
    CalendarDebugUtils.error(COMPONENT_NAME, 'No cell elements found', {
      cellSelector
    });
    return;
  }
  
  // Get the currently focused element
  const focusedElement = document.activeElement as HTMLElement;
  
  // Find the index of the focused element
  const focusedIndex = cellElements.indexOf(focusedElement);
  
  // If no cell is focused, focus the first cell
  if (focusedIndex === -1) {
    cellElements[0].focus();
    
    if (onFocusChange) {
      onFocusChange({ row: 0, col: 0 });
    }
    
    return;
  }
  
  // Calculate the current row and column
  const currentRow = Math.floor(focusedIndex / colCount);
  const currentCol = focusedIndex % colCount;
  
  // Initialize the next row and column
  let nextRow = currentRow;
  let nextCol = currentCol;
  
  // Handle different key presses
  switch (event.key) {
    case KeyCode.ARROW_UP:
      event.preventDefault();
      nextRow = currentRow - 1;
      break;
    case KeyCode.ARROW_DOWN:
      event.preventDefault();
      nextRow = currentRow + 1;
      break;
    case KeyCode.ARROW_LEFT:
      event.preventDefault();
      nextCol = currentCol - 1;
      break;
    case KeyCode.ARROW_RIGHT:
      event.preventDefault();
      nextCol = currentCol + 1;
      break;
    case KeyCode.HOME:
      event.preventDefault();
      if (event.ctrlKey) {
        // Go to the first cell of the first row
        nextRow = 0;
        nextCol = 0;
      } else {
        // Go to the first cell of the current row
        nextCol = 0;
      }
      break;
    case KeyCode.END:
      event.preventDefault();
      if (event.ctrlKey) {
        // Go to the last cell of the last row
        nextRow = rowCount - 1;
        nextCol = colCount - 1;
      } else {
        // Go to the last cell of the current row
        nextCol = colCount - 1;
      }
      break;
    case KeyCode.PAGE_UP:
      event.preventDefault();
      // Go up by 4 rows
      nextRow = Math.max(0, currentRow - 4);
      break;
    case KeyCode.PAGE_DOWN:
      event.preventDefault();
      // Go down by 4 rows
      nextRow = Math.min(rowCount - 1, currentRow + 4);
      break;
    case KeyCode.ENTER:
    case KeyCode.SPACE:
      event.preventDefault();
      // Select the current cell
      if (onSelect) {
        onSelect({ row: currentRow, col: currentCol });
      }
      return;
    case KeyCode.ESCAPE:
      event.preventDefault();
      // Handle escape
      if (onEscape) {
        onEscape();
      }
      return;
    case KeyCode.TAB:
      // Allow default tab behavior if enabled
      if (allowTabNavigation) {
        return;
      }
      
      event.preventDefault();
      
      if (event.shiftKey) {
        // Move to the previous cell
        nextCol = currentCol - 1;
        if (nextCol < 0) {
          nextCol = colCount - 1;
          nextRow = currentRow - 1;
        }
      } else {
        // Move to the next cell
        nextCol = currentCol + 1;
        if (nextCol >= colCount) {
          nextCol = 0;
          nextRow = currentRow + 1;
        }
      }
      break;
    default:
      return;
  }
  
  // Handle wrapping
  if (wrap) {
    if (nextRow < 0) {
      nextRow = rowCount - 1;
      if (nextCol < 0) {
        nextCol = colCount - 1;
      } else if (nextCol >= colCount) {
        nextCol = 0;
      }
    } else if (nextRow >= rowCount) {
      nextRow = 0;
      if (nextCol < 0) {
        nextCol = colCount - 1;
      } else if (nextCol >= colCount) {
        nextCol = 0;
      }
    }
    
    if (nextCol < 0) {
      nextCol = colCount - 1;
      nextRow = nextRow - 1;
      if (nextRow < 0) {
        nextRow = rowCount - 1;
      }
    } else if (nextCol >= colCount) {
      nextCol = 0;
      nextRow = nextRow + 1;
      if (nextRow >= rowCount) {
        nextRow = 0;
      }
    }
  } else {
    // Clamp to grid boundaries
    nextRow = Math.max(0, Math.min(rowCount - 1, nextRow));
    nextCol = Math.max(0, Math.min(colCount - 1, nextCol));
  }
  
  // Calculate the next index
  const nextIndex = nextRow * colCount + nextCol;
  
  // Focus the next cell
  if (nextIndex >= 0 && nextIndex < cellElements.length) {
    cellElements[nextIndex].focus();
    
    if (onFocusChange) {
      onFocusChange({ row: nextRow, col: nextCol });
    }
  }
}

/**
 * Add ARIA attributes to an element
 * @param element The element to add attributes to
 * @param attributes The attributes to add
 */
export function addAriaAttributes(
  element: HTMLElement,
  attributes: Record<string, string>
): void {
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(`aria-${key}`, value);
  }
}

/**
 * Create an accessible calendar grid
 * @param container The container element
 * @param rowCount The number of rows
 * @param colCount The number of columns
 * @param cellLabels The labels for each cell
 * @param options Additional options
 */
export function createAccessibleCalendarGrid(
  container: HTMLElement,
  rowCount: number,
  colCount: number,
  cellLabels: string[][],
  options: {
    gridLabel?: string;
    gridDescription?: string;
    cellRoleDescription?: string;
    onCellFocus?: (row: number, col: number) => void;
    onCellSelect?: (row: number, col: number) => void;
  } = {}
): void {
  const {
    gridLabel = 'Calendar',
    gridDescription = 'Calendar grid with dates',
    cellRoleDescription = 'calendar cell',
    onCellFocus,
    onCellSelect
  } = options;
  
  // Set grid attributes
  container.setAttribute('role', 'grid');
  container.setAttribute('aria-label', gridLabel);
  container.setAttribute('aria-description', gridDescription);
  container.setAttribute('tabindex', '0');
  
  // Create rows
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const rowElement = document.createElement('div');
    rowElement.setAttribute('role', 'row');
    rowElement.setAttribute('aria-rowindex', (rowIndex + 1).toString());
    
    // Create cells
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const cellElement = document.createElement('div');
      cellElement.setAttribute('role', 'gridcell');
      cellElement.setAttribute('aria-roledescription', cellRoleDescription);
      cellElement.setAttribute('aria-colindex', (colIndex + 1).toString());
      cellElement.setAttribute('tabindex', rowIndex === 0 && colIndex === 0 ? '0' : '-1');
      
      // Set cell label
      if (cellLabels && cellLabels[rowIndex] && cellLabels[rowIndex][colIndex]) {
        cellElement.setAttribute('aria-label', cellLabels[rowIndex][colIndex]);
      }
      
      // Add event listeners
      cellElement.addEventListener('focus', () => {
        // Update tabindex for all cells
        const cells = container.querySelectorAll('[role="gridcell"]');
        cells.forEach(cell => cell.setAttribute('tabindex', '-1'));
        
        // Set this cell as tabbable
        cellElement.setAttribute('tabindex', '0');
        
        // Call focus handler
        if (onCellFocus) {
          onCellFocus(rowIndex, colIndex);
        }
      });
      
      cellElement.addEventListener('click', () => {
        // Call select handler
        if (onCellSelect) {
          onCellSelect(rowIndex, colIndex);
        }
      });
      
      cellElement.addEventListener('keydown', (event: globalThis.KeyboardEvent) => {
        if (event.key === KeyCode.ENTER || event.key === KeyCode.SPACE) {
          event.preventDefault();
          
          // Call select handler
          if (onCellSelect) {
            onCellSelect(rowIndex, colIndex);
          }
        }
      });
      
      // Add cell to row
      rowElement.appendChild(cellElement);
    }
    
    // Add row to grid
    container.appendChild(rowElement);
  }
  
  // Add keyboard navigation
  container.addEventListener('keydown', (event: globalThis.KeyboardEvent) => {
    handleCalendarKeyboardNavigation(event as unknown as ReactKeyboardEvent<HTMLElement>, {
      gridSelector: '[role="grid"]',
      cellSelector: '[role="gridcell"]',
      rowCount,
      colCount,
      onFocusChange: position => {
        if (onCellFocus) {
          onCellFocus(position.row, position.col);
        }
      },
      onSelect: position => {
        if (onCellSelect) {
          onCellSelect(position.row, position.col);
        }
      }
    });
  });
}

export default {
  KeyCode,
  FocusDirection,
  isFocusable,
  getFocusableElements,
  moveFocus,
  handleCalendarKeyboardNavigation,
  addAriaAttributes,
  createAccessibleCalendarGrid
};