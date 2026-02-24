'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/staff', label: 'スタッフ', icon: '👤' },
  { href: '/settings', label: '設定', icon: '⚙️' },
  { href: '/requests', label: '希望', icon: '📅' },
  { href: '/schedule', label: 'シフト', icon: '📋' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <>
      {/* Top header */}
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-2 shadow no-print">
        <span className="text-xl font-bold">📅 Shift Maker</span>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50 no-print">
        {links.map((l) => {
          const active = path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                active
                  ? 'text-indigo-600 font-semibold'
                  : 'text-gray-500 hover:text-indigo-500'
              }`}
            >
              <span className="text-xl">{l.icon}</span>
              <span>{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
