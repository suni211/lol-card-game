import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LayoutType = 'navbar' | 'sidebar';

interface LayoutStore {
  layoutType: LayoutType;
  setLayoutType: (type: LayoutType) => void;
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      layoutType: 'sidebar',
      setLayoutType: (type) => set({ layoutType: type }),
    }),
    {
      name: 'layout-storage',
    }
  )
);
