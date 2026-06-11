"use client";

import { ChevronDown, RefreshCw, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthUsers } from "@/app/actions/user-management";
import type { AuthUserWithEmployee } from "@/app/actions/user-management";
import MemberCard from "./member-card";
import { useState } from "react";

const PAGE_SIZE = 25;

// Query key dùng chung — invalidate từ bên ngoài (sau khi link/unlink employee)
export const AUTH_USERS_QUERY_KEY = ["settings", "auth-users"] as const;

interface MembersSectionProps {
  currentUserEmail: string;
}

export default function MembersSection({ currentUserEmail }: MembersSectionProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [allUsers, setAllUsers] = useState<AuthUserWithEmployee[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const { isLoading, isFetching, refetch } = useQuery({
    queryKey: [...AUTH_USERS_QUERY_KEY, page],
    queryFn: async () => {
      const result = await getAuthUsers({ page: 1, perPage: PAGE_SIZE });
      if (!result.success || !result.data) return [];
      setAllUsers(result.data.users);
      setHasMore(result.data.hasMore);
      return result.data.users;
    },
    // Cache 2 phút — danh sách user không thay đổi liên tục
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const handleRefresh = () => {
    setPage(1);
    setAllUsers([]);
    queryClient.invalidateQueries({ queryKey: AUTH_USERS_QUERY_KEY });
    void refetch();
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    const result = await getAuthUsers({ page: nextPage, perPage: PAGE_SIZE });
    if (result.success && result.data) {
      const existingIds = new Set(allUsers.map((u) => u.auth_id));
      const newUsers = result.data.users.filter((u) => !existingIds.has(u.auth_id));
      setAllUsers((prev) => [...prev, ...newUsers]);
      setPage(nextPage);
      setHasMore(result.data.hasMore);
    } else {
      setHasMore(false);
    }
  };

  const danglingCount = allUsers.filter((u) => !u.linked_employee).length;
  const loading = isLoading && allUsers.length === 0;
  const refreshing = isFetching && allUsers.length > 0;

  return (
    <section className="card-base p-4 lg:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-heading">
          <Users className="w-4 h-4 inline-block mr-1.5 align-middle" />
          Thành viên ({allUsers.length})
        </h3>
        {/* eslint-disable-next-line react/forbid-elements -- compact refresh action */}
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="icon-btn w-8! h-8!"
          title="Làm mới"
          aria-label="Làm mới danh sách thành viên"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!loading && danglingCount > 0 && (
        <p className="text-xs text-text-muted mb-3">
          Có {danglingCount} tài khoản đăng nhập chưa liên kết với hồ sơ nhân viên.
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-bg-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 bg-bg-hover rounded" />
                <div className="h-3 w-40 bg-bg-hover rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : allUsers.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          Chưa có thành viên nào
        </p>
      ) : (
        <div className="space-y-2">
          {allUsers.map((user) => (
            <MemberCard
              key={user.auth_id}
              user={user}
              isCurrentUser={user.email === currentUserEmail}
              onRefresh={handleRefresh}
            />
          ))}
          {hasMore && (
            /* eslint-disable-next-line react/forbid-elements -- compact pagination action */
            <button
              onClick={handleLoadMore}
              disabled={isFetching}
              className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border-base text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-60"
              type="button"
            >
              {isFetching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              Tải thêm
            </button>
          )}
        </div>
      )}
    </section>
  );
}
