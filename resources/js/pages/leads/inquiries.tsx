import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Plus,
    RotateCw,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type InquiryRow = {
    id: string;
    inquiry_id: string;
    full_name: string;
    email: string;
    message: string;
    phone: string;
    company: string;
    discovery_platform: string;
    concern_type: string;
    type: string;
    status: string;
    inquiry_date: string | null;
    status_date: string | null;
};

type PaginationMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

type MoveState = {
    row: InquiryRow;
    nextStatus: string;
    step: 'confirm' | 'notes';
};

const statusChipClass = (status: string): string => {
    const normalized = status.trim().toLowerCase();

    if (normalized === 'new') {
        return 'bg-emerald-500/15 text-emerald-400';
    }
    if (normalized === 'completed-successful') {
        return 'bg-teal-500/15 text-teal-400';
    }
    if (normalized === 'completed-unsuccessful') {
        return 'bg-rose-500/15 text-rose-400';
    }
    if (normalized === 'cancelled') {
        return 'bg-slate-500/15 text-slate-400';
    }
    if (normalized === 'contacted') {
        return 'bg-blue-500/15 text-blue-400';
    }
    if (normalized === 'in progress-active' || normalized === 'in progress') {
        return 'bg-amber-500/15 text-amber-400';
    }
    if (normalized === 'in progress-on hold') {
        return 'bg-orange-500/15 text-orange-400';
    }

    return 'bg-muted text-muted-foreground';
};

const displaySource = (type: string, source: string): string => {
    if (type.trim().toLowerCase() === 'inquirer') {
        return 'Website';
    }

    return source || '-';
};

export default function LeadInquiries({
    statusKey,
    statusLabel,
    rows,
    pagination,
    filters,
}: {
    statusKey: string;
    statusLabel: string;
    rows: InquiryRow[];
    pagination: PaginationMeta;
    filters: {
        search: string;
        type: string;
        source: string;
        concern: string;
        per_page: number;
    };
}) {
    const { flash } = usePage<{ flash?: { success?: string } }>().props;
    const [search, setSearch] = useState(filters.search ?? '');
    const [type, setType] = useState(filters.type ?? 'All');
    const [source, setSource] = useState(filters.source ?? 'All');
    const [concern, setConcern] = useState(filters.concern ?? 'All');
    const rowsPerPage = String(filters.per_page ?? pagination.per_page ?? 5);
    const [moveState, setMoveState] = useState<MoveState | null>(null);
    const [moveNotes, setMoveNotes] = useState('');
    const [moving, setMoving] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deletingSelected, setDeletingSelected] = useState(false);
    const [successMessage, setSuccessMessage] = useState(flash?.success ?? '');

    const applyFilters = (
        nextSearch: string,
        nextType: string,
        nextSource: string,
        nextConcern: string,
        nextPerPage: string = rowsPerPage,
    ) => {
        router.get(
            `/leads/inquiries/${statusKey}`,
            {
                search: nextSearch,
                type: nextType,
                source: nextSource,
                concern: nextConcern,
                per_page: Number(nextPerPage),
                page: 1,
            },
            {
                preserveScroll: true,
                preserveState: false,
            },
        );
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Leads', href: `/leads/inquiries/${statusKey}` },
        { title: statusLabel, href: `/leads/inquiries/${statusKey}` },
    ];

    const pageHref = (page: number): string => {
        const params = new URLSearchParams();
        params.set('page', String(page));

        if (filters.search) {
            params.set('search', filters.search);
        }
        if (filters.type && filters.type !== 'All') {
            params.set('type', filters.type);
        }
        if (filters.source && filters.source !== 'All') {
            params.set('source', filters.source);
        }
        if (filters.concern && filters.concern !== 'All') {
            params.set('concern', filters.concern);
        }
        if (filters.per_page) {
            params.set('per_page', String(filters.per_page));
        }

        return `/leads/inquiries/${statusKey}?${params.toString()}`;
    };

    const pageButtons = (() => {
        if (pagination.last_page <= 5) {
            return Array.from({ length: pagination.last_page }, (_, i) => i + 1);
        }

        if (pagination.current_page <= 3) {
            return [1, 2, 3, '...', pagination.last_page] as const;
        }

        if (pagination.current_page >= pagination.last_page - 2) {
            return [
                1,
                '...',
                pagination.last_page - 2,
                pagination.last_page - 1,
                pagination.last_page,
            ] as const;
        }

        return [1, '...', pagination.current_page, '...', pagination.last_page] as const;
    })();

    const visibleRowIds = useMemo(() => rows.map((row) => row.id), [rows]);
    const visibleRowIdSet = useMemo(() => new Set(visibleRowIds), [visibleRowIds]);
    const selectedVisibleIds = useMemo(
        () => selectedIds.filter((id) => visibleRowIdSet.has(id)),
        [selectedIds, visibleRowIdSet],
    );

    const totalRowsOnPage = rows.length;
    const selectedCount = selectedVisibleIds.length;
    const allSelected = totalRowsOnPage > 0 && selectedCount === totalRowsOnPage;
    const hasPartialSelection = selectedCount > 0 && !allSelected;

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setSuccessMessage('');
        }, 3000);

        return () => window.clearTimeout(timeoutId);
    }, [successMessage]);

    const toggleRowSelection = (rowId: string, checked: boolean) => {
        setSelectedIds((prev) => {
            if (checked) {
                return prev.includes(rowId) ? prev : [...prev, rowId];
            }

            return prev.filter((id) => id !== rowId);
        });
    };

    const toggleAllRows = (checked: boolean) => {
        if (checked) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                visibleRowIds.forEach((id) => next.add(id));
                return Array.from(next);
            });
            return;
        }

        setSelectedIds((prev) => prev.filter((id) => !visibleRowIdSet.has(id)));
    };

    const deleteSelectedRows = () => {
        if (selectedCount === 0) {
            return;
        }

        const deletingCount = selectedCount;
        const selectedInquiryCodes = rows
            .filter((row) => selectedVisibleIds.includes(row.id))
            .map((row) => row.inquiry_id)
            .filter((code) => code && code.trim() !== '');
        const singleInquiryCode = selectedInquiryCodes[0] ?? '';

        router.delete('/leads/inquiries/bulk-delete', {
            data: {
                inquiry_ids: selectedVisibleIds,
            },
            preserveScroll: true,
            preserveState: true,
            onStart: () => setDeletingSelected(true),
            onSuccess: () => {
                setSuccessMessage(
                    deletingCount === 1
                        ? `Successfully Deleted ${singleInquiryCode || 'ID'} Inquirer`
                        : `Successfully Deleted ${deletingCount} Inquirer`,
                );
                setSelectedIds([]);
                setSelectMode(false);
            },
            onFinish: () => setDeletingSelected(false),
        });
    };

    const openMoveConfirm = (row: InquiryRow, nextStatus: string) => {
        setMoveNotes('');
        setMoveState({
            row,
            nextStatus,
            step: 'confirm',
        });
    };

    const isSameStatus = (current: string, next: string) =>
        current.trim().toLowerCase() === next.trim().toLowerCase();

    const submitMove = () => {
        if (!moveState) {
            return;
        }

        router.patch(
            `/leads/inquiries/${moveState.row.id}/move`,
            {
                status: moveState.nextStatus,
                notes: moveNotes.trim(),
            },
            {
                preserveScroll: true,
                onStart: () => setMoving(true),
                onFinish: () => setMoving(false),
                onSuccess: () => {
                    setMoveState(null);
                    setMoveNotes('');
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${statusLabel} Leads`} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-end">
                        <Button
                            asChild
                            type="button"
                            className="w-full bg-[#23d6c8] text-black hover:bg-[#1fc4b7] md:w-auto"
                        >
                            <Link href="/leads/inquiries/add">
                                <Plus className="mr-1 h-4 w-4" />
                                Add Leads
                            </Link>
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <p className="text-sm text-muted-foreground">
                                {pagination.total} total
                            </p>
                            {!selectMode ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectMode(true)}
                                >
                                    Select
                                </Button>
                            ) : (
                                <label className="flex items-center gap-2 text-sm font-medium">
                                    <Checkbox
                                        checked={
                                            allSelected
                                                ? true
                                                : hasPartialSelection
                                                  ? 'indeterminate'
                                                  : false
                                        }
                                        onCheckedChange={(checked) =>
                                            toggleAllRows(checked === true)
                                        }
                                    />
                                    All
                                </label>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                            <Input
                                value={search}
                                onChange={(e) => {
                                    const nextSearch = e.target.value;
                                    setSearch(nextSearch);
                                    applyFilters(nextSearch, type, source, concern, rowsPerPage);
                                }}
                                placeholder="Search inquiry..."
                                className="w-full md:w-80"
                            />
                            <Select
                                value={type}
                                onValueChange={(value) => {
                                    setType(value);
                                    applyFilters(search, value, source, concern, rowsPerPage);
                                }}
                            >
                                <SelectTrigger className="w-full md:w-36">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">Type</SelectItem>
                                    <SelectItem value="Leads">Leads</SelectItem>
                                    <SelectItem value="Inquirer">Inquirer</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={source}
                                onValueChange={(value) => {
                                    setSource(value);
                                    applyFilters(search, type, value, concern, rowsPerPage);
                                }}
                            >
                                <SelectTrigger className="w-full md:w-36">
                                    <SelectValue placeholder="Source" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">Source</SelectItem>
                                    <SelectItem value="facebook">Facebook</SelectItem>
                                    <SelectItem value="instagram">Instagram</SelectItem>
                                    <SelectItem value="linkedIn">LinkedIn</SelectItem>
                                    <SelectItem value="referral">Referral</SelectItem>
                                    <SelectItem value="website">Website</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={concern}
                                onValueChange={(value) => {
                                    setConcern(value);
                                    applyFilters(search, type, source, value, rowsPerPage);
                                }}
                            >
                                <SelectTrigger className="w-full md:w-36">
                                    <SelectValue placeholder="Concern" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">Concern</SelectItem>
                                    <SelectItem value="proposal">
                                        Project Proposal
                                    </SelectItem>
                                    <SelectItem value="maintenance">
                                        MaintenanceSupport
                                    </SelectItem>
                                    <SelectItem value="security">
                                        Security Consultation
                                    </SelectItem>
                                    <SelectItem value="general">
                                        General Inquiry
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="w-full md:w-9"
                                onClick={() => {
                                    setSearch('');
                                    setType('All');
                                    setSource('All');
                                    setConcern('All');
                                    applyFilters('', 'All', 'All', 'All', rowsPerPage);
                                }}
                                title="Refresh filters"
                            >
                                <RotateCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {rows.length === 0 ? (
                    <div className="rounded-xl border border-sidebar-border/70 px-4 py-10 text-center text-muted-foreground">
                        No records for {statusLabel.toLowerCase()}.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rows.map((row) => (
                            <Card key={row.id} className="py-3">
                                <CardContent className="px-4">
                                    <div className="flex items-start gap-3">
                                        {selectMode ? (
                                            <Checkbox
                                                className="mt-1"
                                                checked={selectedIds.includes(row.id)}
                                                onCheckedChange={(checked) =>
                                                    toggleRowSelection(
                                                        row.id,
                                                        checked === true,
                                                    )
                                                }
                                            />
                                        ) : null}

                                        <div className="flex-1 space-y-1.5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <p className="text-sm font-semibold text-[#23d6c8]">
                                                        {row.inquiry_id || '-'}
                                                    </p>
                                                    <p className="text-base font-semibold">
                                                        {row.full_name || '-'}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusChipClass(
                                                        row.status,
                                                    )}`}
                                                >
                                                    {row.status || '-'}
                                                </span>
                                            </div>

                                            <p className="text-sm text-muted-foreground">
                                                {row.email || '-'}
                                            </p>

                                            {row.message &&
                                            row.message !== 'Empty - Please fill in later' ? (
                                                <p className="text-sm leading-normal text-foreground/90">
                                                    {row.message}
                                                </p>
                                            ) : null}

                                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                                    <p>
                                                        <span className="font-medium text-foreground">
                                                            Source:
                                                        </span>{' '}
                                                        {displaySource(row.type, row.discovery_platform)}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium text-foreground">
                                                            Concern:
                                                        </span>{' '}
                                                        {row.concern_type || '-'}
                                                    </p>
                                                    <p>
                                                        <span className="font-medium text-foreground">
                                                            Type:
                                                        </span>{' '}
                                                        {row.type || 'Inquirer'}
                                                    </p>
                                                </div>

                                                <div className="ml-auto flex items-center gap-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button size="sm" variant="outline">
                                                                Move
                                                                <ChevronDown className="ml-1 h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent
                                                            align="end"
                                                            className="w-44"
                                                        >
                                                            <DropdownMenuItem
                                                                disabled={isSameStatus(row.status, 'New')}
                                                                onClick={() =>
                                                                    openMoveConfirm(row, 'New')
                                                                }
                                                            >
                                                                New
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                disabled={isSameStatus(
                                                                    row.status,
                                                                    'Contacted',
                                                                )}
                                                                onClick={() =>
                                                                    openMoveConfirm(
                                                                        row,
                                                                        'Contacted',
                                                                    )
                                                                }
                                                            >
                                                                Contacted
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    In Progress
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent
                                                                    className="w-44"
                                                                >
                                                                    <DropdownMenuItem
                                                                        disabled={isSameStatus(
                                                                            row.status,
                                                                            'In Progress-Active',
                                                                        )}
                                                                        onClick={() =>
                                                                            openMoveConfirm(
                                                                                row,
                                                                                'In Progress-Active',
                                                                            )
                                                                        }
                                                                    >
                                                                        Active
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        disabled={isSameStatus(
                                                                            row.status,
                                                                            'In Progress-On Hold',
                                                                        )}
                                                                        onClick={() =>
                                                                            openMoveConfirm(
                                                                                row,
                                                                                'In Progress-On Hold',
                                                                            )
                                                                        }
                                                                    >
                                                                        On Hold
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                            <DropdownMenuSub>
                                                                <DropdownMenuSubTrigger>
                                                                    Completed
                                                                </DropdownMenuSubTrigger>
                                                                <DropdownMenuSubContent
                                                                    className="w-44"
                                                                >
                                                                    <DropdownMenuItem
                                                                        disabled={isSameStatus(
                                                                            row.status,
                                                                            'Completed-Successful',
                                                                        )}
                                                                        onClick={() =>
                                                                            openMoveConfirm(
                                                                                row,
                                                                                'Completed-Successful',
                                                                            )
                                                                        }
                                                                    >
                                                                        Successful
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        disabled={isSameStatus(
                                                                            row.status,
                                                                            'Completed-Unsuccessful',
                                                                        )}
                                                                        onClick={() =>
                                                                            openMoveConfirm(
                                                                                row,
                                                                                'Completed-Unsuccessful',
                                                                            )
                                                                        }
                                                                    >
                                                                        Unsuccessful
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuSubContent>
                                                            </DropdownMenuSub>
                                                            <DropdownMenuItem
                                                                disabled={isSameStatus(
                                                                    row.status,
                                                                    'Cancelled',
                                                                )}
                                                                onClick={() =>
                                                                    openMoveConfirm(
                                                                        row,
                                                                        'Cancelled',
                                                                    )
                                                                }
                                                            >
                                                                Cancelled
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <Button asChild size="sm" variant="outline">
                                                        <Link href={`/leads/inquiries/${row.id}`}>
                                                            View Details
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {pagination.total > 0 && (
                    <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-center">
                        <div className="flex items-center justify-center gap-2 text-sm">
                            <span className="text-foreground">Rows per page</span>
                            <Select
                                value={rowsPerPage}
                                onValueChange={(value) => {
                                    applyFilters(search, type, source, concern, value);
                                }}
                            >
                                <SelectTrigger className="h-9 w-[72px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent side="top" align="center">
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">All</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-center gap-1">
                        {pagination.current_page === 1 ? (
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-9 px-3"
                                disabled
                            >
                                <ChevronLeft className="mr-1 h-4 w-4" />
                                Previous
                            </Button>
                        ) : (
                            <Button asChild variant="ghost" className="h-9 px-3">
                                <Link
                                    href={pageHref(
                                        pagination.current_page - 1,
                                    )}
                                    preserveScroll
                                >
                                    <ChevronLeft className="mr-1 h-4 w-4" />
                                    Previous
                                </Link>
                            </Button>
                        )}

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
                                    asChild
                                    variant={
                                        page === pagination.current_page
                                            ? 'outline'
                                            : 'ghost'
                                    }
                                    className="h-9 min-w-9 px-3"
                                >
                                    <Link
                                        href={pageHref(page)}
                                        preserveScroll
                                    >
                                        {page}
                                    </Link>
                                </Button>
                            ),
                        )}

                        {pagination.current_page === pagination.last_page ? (
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-9 px-3"
                                disabled
                            >
                                Next
                                <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button asChild variant="ghost" className="h-9 px-3">
                                <Link
                                    href={pageHref(
                                        pagination.current_page + 1,
                                    )}
                                    preserveScroll
                                >
                                    Next
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Link>
                            </Button>
                        )}
                        </div>
                    </div>
                )}

                {selectMode && selectedCount > 0 ? (
                    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 alert-slide-up-enter">
                        <Alert className="w-full max-w-xl border-amber-300/60 bg-background/95 shadow-lg backdrop-blur">
                            <Trash2 className="text-amber-600" />
                            <AlertTitle>
                                Delete {selectedCount} inquirer
                                {selectedCount === 1 ? '' : 's'}
                            </AlertTitle>
                            <AlertDescription className="flex w-full items-center justify-between gap-3">
                                <span className="text-xs text-muted-foreground">
                                    This action permanently removes selected inquiries.
                                </span>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={deleteSelectedRows}
                                    disabled={deletingSelected}
                                >
                                    <Trash2 className="mr-1 h-4 w-4" />
                                    {deletingSelected ? 'Deleting...' : 'Delete'}
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                ) : null}
            </div>

            {successMessage ? (
                <div className="fixed right-4 top-4 z-50 w-full max-w-sm alert-top-enter">
                    <Alert className="border-emerald-300/60 bg-background/95 shadow-lg backdrop-blur">
                        <CheckCircle2 className="text-emerald-600" />
                        <AlertTitle className="text-base font-bold">{successMessage}</AlertTitle>
                    </Alert>
                </div>
            ) : null}

            <Dialog
                open={moveState?.step === 'confirm'}
                onOpenChange={(open) => {
                    if (!open) {
                        setMoveState(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogDescription>
                            Change{' '}
                            <span className="font-semibold text-foreground">
                                {moveState?.row.full_name || '-'}
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold text-foreground">
                                {moveState?.nextStatus || '-'}
                            </span>
                            ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMoveState(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() =>
                                setMoveState((prev) =>
                                    prev
                                        ? {
                                              ...prev,
                                              step: 'notes',
                                          }
                                        : prev,
                                )
                            }
                        >
                            Yes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={moveState?.step === 'notes'}
                onOpenChange={(open) => {
                    if (!open) {
                        setMoveState(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogDescription>
                            You are moving{' '}
                            <span className="font-semibold text-foreground">
                                {moveState?.row.full_name || '-'}
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold text-foreground">
                                {moveState?.nextStatus || '-'}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="move-message">Message</Label>
                        <textarea
                            id="move-message"
                            value={moveNotes}
                            onChange={(e) => setMoveNotes(e.target.value)}
                            placeholder="Enter your message"
                            rows={3}
                            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[88px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMoveState(null)}
                            disabled={moving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={submitMove}
                            disabled={moving}
                        >
                            Move
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
