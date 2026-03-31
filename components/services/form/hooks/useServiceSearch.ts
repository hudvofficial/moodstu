import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { getServices } from "@/app/actions/service-queries";
import type { ServiceRecord } from "@/types/service";
import { toast } from "sonner";

export function useServiceSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 400);
  const [searchResults, setSearchResults] = useState<ServiceRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSearching(true);

    getServices({ search: debouncedSearch, fulfillment_type: "single" })
      .then((res) => {
        if (!cancelled && res.success && res.data) {
          setSearchResults(res.data.items as ServiceRecord[]);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error("Lỗi tìm kiếm dịch vụ: " + (err instanceof Error ? err.message : "Đã có lỗi xảy ra"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsSearching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (val.length < 2) {
      setSearchResults([]);
      setShowResults(false);
    } else {
      setShowResults(true);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setShowResults(false);
  };

  return {
    searchTerm,
    searchResults,
    showResults,
    isSearching,
    handleSearchChange,
    clearSearch,
  };
}
