"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { searchCustomers } from "@/app/actions/customer-actions";
import type { SelectedCustomer } from "@/types/contract-form";

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

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 200;
const SEARCH_SLOW_MS = 1800;

export function useContractCustomer() {
  const [searchQuery, setSearchQueryState] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const searchRequestId = useRef(0);

  const debouncedQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);

  const setSearchQuery = useCallback((value: string) => {
    const normalized = value.trim();

    setSearchQueryState(value);
    setSearchError("");
    setSearchResults([]);
    setShowDropdown(normalized.length >= MIN_SEARCH_LENGTH);

    if (normalized.length < MIN_SEARCH_LENGTH) {
      searchRequestId.current += 1;
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const query = debouncedQuery.trim();
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;

    if (query.length < MIN_SEARCH_LENGTH) {
      // Search effect: these synchronous resets clear stale results when the
      // query is too short; they are part of a debounced search, not a
      // cascading render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (cancelled || searchRequestId.current !== requestId) return;
      setIsSearching(false);
      setShowDropdown(true);
      setSearchError("Tìm kiếm đang chậm, có thể tạo khách mới ngay.");
    }, SEARCH_SLOW_MS);

    async function doSearch() {
      setIsSearching(true);
      setSearchError("");
      setShowDropdown(true);

      try {
        const result = await searchCustomers(query);
        if (cancelled || searchRequestId.current !== requestId) return;

        if (result.success) {
          setSearchResults(result.data as CustomerSearchResult[]);
          setSearchError("");
        } else {
          setSearchResults([]);
          setSearchError(result.error || "Không tải được danh sách khách hàng.");
        }
      } catch (error) {
        if (cancelled || searchRequestId.current !== requestId) return;
        setSearchResults([]);
        setSearchError(error instanceof Error ? error.message : "Không tải được danh sách khách hàng.");
      } finally {
        window.clearTimeout(slowTimer);
        if (!cancelled && searchRequestId.current === requestId) {
          setIsSearching(false);
          setShowDropdown(true);
        }
      }
    }

    void doSearch();

    return () => {
      cancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [debouncedQuery]);

  // Show/hide the results dropdown based on query length. Adjust state during
  // render instead of in an effect to avoid a cascading render.
  const [prevDropdownDeps, setPrevDropdownDeps] = useState<{ query: string; selected: typeof selectedCustomer } | null>(null);
  if (!prevDropdownDeps || prevDropdownDeps.query !== searchQuery || prevDropdownDeps.selected !== selectedCustomer) {
    setPrevDropdownDeps({ query: searchQuery, selected: selectedCustomer });
    const normalized = searchQuery.trim();
    if (normalized.length >= MIN_SEARCH_LENGTH && !selectedCustomer) {
      setShowDropdown(true);
    } else if (normalized.length < MIN_SEARCH_LENGTH) {
      setShowDropdown(false);
    }
  }

  const reopenSearchDropdown = useCallback(() => {
    if (searchQuery.trim().length >= MIN_SEARCH_LENGTH && !selectedCustomer) {
      setShowDropdown(true);
    }
  }, [searchQuery, selectedCustomer]);

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
    setSearchQueryState("");
    setSearchResults([]);
    setSearchError("");
    setShowDropdown(false);
  }, []);

  const clearCustomer = useCallback(() => {
    searchRequestId.current += 1;
    setSelectedCustomer(null);
    setSearchQueryState("");
    setSearchResults([]);
    setSearchError("");
    setIsSearching(false);
    setShowDropdown(false);
    setIsNewCustomer(false);
  }, []);

  const openCreateCustomer = useCallback(() => {
    setShowCustomerModal(true);
    setShowDropdown(false);
  }, []);

  const onCustomerCreated = useCallback((newCustomer: CustomerSearchResult) => {
    selectCustomer(newCustomer);
    setIsNewCustomer(true);
    setShowCustomerModal(false);
  }, [selectCustomer]);

  const prefillCustomer = useCallback((customer: SelectedCustomer) => {
    searchRequestId.current += 1;
    setSelectedCustomer(customer);
    setSearchResults([]);
    setSearchError("");
    setIsSearching(false);
    setShowDropdown(false);
  }, []);

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    selectedCustomer,
    showDropdown,
    showCustomerModal,
    isNewCustomer,
    setSearchQuery,
    reopenSearchDropdown,
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
