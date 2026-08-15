import { create } from 'zustand';

interface UIState {
  // Lives outside the Profile component on purpose: navigating from Settings to a page
  // like Privacy or Credits unmounts Profile (those routes aren't part of the always-mounted
  // tab carousel in App.tsx), which would reset a plain useState back to false — losing track
  // that Settings was open and leaving the user dropped on a bare Profile page instead of
  // back inside the Settings popup they came from.
  isProfileSettingsOpen: boolean;
  setProfileSettingsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isProfileSettingsOpen: false,
  setProfileSettingsOpen: (open) => set({ isProfileSettingsOpen: open }),
}));
