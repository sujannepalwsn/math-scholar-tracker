/**
 * Simple utility to trigger haptic feedback on devices that support it (primarily Android).
 */
export const hapticFeedback = {
  /**
   * Short, light tap (standard UI interaction)
   */
  light: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium impact (selection changed, success)
   */
  medium: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
  },

  /**
   * Heavy impact (destructive actions, errors)
   */
  heavy: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 20, 40]);
    }
  },

  /**
   * Distinct double tap
   */
  double: () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 30, 15]);
    }
  }
};
