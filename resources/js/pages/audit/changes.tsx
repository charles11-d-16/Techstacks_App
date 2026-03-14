import { Head } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    FilePenLine,
    Mail,
    RotateCw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ChangeHistoryRow = {
    id: string;
    name: string;
    email: string;
    role?: string;
    avatar_url?: string | null;
    inquiry_id: string;
    full_name: string;
    inquiry_type?: string;
    edited_at: string | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Audit Trail',
        href: '/audit-trail/change-history',
    },
    {
        title: 'Change History',
        href: '/audit-trail/change-history',
    },
];

const getInitials = (name: string): string => {
    const initials = name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

    return initials || 'U';
};

const formatDateTime = (value: string | null): string => {
    if (!value) {
        return 'N/A';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'N/A';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    })
        .format(date)
        .replace(',', '')
        .replace(/ (\d{2})$/, '/$1');
};

const formatRole = (role: string | undefined): string => {
    const normalized = (role ?? '').trim().toLowerCase();

    if (normalized === 'superadmin' || normalized === 'super_admin') {
        return 'Superadmin';
    }

    if (normalized === 'admin') {
        return 'Admin';
    }

    return 'N/A';
};

const roleChipClass = (role: string | undefined): string => {
    const normalized = (role ?? '').trim().toLowerCase();

    if (normalized === 'superadmin' || normalized === 'super_admin') {
        return 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    }

    if (normalized === 'admin') {
        return 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';
    }

    return 'border-transparent bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300';
};

const formatInquiryType = (value: string | undefined): string => {
    const normalized = (value ?? '').trim().toLowerCase();

    if (normalized === 'leads') {
        return 'Leads';
    }

    return 'Inquirer';
};

export default function AuditChanges({
    changes,
}: {
    changes: ChangeHistoryRow[];
}) {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredChanges = useMemo(() => {
        const term = search.trim().toLowerCase();

        return changes.filter((change) => {
            const roleMatches =
                roleFilter === 'All' ||
                formatRole(change.role).toLowerCase() === roleFilter.toLowerCase();

            if (!roleMatches) {
                return false;
            }

            if (!term) {
                return true;
            }

            return [
                change.name,
                change.role,
                change.email,
                change.inquiry_id,
                change.full_name,
                formatInquiryType(change.inquiry_type),
                formatDateTime(change.edited_at),
            ]
                .join(' ')
                .toLowerCase()
                .includes(term);
        });
    }, [changes, roleFilter, search]);

    const totalPages =
        itemsPerPage === 100
            ? 1
            : Math.max(1, Math.ceil(filteredChanges.length / itemsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = itemsPerPage === 100 ? 0 : (safePage - 1) * itemsPerPage;
    const paginatedChanges =
        itemsPerPage === 100
            ? filteredChanges
            : filteredChanges.slice(startIndex, startIndex + itemsPerPage);

    const paginationItems = useMemo(() => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (safePage <= 3) {
            return [1, 2, 3, 'ellipsis', totalPages];
        }

        if (safePage >= totalPages - 2) {
            return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
        }

        return [1, 'ellipsis', safePage - 1, safePage, safePage + 1, 'ellipsis', totalPages];
    }, [safePage, totalPages]);

    const resetFilters = () => {
        setSearch('');
        setRoleFilter('All');
        setCurrentPage(1);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Change History" />

            <div className="space-y-4 p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm font-medium text-muted-foreground">
                        {filteredChanges.length} total
                    </div>

                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                        <Input
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search change..."
                            className="w-full md:w-80"
                        />
                        <Select
                            value={roleFilter}
                            onValueChange={(value) => {
                                setRoleFilter(value);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-40">
                                <SelectValue placeholder="All Roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Roles</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Superadmin">Superadmin</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-full md:w-9"
                            onClick={resetFilters}
                            title="Refresh filters"
                        >
                            <RotateCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="space-y-3">
                    {paginatedChanges.length > 0 ? (
                        paginatedChanges.map((change) => (
                            <div
                                key={change.id}
                                className="rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm"
                            >
                                <div className="grid gap-4 lg:grid-cols-[1fr_0.5fr_1fr_0.5fr_0.5fr] lg:items-center">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar className="size-10">
                                            <AvatarImage
                                                src={change.avatar_url ?? undefined}
                                                alt={change.name || 'User avatar'}
                                            />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(change.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 space-y-1">
                                            <div className="truncate font-medium">
                                                {change.name || 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                                                <Mail className="size-4" />
                                                <span className="truncate">
                                                    {change.email || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="min-w-0 space-y-1 text-left">
                                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Role
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleChipClass(
                                                change.role,
                                            )}`}
                                        >
                                            {formatRole(change.role)}
                                        </span>
                                    </div>

                                    <div className="min-w-0 space-y-1 text-left">
                                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Event
                                        </div>
                                        <div className="flex items-center gap-2 font-medium">
                                            <FilePenLine className="size-4 text-amber-400" />
                                            <span className="truncate">
                                                <span className="text-[#23d6c8]">
                                                    {change.inquiry_id || 'N/A'}
                                                </span>{' '}
                                                {change.full_name || ''}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="min-w-0 space-y-1 text-left">
                                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Type
                                        </div>
                                        <div className="font-medium">
                                            {formatInquiryType(change.inquiry_type)}
                                        </div>
                                    </div>

                                    <div className="min-w-0 space-y-1 text-left">
                                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                            Date / Time
                                        </div>
                                        <div className="font-medium">
                                            {formatDateTime(change.edited_at)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="rounded-2xl border border-border/60 bg-card px-6 py-10 text-center text-muted-foreground shadow-sm">
                            No change history found.
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-center">
                    <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-foreground">Rows per page</span>
                        <Select
                            value={String(itemsPerPage)}
                            onValueChange={(value) => {
                                const next = Number(value);
                                setItemsPerPage(next);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[72px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="top" align="center">
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">All</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-3"
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            disabled={safePage <= 1}
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Previous
                        </Button>

                        {paginationItems.map((item, index) =>
                            item === 'ellipsis' ? (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="px-2 text-sm text-muted-foreground"
                                >
                                    ...
                                </span>
                            ) : (
                                <Button
                                    key={item}
                                    type="button"
                                    variant={safePage === item ? 'outline' : 'ghost'}
                                    className="h-9 min-w-9 px-3"
                                    onClick={() => setCurrentPage(Number(item))}
                                >
                                    {item}
                                </Button>
                            ),
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-3"
                            onClick={() =>
                                setCurrentPage((page) => Math.min(totalPages, page + 1))
                            }
                            disabled={safePage >= totalPages}
                        >
                            Next
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
