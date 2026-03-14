import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgeCheck,
    BadgeInfo,
    Building2,
    CheckCircle2,
    ChevronDown,
    CircleHelp,
    Globe,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Search,
    Trash2,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type InquiryDetail = {
    id: string;
    full_name: string;
    email: string;
    discovery_platform: string;
    concern_type: string;
    message: string;
    status: string;
    inquiry_date: string | null;
    status_date: string | null;
    inquiry_id: string;
    __v: number;
    type: string;
    company: string;
    phone: string;
    address: string;
};

type HistoryItem = {
    status: string;
    notes: string;
    changed_at: string;
    changed_at_label: string;
    moved_by_name: string;
    moved_by_email: string;
    moved_by_role: string;
    moved_by_avatar: string | null;
};

type HistoryGroup = {
    date_key: string;
    date_label: string;
    items: HistoryItem[];
};

type MoveState = {
    nextStatus: string;
    step: 'confirm' | 'notes';
};

type HistoryView = 'board' | 'timeline';

const historyColumnOrder = [
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'in progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
] as const;

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

const statusCardAccentClass = (status: string): string => {
    const normalized = status.trim().toLowerCase();

    if (normalized === 'new') {
        return 'border-l-4 border-l-emerald-400 shadow-[-6px_0_16px_-12px_rgba(52,211,153,0.9)]';
    }
    if (normalized === 'completed-successful') {
        return 'border-l-4 border-l-teal-400 shadow-[-6px_0_16px_-12px_rgba(45,212,191,0.9)]';
    }
    if (normalized === 'completed-unsuccessful') {
        return 'border-l-4 border-l-rose-400 shadow-[-6px_0_16px_-12px_rgba(251,113,133,0.9)]';
    }
    if (normalized === 'cancelled') {
        return 'border-l-4 border-l-slate-400 shadow-[-6px_0_16px_-12px_rgba(148,163,184,0.9)]';
    }
    if (normalized === 'contacted') {
        return 'border-l-4 border-l-blue-400 shadow-[-6px_0_16px_-12px_rgba(96,165,250,0.9)]';
    }
    if (normalized === 'in progress-active' || normalized === 'in progress') {
        return 'border-l-4 border-l-amber-400 shadow-[-6px_0_16px_-12px_rgba(251,191,36,0.9)]';
    }
    if (normalized === 'in progress-on hold') {
        return 'border-l-4 border-l-orange-400 shadow-[-6px_0_16px_-12px_rgba(251,146,60,0.9)]';
    }

    return 'border-l-4 border-l-border';
};

const statusTimelineBarColor = (status: string): string => {
    const normalized = status.trim().toLowerCase();

    if (normalized === 'new') {
        return '#34d399';
    }
    if (normalized === 'contacted') {
        return '#60a5fa';
    }
    if (normalized === 'in progress-active' || normalized === 'in progress') {
        return '#fbbf24';
    }
    if (normalized === 'in progress-on hold') {
        return '#f97316';
    }
    if (normalized === 'completed-successful') {
        return '#2dd4bf';
    }
    if (normalized === 'completed-unsuccessful') {
        return '#f43f5e';
    }
    if (normalized === 'cancelled') {
        return '#94a3b8';
    }

    return '#64748b';
};

const formatValue = (value: string | null | undefined): string => {
    if (!value) {
        return '-';
    }

    return value;
};

const roleChipClass = (role: string): string => {
    const normalized = role.trim().toLowerCase();

    if (normalized === 'superadmin') {
        return 'bg-rose-500/15 text-rose-400';
    }

    if (normalized === 'admin') {
        return 'bg-blue-500/15 text-blue-400';
    }

    return 'bg-muted text-muted-foreground';
};

const initialsFromName = (name: string): string =>
    name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'ST';

export default function LeadShow({
    inquiry,
    historyGroups,
}: {
    inquiry: InquiryDetail;
    historyGroups: HistoryGroup[];
}) {
    const { flash } = usePage<{ flash?: { success?: string } }>().props;
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [successMessage, setSuccessMessage] = useState(flash?.success ?? '');
    const [expandedHistoryCards, setExpandedHistoryCards] = useState<string[]>([]);
    const [moveState, setMoveState] = useState<MoveState | null>(null);
    const [moveNotes, setMoveNotes] = useState('');
    const [moving, setMoving] = useState(false);
    const [overflowingHistoryCards, setOverflowingHistoryCards] = useState<string[]>([]);
    const [historyView, setHistoryView] = useState<HistoryView>('board');
    const [timelineClock, setTimelineClock] = useState(() => Date.now());

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setSuccessMessage('');
        }, 3000);

        return () => window.clearTimeout(timeoutId);
    }, [successMessage]);

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setTimelineClock(Date.now());
        }, 15000);

        return () => window.clearInterval(timerId);
    }, []);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Leads', href: '/leads/inquiries/new-inquiry' },
        { title: 'View Details', href: `/leads/inquiries/${inquiry.id}` },
    ];
    const isInquirer = inquiry.type.trim().toLowerCase() === 'inquirer';
    const historyColumns = useMemo(
        () =>
            historyColumnOrder.map((column) => ({
                ...column,
                items: historyGroups
                    .flatMap((group) =>
                        group.items.map((item) => ({
                            ...item,
                            date_label: group.date_label,
                        })),
                    )
                    .filter((item) => {
                        const normalized = item.status.trim().toLowerCase();

                        if (column.key === 'completed') {
                            return normalized.startsWith('completed');
                        }

                        if (column.key === 'in progress') {
                            return normalized.startsWith('in progress');
                        }

                        return normalized === column.key;
                    }),
            })),
        [historyGroups],
    );
    const timelineEntries = useMemo(() => {
        const flattened = historyGroups
            .flatMap((group) =>
                group.items.map((item) => ({
                    ...item,
                    date_label: group.date_label,
                    timestamp: new Date(item.changed_at).getTime(),
                })),
            )
            .filter((item) => !Number.isNaN(item.timestamp))
            .sort((a, b) => a.timestamp - b.timestamp);

        if (flattened.length === 0) {
            return [];
        }

        const start = flattened[0].timestamp;
        const latestTimestamp = flattened[flattened.length - 1].timestamp;
        const end = Math.max(
            timelineClock,
            latestTimestamp,
            start + 1000 * 60,
        );
        const totalSpan = Math.max(end - start, 1000 * 60 * 60);

        return flattened.map((item, index) => {
            const nextTimestamp = flattened[index + 1]?.timestamp ?? end;
            const segmentEnd = Math.max(nextTimestamp, item.timestamp + 1000 * 60);
            const isLatest = index === flattened.length - 1;
            const fromDate = new Date(item.changed_at);
            const toDate = new Date(nextTimestamp);

            return {
                ...item,
                leftPercent: ((item.timestamp - start) / totalSpan) * 100,
                widthPercent: ((segmentEnd - item.timestamp) / totalSpan) * 100,
                isLatest,
                barColor: statusTimelineBarColor(item.status),
                timeLabel: fromDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                }),
                fromLabel: fromDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                }),
                toLabel: isLatest
                    ? 'Now'
                    : toDate.toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: '2-digit',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                      }),
            };
        });
    }, [historyGroups, timelineClock]);
    const toggleHistoryCard = (cardKey: string) => {
        setExpandedHistoryCards((prev) =>
            prev.includes(cardKey)
                ? prev.filter((item) => item !== cardKey)
                : [...prev, cardKey],
        );
    };

    useLayoutEffect(() => {
        const collectOverflowingCards = () => {
            const next = Array.from(
                document.querySelectorAll<HTMLElement>('[data-history-preview-key]'),
            )
                .filter((node) => node.scrollWidth > node.clientWidth + 1)
                .map((node) => node.dataset.historyPreviewKey ?? '')
                .filter(Boolean);

            setOverflowingHistoryCards((prev) => {
                if (
                    prev.length === next.length &&
                    prev.every((value, index) => value === next[index])
                ) {
                    return prev;
                }

                return next;
            });
        };

        collectOverflowingCards();
        window.addEventListener('resize', collectOverflowingCards);

        return () => window.removeEventListener('resize', collectOverflowingCards);
    }, [historyColumns, expandedHistoryCards]);

    const isSameStatus = (current: string, next: string) =>
        current.trim().toLowerCase() === next.trim().toLowerCase();

    const openMoveConfirm = (nextStatus: string) => {
        setMoveNotes('');
        setMoveState({
            nextStatus,
            step: 'confirm',
        });
    };

    const submitMove = () => {
        if (!moveState) {
            return;
        }

        router.patch(
            `/leads/inquiries/${inquiry.id}/move`,
            {
                status: moveState.nextStatus,
                notes: moveNotes.trim(),
            },
            {
                preserveScroll: true,
                onStart: () => setMoving(true),
                onFinish: () => setMoving(false),
                onSuccess: () => {
                    setTimelineClock(Date.now());
                    setMoveState(null);
                    setMoveNotes('');
                    router.reload({
                        only: ['inquiry', 'historyGroups'],
                    });
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inquiry Details" />

            {successMessage ? (
                <div className="fixed right-4 top-4 z-50 w-full max-w-sm alert-top-enter">
                    <Alert className="border-emerald-300/60 bg-background/95 shadow-lg backdrop-blur">
                        <CheckCircle2 className="text-emerald-600" />
                        <AlertTitle className="text-base font-bold">{successMessage}</AlertTitle>
                    </Alert>
                </div>
            ) : null}

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Card className="w-full">
                    <CardContent className="space-y-6 p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="mt-0.5 h-10 w-10"
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <p className="text-2xl font-semibold text-[#23d6c8]">
                                            {formatValue(inquiry.inquiry_id)}
                                        </p>
                                        <p className="truncate text-2xl font-bold">{formatValue(inquiry.full_name)}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button type="button" variant="outline" size="sm">
                                                    Move
                                                    <ChevronDown className="ml-1 h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-44">
                                                <DropdownMenuItem
                                                    disabled={isSameStatus(inquiry.status, 'New')}
                                                    onClick={() => openMoveConfirm('New')}
                                                >
                                                    New
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    disabled={isSameStatus(inquiry.status, 'Contacted')}
                                                    onClick={() => openMoveConfirm('Contacted')}
                                                >
                                                    Contacted
                                                </DropdownMenuItem>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>In Progress</DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent className="w-44">
                                                        <DropdownMenuItem
                                                            disabled={isSameStatus(
                                                                inquiry.status,
                                                                'In Progress-Active',
                                                            )}
                                                            onClick={() =>
                                                                openMoveConfirm('In Progress-Active')
                                                            }
                                                        >
                                                            Active
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            disabled={isSameStatus(
                                                                inquiry.status,
                                                                'In Progress-On Hold',
                                                            )}
                                                            onClick={() =>
                                                                openMoveConfirm('In Progress-On Hold')
                                                            }
                                                        >
                                                            On Hold
                                                        </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>Completed</DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent className="w-44">
                                                        <DropdownMenuItem
                                                            disabled={isSameStatus(
                                                                inquiry.status,
                                                                'Completed-Successful',
                                                            )}
                                                            onClick={() => openMoveConfirm('Completed-Successful')}
                                                        >
                                                            Successful
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            disabled={isSameStatus(
                                                                inquiry.status,
                                                                'Completed-Unsuccessful',
                                                            )}
                                                            onClick={() => openMoveConfirm('Completed-Unsuccessful')}
                                                        >
                                                            Unsuccessful
                                                        </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                                <DropdownMenuItem
                                                    disabled={isSameStatus(inquiry.status, 'Cancelled')}
                                                    onClick={() => openMoveConfirm('Cancelled')}
                                                >
                                                    Cancelled
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusChipClass(
                                                inquiry.status,
                                            )}`}
                                        >
                                            {formatValue(inquiry.status)}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2 md:hidden">
                                            <Button asChild type="button" variant="outline" size="sm">
                                                <Link href={`/leads/inquiries/${inquiry.id}/edit`}>
                                                    <Pencil className="mr-1 h-4 w-4" />
                                                    edit
                                                </Link>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="hover:bg-red-700 dark:hover:bg-red-500"
                                                onClick={() => setDeleteOpen(true)}
                                            >
                                                <Trash2 className="mr-1 h-4 w-4" />
                                                delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="hidden items-center gap-2 md:flex">
                                <Button asChild type="button" variant="outline" size="sm">
                                    <Link href={`/leads/inquiries/${inquiry.id}/edit`}>
                                        <Pencil className="mr-1 h-4 w-4" />
                                        edit
                                    </Link>
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="hover:bg-red-700 dark:hover:bg-red-500"
                                    onClick={() => setDeleteOpen(true)}
                                >
                                    <Trash2 className="mr-1 h-4 w-4" />
                                    delete
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2 text-lg leading-tight">
                            <p className="flex items-center gap-2">
                                <BadgeInfo className="h-4 w-4 text-muted-foreground" />
                                <span>Type :</span>
                                <span className="text-muted-foreground">{formatValue(inquiry.type)}</span>
                            </p>
                            <p className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span>Company :</span>
                                <span className="text-muted-foreground">{formatValue(inquiry.company)}</span>
                            </p>
                            <p className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>Email :</span>
                                <a
                                    className="text-muted-foreground hover:underline"
                                    href={`mailto:${inquiry.email}`}
                                >
                                    {formatValue(inquiry.email)}
                                </a>
                            </p>
                            <p className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>Phone :</span>
                                <span className="text-muted-foreground">{formatValue(inquiry.phone)}</span>
                            </p>
                            <p className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>Address:</span>
                                <span className="text-muted-foreground">{formatValue(inquiry.address)}</span>
                            </p>
                        </div>

                        <hr className="border-border" />

                        <div className="space-y-2 text-lg leading-tight">
                            <p className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <span>Source :</span>
                                <span className="text-muted-foreground">
                                    {isInquirer ? 'website' : formatValue(inquiry.discovery_platform)}
                                </span>
                            </p>
                            {isInquirer ? (
                                <p className="flex items-center gap-2">
                                    <Search className="h-4 w-4 text-muted-foreground" />
                                    <span>Discovery :</span>
                                    <span className="text-muted-foreground">
                                        {formatValue(inquiry.discovery_platform)}
                                    </span>
                                </p>
                            ) : null}
                            <p className="flex items-center gap-2">
                                <CircleHelp className="h-4 w-4 text-muted-foreground" />
                                <span>Concern :</span>
                                <span className="text-muted-foreground">{formatValue(inquiry.concern_type)}</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold">Status Updates</h2>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            <button
                                type="button"
                                className={historyView === 'board' ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}
                                onClick={() => setHistoryView('board')}
                            >
                                Progress Board
                            </button>
                            <span className="text-muted-foreground">/</span>
                            <button
                                type="button"
                                className={historyView === 'timeline' ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground'}
                                onClick={() => setHistoryView('timeline')}
                            >
                                Timeline
                            </button>
                        </div>
                    </div>

                    {historyGroups.length === 0 ? (
                        <Card className="w-full">
                            <CardContent className="p-6 text-sm text-muted-foreground">
                                No status updates yet.
                            </CardContent>
                        </Card>
                    ) : (
                        historyView === 'board' ? (
                            <div className="grid gap-4 xl:grid-cols-5">
                                {historyColumns.map((column) => (
                                    <div
                                        key={column.key}
                                        className="rounded-xl border border-border/70 bg-muted/25 px-1.5 py-2"
                                    >
                                        <div className="mb-3 flex items-center gap-2 px-1">
                                            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                {column.label}
                                            </h3>
                                            <span className="text-sm font-semibold text-muted-foreground">
                                                {column.items.length}
                                            </span>
                                        </div>

                                        <div className="space-y-2.5">
                                            {column.items.length === 0 ? (
                                                <div className="rounded-lg border border-dashed border-border/70 px-2.5 py-5 text-sm text-muted-foreground">
                                                    No updates
                                                </div>
                                            ) : (
                                                column.items.map((item, index) => {
                                                    const cardKey = `${column.key}-${item.changed_at}-${index}`;
                                                    const message =
                                                        item.notes.trim() !== ''
                                                            ? item.notes.trim()
                                                            : 'No message provided.';
                                                    const expanded =
                                                        expandedHistoryCards.includes(cardKey);
                                                    const canExpand =
                                                        expanded ||
                                                        overflowingHistoryCards.includes(cardKey);

                                                    return (
                                                        <Card
                                                            key={cardKey}
                                                            className={`rounded-lg border-border/70 bg-card py-0 shadow-none ${statusCardAccentClass(
                                                                item.status,
                                                            )}`}
                                                        >
                                                            <CardContent className="space-y-3 px-2.5 py-4">
                                                            <div className="space-y-3">
                                                                <div className="space-y-1">
                                                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                                                        {item.date_label}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {new Date(
                                                                            item.changed_at,
                                                                        ).toLocaleTimeString('en-US', {
                                                                            hour: 'numeric',
                                                                            minute: '2-digit',
                                                                            hour12: true,
                                                                        })}
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    {expanded ? (
                                                                        <p className="text-sm leading-6 text-foreground break-words">
                                                                            {message}
                                                                        </p>
                                                                    ) : (
                                                                        <div className="flex items-baseline gap-1 overflow-hidden whitespace-nowrap text-sm leading-6 text-foreground">
                                                                            <span
                                                                                data-history-preview-key={cardKey}
                                                                                className="min-w-0 flex-1 overflow-hidden text-ellipsis"
                                                                            >
                                                                                {message}
                                                                            </span>
                                                                            {canExpand ? (
                                                                                <button
                                                                                    type="button"
                                                                                    className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground"
                                                                                    onClick={() =>
                                                                                        toggleHistoryCard(
                                                                                            cardKey,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    Show more...
                                                                                </button>
                                                                            ) : null}
                                                                        </div>
                                                                    )}
                                                                    {expanded && canExpand ? (
                                                                        <button
                                                                            type="button"
                                                                            className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                                                            onClick={() =>
                                                                                toggleHistoryCard(
                                                                                    cardKey,
                                                                                )
                                                                            }
                                                                        >
                                                                            Show less
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between gap-3 pt-1">
                                                                <span
                                                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${roleChipClass(
                                                                        item.moved_by_role,
                                                                    )}`}
                                                                >
                                                                    <BadgeCheck className="h-3.5 w-3.5" />
                                                                    {item.moved_by_role}
                                                                </span>

                                                                {item.moved_by_avatar ? (
                                                                    <img
                                                                        src={item.moved_by_avatar}
                                                                        alt={item.moved_by_role}
                                                                        className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-1 ring-border">
                                                                        {initialsFromName(item.moved_by_role)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Card className="w-full py-0">
                                <CardContent className="px-4 py-5">
                                    <div className="relative min-h-[320px] overflow-hidden">
                                        <div className="relative space-y-4">
                                            {timelineEntries.map((entry, index) => (
                                                <div
                                                    key={`${entry.changed_at}-${index}`}
                                                    className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4"
                                                    title={`Status: ${entry.status}\nFrom: ${entry.fromLabel}\nTo: ${entry.toLabel}`}
                                                >
                                                    <div className="text-xs font-medium text-muted-foreground">
                                                        {(() => {
                                                            const date = new Date(entry.changed_at);
                                                            const month = date.toLocaleDateString('en-US', {
                                                                month: 'short',
                                                            });
                                                            const day = date.toLocaleDateString('en-US', {
                                                                day: '2-digit',
                                                            });
                                                            const year = date.toLocaleDateString('en-US', {
                                                                year: '2-digit',
                                                            });

                                                            return `${month} ${day}/${year}`;
                                                        })()}
                                                    </div>
                                                    <div className="relative h-9 rounded-md bg-muted/20">
                                                        <div
                                                            className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md shadow-sm"
                                                        style={{
                                                            left: `${entry.leftPercent}%`,
                                                            width: `${Math.max(
                                                                Math.min(
                                                                    entry.widthPercent,
                                                                        100 - entry.leftPercent,
                                                                    ),
                                                                    entry.isLatest ? 2.4 : 1.2,
                                                                )}%`,
                                                            backgroundColor: entry.barColor,
                                                        }}
                                                            title={`Status: ${entry.status}\nFrom: ${entry.fromLabel}\nTo: ${entry.toLabel}`}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    )}
                </div>
            </div>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete inquiry?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete{' '}
                            <span className="font-semibold text-foreground">
                                {formatValue(inquiry.inquiry_id)} - {formatValue(inquiry.full_name)}
                            </span>{' '}
                            and its status history.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteOpen(false)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={deleting}
                            onClick={() => {
                                router.delete(`/leads/inquiries/${inquiry.id}`, {
                                    preserveScroll: true,
                                    onStart: () => setDeleting(true),
                                    onFinish: () => setDeleting(false),
                                });
                            }}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                {formatValue(inquiry.full_name)}
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold text-foreground">
                                {moveState?.nextStatus || '-'}
                            </span>
                            ?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setMoveState(null)}>
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
                                {formatValue(inquiry.full_name)}
                            </span>{' '}
                            to{' '}
                            <span className="font-semibold text-foreground">
                                {moveState?.nextStatus || '-'}
                            </span>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="show-move-message">Message</Label>
                        <textarea
                            id="show-move-message"
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
                        <Button type="button" onClick={submitMove} disabled={moving}>
                            Move
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
