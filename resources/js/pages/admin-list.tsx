import { Head, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Mail,
    MapPin,
    Phone,
    RotateCw,
    Shield,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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

type AdminUser = {
    id: string;
    avatar_url: string | null;
    firstname: string;
    lastname: string;
    name: string;
    email: string;
    phone_user: string;
    address: string;
    role: string;
    status: string;
    created_at: string | null;
};

type PendingAction =
    | {
          type: 'role';
          user: AdminUser;
          currentRole: 'Admin' | 'Superadmin';
          nextRole: 'Admin' | 'Superadmin';
      }
    | {
          type: 'delete';
          user: AdminUser;
      }
    | null;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin List',
        href: '/admin-list',
    },
];

function normalizeStatus(status: string): 'Active' | 'Inactive' {
    return status?.toLowerCase() === 'active' ? 'Active' : 'Inactive';
}

function normalizeRole(role: string): 'Admin' | 'Superadmin' {
    return role?.toLowerCase() === 'superadmin' ? 'Superadmin' : 'Admin';
}

export default function AdminList({ users }: { users: AdminUser[] }) {
    const [usersState, setUsersState] = useState(users);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);

    const [statusByUserId, setStatusByUserId] = useState<
        Record<string, 'Active' | 'Inactive'>
    >(() =>
        Object.fromEntries(
            users.map((user) => [user.id, normalizeStatus(user.status)]),
        ),
    );
    const [roleByUserId, setRoleByUserId] = useState<
        Record<string, 'Admin' | 'Superadmin'>
    >(() =>
        Object.fromEntries(users.map((user) => [user.id, normalizeRole(user.role)])),
    );
    const [savingByUserId, setSavingByUserId] = useState<Record<string, boolean>>(
        {},
    );
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);

    const filteredUsers = useMemo(() => {
        const searchTerm = search.trim().toLowerCase();

        return usersState.filter((user) => {
            const role = (roleByUserId[user.id] ?? 'Admin').toLowerCase();
            const status = (statusByUserId[user.id] ?? 'Inactive').toLowerCase();

            const roleMatches = roleFilter === 'all' || role === roleFilter;
            const statusMatches = statusFilter === 'all' || status === statusFilter;

            if (!roleMatches || !statusMatches) {
                return false;
            }

            if (!searchTerm) {
                return true;
            }

            const haystack = [
                user.firstname,
                user.lastname,
                user.name,
                user.email,
                user.phone_user,
                user.address,
                role,
                status,
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(searchTerm);
        });
    }, [usersState, statusByUserId, roleByUserId, search, roleFilter, statusFilter]);

    const totalPages =
        itemsPerPage === 100
            ? 1
            : Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedUsers =
        itemsPerPage === 100
            ? filteredUsers
            : filteredUsers.slice(
                  (safePage - 1) * itemsPerPage,
                  safePage * itemsPerPage,
              );

    const pageButtons = useMemo(() => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        if (safePage <= 3) {
            return [1, 2, 3, '...', totalPages] as const;
        }

        if (safePage >= totalPages - 2) {
            return [1, '...', totalPages - 2, totalPages - 1, totalPages] as const;
        }

        return [1, '...', safePage, '...', totalPages] as const;
    }, [safePage, totalPages]);

    const confirmRoleChange = () => {
        if (!pendingAction || pendingAction.type !== 'role') {
            return;
        }

        const { user, currentRole, nextRole } = pendingAction;

        setRoleByUserId((prev) => ({
            ...prev,
            [user.id]: nextRole,
        }));
        setSavingByUserId((prev) => ({
            ...prev,
            [user.id]: true,
        }));

        router.patch(
            `/admin-list/${user.id}/role`,
            { role: nextRole },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    setRoleByUserId((prev) => ({
                        ...prev,
                        [user.id]: currentRole,
                    }));
                },
                onFinish: () => {
                    setSavingByUserId((prev) => ({
                        ...prev,
                        [user.id]: false,
                    }));
                    setPendingAction(null);
                },
            },
        );
    };

    const confirmDeleteUser = () => {
        if (!pendingAction || pendingAction.type !== 'delete') {
            return;
        }

        const { user } = pendingAction;

        setSavingByUserId((prev) => ({
            ...prev,
            [user.id]: true,
        }));

        router.delete(`/admin-list/${user.id}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setUsersState((prev) => prev.filter((u) => u.id !== user.id));
                setStatusByUserId((prev) => {
                    const next = { ...prev };
                    delete next[user.id];
                    return next;
                });
                setRoleByUserId((prev) => {
                    const next = { ...prev };
                    delete next[user.id];
                    return next;
                });
            },
            onFinish: () => {
                setSavingByUserId((prev) => ({
                    ...prev,
                    [user.id]: false,
                }));
                setPendingAction(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin List" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col justify-end gap-2 md:flex-row">
                    <Input
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Search any field..."
                        className="w-full md:max-w-xs"
                    />
                    <Select
                        value={roleFilter}
                        onValueChange={(value) => {
                            setRoleFilter(value);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-full md:w-36">
                            <SelectValue placeholder="Filter role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="superadmin">Superadmin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                            setStatusFilter(value);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-full md:w-36">
                            <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            setSearch('');
                            setRoleFilter('all');
                            setStatusFilter('all');
                            setStatusByUserId(
                                Object.fromEntries(
                                    usersState.map((u) => [u.id, normalizeStatus(u.status)]),
                                ),
                            );
                            setRoleByUserId(
                                Object.fromEntries(
                                    usersState.map((u) => [u.id, normalizeRole(u.role)]),
                                ),
                            );
                        }}
                        className="w-full md:w-9"
                        title="Refresh filters"
                    >
                        <RotateCw className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rows per page</span>
                        <Select
                            value={String(itemsPerPage)}
                            onValueChange={(value) => {
                                setItemsPerPage(Number(value));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[96px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="9">9</SelectItem>
                                <SelectItem value="18">18</SelectItem>
                                <SelectItem value="27">27</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">All</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {filteredUsers.length === 0 ? (
                    <div className="rounded-xl border border-sidebar-border/70 px-4 py-10 text-center text-muted-foreground">
                        No matching users found in leads.users
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {paginatedUsers.map((user) => {
                            const status = statusByUserId[user.id] ?? 'Inactive';
                            const isActive = status === 'Active';
                            const role = roleByUserId[user.id] ?? 'Admin';
                            const isSaving = savingByUserId[user.id] === true;

                            const roleChipClass = !isActive
                                ? 'border-transparent bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300'
                                : role === 'Superadmin'
                                  ? 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                  : 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300';

                            return (
                                <Card key={user.id} className="gap-4 py-4">
                                    <CardContent className="space-y-4 px-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                {user.avatar_url ? (
                                                    <img
                                                        src={user.avatar_url}
                                                        alt={`${user.firstname} ${user.lastname}`}
                                                        className="h-12 w-12 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                                                        {(
                                                            (user.firstname?.[0] ?? '') +
                                                            (user.lastname?.[0] ?? '')
                                                        )
                                                            .toUpperCase()
                                                            .trim() || 'U'}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="truncate text-base font-semibold">
                                                        {`${user.firstname} ${user.lastname}`.trim()}
                                                    </p>
                                                    <span
                                                        className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleChipClass}`}
                                                    >
                                                        {role}
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextStatus = isActive
                                                        ? 'Inactive'
                                                        : 'Active';

                                                    setStatusByUserId((prev) => ({
                                                        ...prev,
                                                        [user.id]: nextStatus,
                                                    }));
                                                    setSavingByUserId((prev) => ({
                                                        ...prev,
                                                        [user.id]: true,
                                                    }));

                                                    router.patch(
                                                        `/admin-list/${user.id}/status`,
                                                        { status: nextStatus },
                                                        {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                            onError: () => {
                                                                setStatusByUserId((prev) => ({
                                                                    ...prev,
                                                                    [user.id]: isActive
                                                                        ? 'Active'
                                                                        : 'Inactive',
                                                                }));
                                                            },
                                                            onFinish: () => {
                                                                setSavingByUserId((prev) => ({
                                                                    ...prev,
                                                                    [user.id]: false,
                                                                }));
                                                            },
                                                        },
                                                    );
                                                }}
                                                disabled={isSaving}
                                                className={`relative inline-flex h-7 w-24 items-center rounded-full border px-6 text-[11px] font-semibold transition-colors ${
                                                    isActive
                                                        ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-200'
                                                        : 'border-red-300 bg-red-100 text-red-700 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200'
                                                }`}
                                                aria-label={`Toggle ${user.firstname} ${user.lastname} status`}
                                            >
                                                <span className="w-full text-center">
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </span>
                                                <span
                                                    className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition-all ${
                                                        isActive ? 'right-1' : 'left-1'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <p className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                <span className="truncate">{user.email}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                <span>{user.phone_user}</span>
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                <span className="truncate">{user.address}</span>
                                            </p>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="grid grid-cols-2 gap-2 px-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                const currentRole =
                                                    roleByUserId[user.id] ?? 'Admin';
                                                const nextRole =
                                                    currentRole === 'Admin'
                                                        ? 'Superadmin'
                                                        : 'Admin';
                                                setPendingAction({
                                                    type: 'role',
                                                    user,
                                                    currentRole,
                                                    nextRole,
                                                });
                                            }}
                                            disabled={isSaving}
                                            className="w-full"
                                        >
                                            <Shield className="mr-1 h-4 w-4" />
                                            Change Role
                                        </Button>

                                        <Button
                                            type="button"
                                            variant="destructive"
                                            onClick={() =>
                                                setPendingAction({
                                                    type: 'delete',
                                                    user,
                                                })
                                            }
                                            disabled={isSaving}
                                            className="w-full"
                                        >
                                            <Trash2 className="mr-1 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {filteredUsers.length > 0 && (
                    <div className="flex items-center justify-center gap-1 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-3"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={safePage === 1}
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Previous
                        </Button>

                        {pageButtons.map((page, index) =>
                            page === '...' ? (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="px-2 text-sm text-muted-foreground"
                                >
                                    ...
                                </span>
                            ) : (
                                <Button
                                    key={page}
                                    type="button"
                                    variant={page === safePage ? 'outline' : 'ghost'}
                                    className="h-9 min-w-9 px-3"
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </Button>
                            ),
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-3"
                            onClick={() =>
                                setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={safePage === totalPages}
                        >
                            Next
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <Dialog
                open={pendingAction !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingAction(null);
                    }
                }}
            >
                <DialogContent>
                    {pendingAction?.type === 'delete' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Delete user?</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete{' '}
                                    <span className="font-semibold text-foreground">
                                        {`${pendingAction.user.firstname} ${pendingAction.user.lastname}`}
                                    </span>
                                    ? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPendingAction(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={confirmDeleteUser}
                                >
                                    Delete
                                </Button>
                            </DialogFooter>
                        </>
                    ) : pendingAction?.type === 'role' ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Change role?</DialogTitle>
                                <DialogDescription>
                                    Change role for{' '}
                                    <span className="font-semibold text-foreground">
                                        {`${pendingAction.user.firstname} ${pendingAction.user.lastname}`}
                                    </span>{' '}
                                    from{' '}
                                    <span className="font-semibold text-foreground">
                                        {pendingAction.currentRole}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-semibold text-foreground">
                                        {pendingAction.nextRole}
                                    </span>
                                    ?
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPendingAction(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={confirmRoleChange}
                                >
                                    Confirm
                                </Button>
                            </DialogFooter>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
