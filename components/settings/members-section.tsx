"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, RefreshCw } from "lucide-react";
import { getAuthUsers } from "@/app/actions/user-management";
import type { AuthUserWithEmployee } from "@/app/actions/user-management";
import MemberCard from "./member-card";

interface MembersSectionProps {
  currentUserEmail: string;
}

export default function MembersSection({
  currentUserEmail,
}: MembersSectionProps) {
  const [users, setUsers] = useState<AuthUserWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setRefreshing(true);
    }

    const result = await getAuthUsers();
    if (result.success && result.data) {
      setUsers(result.data);
    } else {
      setUsers([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadUsers = async () => {
      const result = await getAuthUsers();
      if (ignore) return;

      if (result.success && result.data) {
        setUsers(result.data);
      } else {
        setUsers([]);
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
    void fetchUsers();
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
              onRefresh={fetchUsers}
            />
          ))}
        </div>
      )}
    </section>
  );
}
