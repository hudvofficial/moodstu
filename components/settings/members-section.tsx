"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown, RefreshCw, Users } from "lucide-react";
import { getAuthUsers } from "@/app/actions/user-management";
import type { AuthUserWithEmployee } from "@/app/actions/user-management";
import MemberCard from "./member-card";

const PAGE_SIZE = 25;

interface MembersSectionProps {
  currentUserEmail: string;
}

export default function MembersSection({
  currentUserEmail,
}: MembersSectionProps) {
  const [users, setUsers] = useState<AuthUserWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchUsers = useCallback(async (options?: {
    append?: boolean;
    page?: number;
    silent?: boolean;
  }) => {
    const targetPage = options?.page ?? 1;
    if (options?.append) {
      setLoadingMore(true);
    } else if (!options?.silent) {
      setRefreshing(true);
    }

    const result = await getAuthUsers({ page: targetPage, perPage: PAGE_SIZE });
    if (result.success && result.data) {
      setUsers((current) => {
        if (!options?.append) return result.data.users;

        const existingIds = new Set(current.map((user) => user.auth_id));
        const nextUsers = result.data.users.filter(
          (user) => !existingIds.has(user.auth_id),
        );
        return [...current, ...nextUsers];
      });
      setPage(result.data.page);
      setHasMore(result.data.hasMore);
    } else if (!options?.append) {
      setUsers([]);
      setHasMore(false);
    } else {
      setHasMore(false);
    }
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadUsers = async () => {
      const result = await getAuthUsers({ page: 1, perPage: PAGE_SIZE });
      if (ignore) return;

      if (result.success && result.data) {
        setUsers(result.data.users);
        setPage(result.data.page);
        setHasMore(result.data.hasMore);
      } else {
        setUsers([]);
        setHasMore(false);
      }
      setLoading(false);
      setRefreshing(false);
    };

    void loadUsers();

    return () => {
      ignore = true;
    };
  }, [fetchUsers]);

  const handleRefresh = () => {
    void fetchUsers({ page: 1 });
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    void fetchUsers({ append: true, page: page + 1, silent: true });
  };

  const danglingCount = users.filter((user) => !user.linked_employee).length;

  return (
    <section className="card-base p-4 lg:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-heading">
          <Users className="w-4 h-4 inline-block mr-1.5 align-middle" />
          Thành viên ({users.length})
        </h3>
        {/* eslint-disable-next-line react/forbid-elements -- compact refresh action */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
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
      ) : users.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          Chưa có thành viên nào
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
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
              disabled={loadingMore}
              className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border-base text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover disabled:opacity-60"
              type="button"
            >
              {loadingMore ? (
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
