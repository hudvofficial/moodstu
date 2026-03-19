"use client";

import * as React from "react";

// Định nghĩa các loại Modal trong hệ thống
export type ModalType = 
  | "CONFIRM_DELETE" 
  | "CONTRACT_FORM" 
  | "CUSTOMER_FORM" 
  | "QUICK_SEARCH" 
  | "USER_PROFILE";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ModalContextType<T = any> {
  isOpen: boolean;
  type: ModalType | null;
  data: T;
  openModal: (type: ModalType, data?: T) => void;
  closeModal: () => void;
}

const ModalContext = React.createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [type, setType] = React.useState<ModalType | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = React.useState<any>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openModal = React.useCallback((newType: ModalType, newData?: any) => {
    setType(newType);
    setData(newData);
    setIsOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setType(null);
      setData(null);
    }, 300); // Wait for animation to finish
  }, []);

  return (
    <ModalContext.Provider value={{ isOpen, type, data, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = React.useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}
