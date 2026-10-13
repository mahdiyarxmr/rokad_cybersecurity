import { create } from 'zustand';

interface CuriosityState {
  isOpen: boolean;
  clicks: number;
  lastClickTime: number;
  claimedTotal: number;
  openModal: () => void;
  closeModal: () => void;
  recordClick: () => void;
}

const LOCAL_STORAGE_KEY = 'rokad_curiosity_reward_count';

export const useCuriosityStore = create<CuriosityState>((set, get) => ({
  isOpen: false,
  clicks: 0,
  lastClickTime: 0,
  claimedTotal: (() => {
    try {
      return parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) || '0', 10);
    } catch {
      return 0;
    }
  })(),

  openModal: () => set({ isOpen: true, clicks: 0 }),
  
  closeModal: () => set({ isOpen: false }),

  recordClick: () => {
    const now = Date.now();
    const { lastClickTime, clicks, claimedTotal } = get();

    // Reset if more than 2.5 seconds between clicks
    const newClicks = now - lastClickTime < 2500 ? clicks + 1 : 1;

    if (newClicks >= 5) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 120]);
      }
      const newTotal = claimedTotal + 10;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, newTotal.toString());
      } catch {
        // quiet fallback
      }
      set({ isOpen: true, clicks: 0, lastClickTime: 0, claimedTotal: newTotal });
    } else {
      set({ clicks: newClicks, lastClickTime: now });
    }
  },
}));
