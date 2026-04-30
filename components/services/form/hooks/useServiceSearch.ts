import { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { searchServicesForBundle } from "@/app/actions/service-queries";
import type { ServiceRecord } from "@/types/service";
import { toast } from "sonner";

export type BundleSearchResult = Pick<
  ServiceRecord,
  "id" | "name" | "service_code" | "selling_price" | "unit" | "category_id" | "image_url"
>;

export function useServiceSearch() {
  const requestSeq = useRef(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 400);
  const [searchResults, setSearchResults] = useState<BundleSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const query = debouncedSearch.trim();

    if (query.length < 2) {
      return;
    }

    const seq = ++requestSeq.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- marks an async server-action search as pending for this debounced query
    setIsSearching(true);
    setHasSearched(false);

    searchServicesForBundle(query)
      .then((res) => {
        if (seq !== requestSeq.current) return;
        if (!res.success) {
          throw new Error(res.error || "Không thể tìm dịch vụ");
        }
        setSearchResults((res.data || []) as BundleSearchResult[]);
      })
      .catch((err) => {
        if (seq !== requestSeq.current) return;
        setSearchResults([]);
        toast.error("Lỗi tìm kiếm dịch vụ: " + (err instanceof Error ? err.message : "Đã có lỗi xảy ra"));
      })
      .finally(() => {
        if (seq !== requestSeq.current) return;
        setIsSearching(false);
        setHasSearched(true);
      });
  }, [debouncedSearch]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    const shouldShow = val.trim().length >= 2;
    setShowResults(shouldShow);
    if (!shouldShow) {
      requestSeq.current += 1;
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
    }
  };

  const clearSearch = () => {
    requestSeq.current += 1;
    setSearchTerm("");
    setSearchResults([]);
    setShowResults(false);
    setIsSearching(false);
    setHasSearched(false);
  };

  return {
    searchTerm,
    searchResults,
    showResults,
    isSearching,
    hasSearched,
    handleSearchChange,
    clearSearch,
  };
}
