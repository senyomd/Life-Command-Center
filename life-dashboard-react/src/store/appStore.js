import { create } from 'zustand'

const useAppStore = create((set) => ({
  // ── Navigation ──────────────────────────────────────────────────
  currentMode: 'home',
  setCurrentMode: (mode) => set({ currentMode: mode }),

  // ── Rating modal (shared across Pomodoro instances) ─────────────
  ratingModalOpen: false,
  pendingRatingCallback: null,
  openRatingModal: (onSave) => set({ ratingModalOpen: true, pendingRatingCallback: onSave }),
  closeRatingModal: () => set({ ratingModalOpen: false, pendingRatingCallback: null }),

  // ── Task drawer ──────────────────────────────────────────────────
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),

  // ── Active modal ─────────────────────────────────────────────────
  activeModal: null,          // 'addTask' | 'editTask' | 'addTransaction' | 'setBudget' | null
  modalPayload: null,         // extra data passed to modal (e.g. task id for edit)
  openModal: (name, payload = null) => set({ activeModal: name, modalPayload: payload }),
  closeModal: () => set({ activeModal: null, modalPayload: null }),
}))

export default useAppStore
