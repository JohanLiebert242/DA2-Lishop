'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminUserItem } from '../../../lib/admin-api';

function UserRow({ user }: { user: AdminUserItem }) {
  const queryClient = useQueryClient();

  const roleMutation = useMutation({
    mutationFn: (role: 'ADMIN' | 'CUSTOMER') => adminApi.updateUserRole(user.id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const isAdmin = user.role === 'ADMIN';

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
        }`}>
          {isAdmin ? 'Admin' : 'Khách hàng'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">{user.loyaltyPoints}</td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => {
            const next = isAdmin ? 'CUSTOMER' : 'ADMIN';
            if (window.confirm(`Đổi vai trò ${user.email} thành ${next}?`)) {
              roleMutation.mutate(next);
            }
          }}
          disabled={roleMutation.isPending}
          className={`rounded-md border px-3 py-1 text-xs font-medium disabled:opacity-50 ${
            isAdmin
              ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'border-purple-200 text-purple-700 hover:bg-purple-50'
          }`}
        >
          {isAdmin ? 'Hạ xuống KH' : 'Cấp Admin'}
        </button>
      </td>
    </tr>
  );
}

export default function UsersPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers(),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${users.length} người dùng`}
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Họ tên</th>
              <th className="px-4 py-2 text-left">Vai trò</th>
              <th className="px-4 py-2 text-left">Điểm tích lũy</th>
              <th className="px-4 py-2 text-left">Ngày tham gia</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => <UserRow key={user.id} user={user} />)}
          </tbody>
        </table>
        {!isLoading && users.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có người dùng.</p>
        )}
      </div>
    </div>
  );
}
