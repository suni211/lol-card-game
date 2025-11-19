import type { User } from '../types';

interface UserDisplayProps {
  user: User | { username: string; title_name?: string | null; title_color?: string | null; title_icon?: string | null };
  showTitle?: boolean;
  className?: string;
  titleClassName?: string;
}

export default function UserDisplay({ user, showTitle = true, className = '', titleClassName = '' }: UserDisplayProps) {
  const hasTitle = showTitle && user.title_name;

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {hasTitle && (
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold ${titleClassName}`}
          style={{
            backgroundColor: user.title_color ? `${user.title_color}20` : '#6b728020',
            color: user.title_color || '#6b7280',
            border: `1px solid ${user.title_color || '#6b7280'}40`
          }}
        >
          {user.title_icon && <span className="mr-1">{user.title_icon}</span>}
          {user.title_name}
        </span>
      )}
      <span>{user.username}</span>
    </span>
  );
}
