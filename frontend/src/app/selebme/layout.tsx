// Force dynamic rendering — this page uses useSearchParams and should
// never be statically prerendered (it's a protected admin panel)
export const dynamic = 'force-dynamic';

export default function SelebmeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
