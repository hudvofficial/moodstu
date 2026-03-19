"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { searchCustomers } from "@/app/actions/contract-queries";
import type { SelectedCustomer } from "@/types/contract-form";

// ═══════════════════════════════════════════
// useContractCustomer — Customer Search + Selection
// V1 pattern: search debounce → select → auto-fill
// ═══════════════════════════════════════════

interface CustomerSearchResult {
  id: string;
  full_name: string;
  phone: string | null;
  bride_name: string | null;
  groom_name: string | null;
  bride_phone: string | null;
  bride_height: number | null;
  bride_weight: number | null;
  bride_shoe_size: number | null;
  groom_phone: string | null;
  groom_height: number | null;
  groom_weight: number | null;
  groom_shoe_size: number | null;
  wedding_date: string | null;
  address: string | null;
}

export function useContractCustomer() {
  // ── State ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  // ── Debounce search query (300ms) ──
  const debouncedQuery = useDebounce(searchQuery, 300);

  // ── Search effect ──
  useEffect(() => {
    let cancelled = false;

    async function doSearch() {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      const result = await searchCustomers(debouncedQuery);
      if (!cancelled && result.success) {
        setSearchResults(result.data as CustomerSearchResult[]);
        setShowDropdown(true);
      }
      if (!cancelled) setIsSearching(false);
    }

    doSearch();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ── Select customer ──
  const selectCustomer = useCallback((customer: CustomerSearchResult) => {
    setSelectedCustomer({
      id: customer.id,
      full_name: customer.full_name,
      phone: customer.phone,
      bride_name: customer.bride_name,
      groom_name: customer.groom_name,
      bride_phone: customer.bride_phone,
      bride_height: customer.bride_height,
      bride_weight: customer.bride_weight,
      bride_shoe_size: customer.bride_shoe_size,
      groom_phone: customer.groom_phone,
      groom_height: customer.groom_height,
      groom_weight: customer.groom_weight,
      groom_shoe_size: customer.groom_shoe_size,
      wedding_date: customer.wedding_date,
      address: customer.address,
    });
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
  }, []);

  // ── Clear selection ──
  const clearCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setSearchQuery("");
    setSearchResults([]);
    setIsNewCustomer(false);
  }, []);

  // ── Open create customer modal ──
  const openCreateCustomer = useCallback(() => {
    setShowCustomerModal(true);
    setShowDropdown(false);
  }, []);

  // ── Callback after customer created ──
  const onCustomerCreated = useCallback((newCustomer: CustomerSearchResult) => {
    selectCustomer(newCustomer);
    setIsNewCustomer(true);
    setShowCustomerModal(false);
  }, [selectCustomer]);

  // ── Pre-fill for edit mode ──
  const prefillCustomer = useCallback((customer: SelectedCustomer) => {
    setSelectedCustomer(customer);
  }, []);

  return {
    // State
    searchQuery,
    searchResults,
    isSearching,
    selectedCustomer,
    showDropdown,
    showCustomerModal,
    isNewCustomer,
    // Actions
    setSearchQuery,
    setShowDropdown,
    selectCustomer,
    clearCustomer,
    openCreateCustomer,
    onCustomerCreated,
    setShowCustomerModal,
    prefillCustomer,
  };
}

export type UseContractCustomerReturn = ReturnType<typeof useContractCustomer>;
