# UI Optimization for Gallery Toolbar

- [x] Modify `components/ui/stats-bar.tsx` to match the Shotpik pill design (background colors, specific icons, dividers).
- [x] Update `components/contracts/gallery/gallery-filter-modal.tsx` to accept a default active tab prop (`defaultTab`).
- [x] Update `components/contracts/gallery/gallery-toolbar-actions.tsx` to change `ViewModeToggle` and redesign `GalleryMoreMenu` into a "Tác vụ" button with a comprehensive dropdown menu.
- [x] Update `components/contracts/gallery/gallery-toolbar.tsx` to remove the big "Lọc ảnh đã chọn" button from the main toolbar and instead pass the handlers to `GalleryMoreMenu`.
- [x] Apply mobile responsive styles to match Shotpik's floating bottom bar logic if applicable, or just clean up the layout.
