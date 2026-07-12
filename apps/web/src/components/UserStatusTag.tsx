import type { UserStatus } from '../types/user';

const statusConfig: Record<
  UserStatus,
  {
    label: string;
    className: string;
  }
> = {
  ACTIVE: {
    label: '正常',
    className: 'user-status-tag--active',
  },
  DISABLED: {
    label: '已停用',
    className: 'user-status-tag--disabled',
  },
  PENDING_ACTIVATION: {
    label: '待激活',
    className: 'user-status-tag--pending-activation',
  },
  LOCKED: {
    label: '已锁定',
    className: 'user-status-tag--locked',
  },
  RESIGNED: {
    label: '已离职',
    className: 'user-status-tag--resigned',
  },
  EXPIRED: {
    label: '已过期',
    className: 'user-status-tag--expired',
  },
};

export interface UserStatusTagProps {
  status?: UserStatus | null;
}

export function UserStatusTag({ status }: UserStatusTagProps) {
  const config = status ? statusConfig[status] : undefined;

  if (!config) {
    return <span className="user-status-tag user-status-tag--unknown">—</span>;
  }

  return <span className={`user-status-tag ${config.className}`}>{config.label}</span>;
}

export default UserStatusTag;
