import { Head, Link, router } from '@inertiajs/react';
import { formatDateRange } from 'little-date';
import {
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Share,
    MoreHorizontal,
    RotateCw,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import type { BreadcrumbItem } from '@/types';


type DashboardRow = {
    id: string;
    inquiry_id: string;
    full_name: string;
    type: string;
    status: string;
    source: string;
    concern: string;
    updated_at: string | null;
};

type TrendSeries = {
    labels: string[];
    leads: number[];
    inquirer: number[];
};

type StatusTimelinePoint = {
    date: string;
    new: number;
    contacted: number;
    in_progress: number;
    completed: number;
    cancelled: number;
};

type MoveState = {
    row: DashboardRow;
    nextStatus: string;
    step: 'confirm' | 'notes';
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

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

const statusTextClass = (status: string): string => {
    const normalized = status.trim().toLowerCase();

    if (normalized === 'new') {
        return 'text-emerald-400';
    }
    if (normalized === 'completed-successful') {
        return 'text-teal-400';
    }
    if (normalized === 'completed-unsuccessful') {
        return 'text-rose-400';
    }
    if (normalized === 'cancelled') {
        return 'text-slate-400';
    }
    if (normalized === 'contacted') {
        return 'text-blue-400';
    }
    if (normalized === 'in progress-active' || normalized === 'in progress') {
        return 'text-amber-400';
    }
    if (normalized === 'in progress-on hold') {
        return 'text-orange-400';
    }

    return 'text-muted-foreground';
};

const formatDate = (value: string | null): string => {
    if (!value) {
        return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
};

const displaySource = (type: string, source: string): string => {
    if (type.trim().toLowerCase() === 'inquirer') {
        return 'Website';
    }

    return source || '-';
};

const GREEN_PALETTE = ['#49e5d4', '#31baa6', '#1f8f79', '#0e5f52', '#083a33'] as const;

const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;

    return {
        x: cx + radius * Math.cos(radians),
        y: cy + radius * Math.sin(radians),
    };
};

const describeDonutSlice = (
    cx: number,
    cy: number,
    outerRadius: number,
    innerRadius: number,
    startAngle: number,
    endAngle: number,
) => {
    const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
    const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
    const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
        `M ${outerStart.x} ${outerStart.y}`,
        `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
        `L ${innerEnd.x} ${innerEnd.y}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
        'Z',
    ].join(' ');
};

const polarToGaugePoint = (cx: number, cy: number, radius: number, angle: number) => {
    const radians = (angle * Math.PI) / 180;

    return {
        x: cx + radius * Math.cos(radians),
        y: cy - radius * Math.sin(radians),
    };
};

const describeGaugeArc = (
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number,
) => {
    const start = polarToGaugePoint(cx, cy, radius, startAngle);
    const end = polarToGaugePoint(cx, cy, radius, endAngle);
    const largeArcFlag = Math.abs(startAngle - endAngle) > 180 ? '1' : '0';

    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const buildRadarPoints = (
    values: number[],
    maxValue: number,
    radius: number,
    cx: number,
    cy: number,
) =>
    values
        .map((value, index, allValues) => {
            const ratio = maxValue === 0 ? 0 : value / maxValue;
            const pointRadius = radius * (0.24 + ratio * 0.76);
            const point = polarToCartesian(
                cx,
                cy,
                pointRadius,
                (360 / allValues.length) * index,
            );

            return `${point.x},${point.y}`;
        })
        .join(' ');

const buildRadarPointList = (
    values: number[],
    maxValue: number,
    radius: number,
    cx: number,
    cy: number,
) =>
    values.map((value, index, allValues) => {
        const ratio = maxValue === 0 ? 0 : value / maxValue;
        const pointRadius = radius * (0.24 + ratio * 0.76);

        return polarToCartesian(
            cx,
            cy,
            pointRadius,
            (360 / allValues.length) * index,
        );
    });

const buildSmoothLinePath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) {
        return '';
    }

    if (points.length === 1) {
        return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let index = 0; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const controlX = (current.x + next.x) / 2;

        path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    return path;
};

export default function Dashboard({
    cards,
    dateRange,
    statusRows,
    newTrend,
    statusTimeline,
}: {
    cards: {
        total: number;
        new: number;
        contacted: number;
        in_progress: number;
        completed: number;
        cancelled: number;
    };
    dateRange: {
        from: string;
        to: string;
    };
    statusRows: DashboardRow[];
    newTrend: TrendSeries;
    statusTimeline: StatusTimelinePoint[];
}) {
    const isSameStatus = (current: string, next: string) =>
        current.trim().toLowerCase() === next.trim().toLowerCase();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [deletingSelected, setDeletingSelected] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [type, setType] = useState('All');
    const [source, setSource] = useState('All');
    const [concern, setConcern] = useState('All');
    const [rowsPerPage, setRowsPerPage] = useState('5');
    const [currentPage, setCurrentPage] = useState(1);
    const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
    const [hoveredPieIndex, setHoveredPieIndex] = useState<number | null>(null);
    const [timelineRange, setTimelineRange] = useState('90d');
    const [hoveredTimelineIndex, setHoveredTimelineIndex] = useState<number | null>(null);
    const [moveState, setMoveState] = useState<MoveState | null>(null);
    const [moveNotes, setMoveNotes] = useState('');
    const [moving, setMoving] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
    const [exportTitle, setExportTitle] = useState('');
    const [exportDescription, setExportDescription] = useState('');
    const [exportSections, setExportSections] = useState({
        kpi: true,
        completed: true,
        newEntries: true,
        areaStatus: true,
        table: true,
    });
    const [range, setRange] = useState<DateRange | undefined>(() => {
        const parseYmd = (value: string): Date => {
            const [year, month, day] = value.split('-').map((part) => Number(part));
            return new Date(year, (month ?? 1) - 1, day ?? 1);
        };

        if (dateRange?.from && dateRange?.to) {
            return { from: parseYmd(dateRange.from), to: parseYmd(dateRange.to) };
        }

        return undefined;
    });
    const [chartTheme, setChartTheme] = useState({
        background: '#ffffff',
        foreground: '#111827',
        mutedForeground: '#6b7280',
        popover: '#ffffff',
        border: '#d1d5db',
    });

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();

        return statusRows.filter((row) => {
            if (statusFilter !== 'All') {
                const selected = statusFilter.trim().toLowerCase();
                const current = row.status.trim().toLowerCase();

                if (selected === 'in progress') {
                    if (
                        ![
                            'in progress',
                            'in progress-active',
                            'in progress-on hold',
                        ].includes(current)
                    ) {
                        return false;
                    }
                } else if (selected === 'completed') {
                    if (
                        !['completed-successful', 'completed-unsuccessful'].includes(current)
                    ) {
                        return false;
                    }
                } else if (current !== selected) {
                    return false;
                }
            }

            if (type !== 'All' && row.type.trim().toLowerCase() !== type.trim().toLowerCase()) {
                return false;
            }

            if (
                source !== 'All' &&
                displaySource(row.type, row.source).trim().toLowerCase() !==
                    source.trim().toLowerCase()
            ) {
                return false;
            }

            if (
                concern !== 'All' &&
                row.concern.trim().toLowerCase() !== concern.trim().toLowerCase()
            ) {
                return false;
            }

            if (!q) {
                return true;
            }

            const haystack = [
                row.inquiry_id,
                row.full_name,
                row.type,
                row.status,
                row.source,
                row.concern,
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [statusRows, search, statusFilter, type, source, concern]);

    const totalPages = useMemo(() => {
        if (rowsPerPage === '100') {
            return 1;
        }

        const size = Number(rowsPerPage);
        return Math.max(1, Math.ceil(filteredRows.length / size));
    }, [filteredRows.length, rowsPerPage]);

    const safePage = Math.min(currentPage, totalPages);

    const visibleRows = useMemo(() => {
        if (rowsPerPage === '100') {
            return filteredRows;
        }

        const size = Number(rowsPerPage);
        const start = (safePage - 1) * size;
        const end = safePage * size;
        return filteredRows.slice(start, end);
    }, [filteredRows, rowsPerPage, safePage]);

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
    const visibleRowIds = useMemo(() => visibleRows.map((row) => row.id), [visibleRows]);
    const selectedVisibleIds = useMemo(
        () => selectedIds.filter((id) => visibleRowIds.includes(id)),
        [selectedIds, visibleRowIds],
    );
    const allSelected =
        visibleRows.length > 0 && selectedVisibleIds.length === visibleRows.length;
    const hasPartialSelection =
        selectedVisibleIds.length > 0 && selectedVisibleIds.length < visibleRows.length;

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
        const readThemeColors = () => {
            const styles = window.getComputedStyle(document.documentElement);

            setChartTheme({
                background: styles.getPropertyValue('--background').trim(),
                foreground: styles.getPropertyValue('--foreground').trim(),
                mutedForeground: styles.getPropertyValue('--muted-foreground').trim(),
                popover: styles.getPropertyValue('--popover').trim(),
                border: styles.getPropertyValue('--border').trim(),
            });
        };

        readThemeColors();

        const observer = new MutationObserver(() => {
            readThemeColors();
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style'],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!dateRange?.from || !dateRange?.to) {
            return;
        }

        const parseYmd = (value: string): Date => {
            const [year, month, day] = value.split('-').map((part) => Number(part));
            return new Date(year, (month ?? 1) - 1, day ?? 1);
        };

        const nextFrom = parseYmd(dateRange.from);
        const nextTo = parseYmd(dateRange.to);
        const currentFrom = range?.from;
        const currentTo = range?.to;

        if (
            currentFrom &&
            currentTo &&
            currentFrom.toDateString() === nextFrom.toDateString() &&
            currentTo.toDateString() === nextTo.toDateString()
        ) {
            return;
        }

        setRange({ from: nextFrom, to: nextTo });
        // Intentionally depend only on server-provided range so we don't overwrite the user's in-progress selection.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange.from, dateRange.to]);

    useEffect(() => {
        if (!range?.from || !range?.to) {
            return;
        }

        const formatYmd = (value: Date): string => {
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const fromYmd = formatYmd(range.from);
        const toYmd = formatYmd(range.to);

        if (fromYmd === dateRange.from && toYmd === dateRange.to) {
            return;
        }

        router.get(
            dashboard().url,
            { from: fromYmd, to: toYmd },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                // Keep radar + status updates area independent from the date filter.
                only: ['cards', 'dateRange', 'statusRows'],
            },
        );
    }, [range?.from, range?.to, dateRange.from, dateRange.to]);

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

        setSelectedIds((prev) => prev.filter((id) => !visibleRowIds.includes(id)));
    };

    const deleteSelectedRows = () => {
        if (selectedVisibleIds.length === 0) {
            return;
        }

        const deletingCount = selectedVisibleIds.length;
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
                        ? 'Successfully Deleted 1 Inquirer'
                        : `Successfully Deleted ${deletingCount} Inquirer`,
                );
                setSelectedIds([]);
            },
            onFinish: () => setDeletingSelected(false),
        });
    };

    const openMoveConfirm = (row: DashboardRow, nextStatus: string) => {
        setMoveNotes('');
        setMoveState({
            row,
            nextStatus,
            step: 'confirm',
        });
    };

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
                    router.reload({
                        only: ['cards', 'dateRange', 'statusRows', 'newTrend', 'statusTimeline'],
                    });
                },
            },
        );
    };

    const statusCards = [
        { title: 'New Inquiry', value: cards.new, status: 'New' },
        { title: 'Contacted', value: cards.contacted, status: 'Contacted' },
        { title: 'In Progress', value: cards.in_progress, status: 'In Progress' },
        { title: 'Cancelled', value: cards.cancelled, status: 'Cancelled' },
        { title: 'Completed', value: cards.completed, status: 'Completed-Successful' },
    ] as const;
    const totalForPercent = Math.max(1, cards.total);
    const completedSuccessful = statusRows.filter(
        (row) => row.status.trim().toLowerCase() === 'completed-successful',
    ).length;
    const completedUnsuccessful = statusRows.filter(
        (row) => row.status.trim().toLowerCase() === 'completed-unsuccessful',
    ).length;
    const completedTotal = Math.max(1, completedSuccessful + completedUnsuccessful);
    const successPercent = ((completedSuccessful / completedTotal) * 100).toFixed(1);
    const inquiryOutcomeSegments = [
        { label: 'Success', value: completedSuccessful, color: GREEN_PALETTE[0] },
        { label: 'Unsuccessful', value: completedUnsuccessful, color: '#15201d' },
    ].filter((item) => item.value > 0);
    const statusDistribution = [
        { label: 'New', value: cards.new, color: '#34d399' },
        { label: 'Contacted', value: cards.contacted, color: '#2bb58e' },
        { label: 'In Progress', value: cards.in_progress, color: '#1f8f79' },
        { label: 'Completed', value: cards.completed, color: '#146b5d' },
        { label: 'Cancelled', value: cards.cancelled, color: '#0b3d34' },
    ];
    const pieSegments = statusDistribution.filter((item) => item.value > 0);
    const trendMax = Math.max(1, ...newTrend.leads, ...newTrend.inquirer);
    const radarAxisCount = newTrend.labels.length;
    const leadTrendPoints = useMemo(
        () => buildRadarPointList(newTrend.leads, trendMax, 70, 110, 110),
        [newTrend.leads, trendMax],
    );
    const inquirerTrendPoints = useMemo(
        () => buildRadarPointList(newTrend.inquirer, trendMax, 70, 110, 110),
        [newTrend.inquirer, trendMax],
    );
    const hoveredLeadPoint =
        hoveredTrendIndex === null ? null : leadTrendPoints[hoveredTrendIndex];
    const hoveredInquirerPoint =
        hoveredTrendIndex === null ? null : inquirerTrendPoints[hoveredTrendIndex];
    const tooltipX =
        hoveredLeadPoint && hoveredInquirerPoint
            ? Math.max(
                  12,
                  Math.min(
                      108,
                      Math.max(hoveredLeadPoint.x, hoveredInquirerPoint.x) - 34,
                  ),
              )
            : 0;
    const tooltipY =
        hoveredLeadPoint && hoveredInquirerPoint
            ? Math.max(
                  12,
                  Math.min(
                      120,
                      Math.min(hoveredLeadPoint.y, hoveredInquirerPoint.y) - 50,
                  ),
              )
            : 0;
    const pieTooltipPosition = (() => {
        if (hoveredPieIndex === null || pieSegments.length === 0) {
            return null;
        }

        let currentAngle = 0;

        for (let index = 0; index < pieSegments.length; index += 1) {
            const segment = pieSegments[index];
            const segmentAngle = (segment.value / totalForPercent) * 360;

            if (index === hoveredPieIndex) {
                const midAngle = currentAngle + segmentAngle / 2;
                const anchor = polarToCartesian(110, 110, 60, midAngle);

                return {
                    x: Math.max(18, Math.min(110, anchor.x - 44)),
                    y: Math.max(26, Math.min(154, anchor.y - 16)),
                };
            }

            currentAngle += segmentAngle;
        }

        return null;
    })();
    const filteredTimeline = useMemo(() => {
        const days =
            timelineRange === '7d'
                ? 7
                : timelineRange === '30d'
                  ? 30
                  : 90;

        return statusTimeline.slice(-days);
    }, [statusTimeline, timelineRange]);
    const timelineSeries = [
        { key: 'new', label: 'New', color: '#34d399' },
        { key: 'contacted', label: 'Contacted', color: '#60a5fa' },
        { key: 'in_progress', label: 'In Progress', color: '#fbbf24' },
        { key: 'completed', label: 'Completed', color: '#f43f5e' },
        { key: 'cancelled', label: 'Cancelled', color: '#94a3b8' },
    ] as const;
    const timelineMax = Math.max(
        1,
        ...filteredTimeline.flatMap((point) => [
            point.new,
            point.contacted,
            point.in_progress,
            point.completed,
            point.cancelled,
        ]),
    );
    const timelineChartWidth = 980;
    const timelineChartHeight = 250;
    const timelinePaddingLeft = 20;
    const timelinePaddingRight = 20;
    const timelinePaddingTop = 18;
    const timelinePaddingBottom = 36;
    const timelinePlotWidth = timelineChartWidth - timelinePaddingLeft - timelinePaddingRight;
    const timelinePlotHeight = timelineChartHeight - timelinePaddingTop - timelinePaddingBottom;
    const timelineX = (index: number) => {
        if (filteredTimeline.length <= 1) {
            return timelinePaddingLeft;
        }

        return timelinePaddingLeft + (index / (filteredTimeline.length - 1)) * timelinePlotWidth;
    };
    const timelineY = (value: number) =>
        timelinePaddingTop + timelinePlotHeight - (value / timelineMax) * timelinePlotHeight;
    const buildTimelinePath = (key: keyof StatusTimelinePoint) =>
        buildSmoothLinePath(
            filteredTimeline.map((point, index) => ({
                x: timelineX(index),
                y: timelineY(Number(point[key])),
            })),
        );
    const hoveredTimelinePoint =
        hoveredTimelineIndex === null ? null : filteredTimeline[hoveredTimelineIndex];
    const timelineTooltipX =
        hoveredTimelineIndex === null
            ? 0
            : Math.max(24, Math.min(760, timelineX(hoveredTimelineIndex) - 74));
    const timelineTooltipDate = (value: string) =>
        new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });

    const startDashboardExport = () => {
        // Use a form submit to keep the download tied to a user gesture (avoids browsers blocking download).
        const ensureFrame = () => {
            const existing = document.getElementById(
                'dashboard-export-frame',
            ) as HTMLIFrameElement | null;

            if (existing) {
                return existing;
            }

            const iframe = document.createElement('iframe');
            iframe.id = 'dashboard-export-frame';
            iframe.name = 'dashboard-export-frame';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            return iframe;
        };

        const addHidden = (form: HTMLFormElement, name: string, value: string) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
        };

        setExporting(true);
        setExportOpen(false);

        const frame = ensureFrame();
        frame.onload = () => {
            window.setTimeout(() => setExporting(false), 250);
        };

        const form = document.createElement('form');
        form.method = 'GET';
        form.action = '/dashboard/export';
        form.target = frame.name;

        addHidden(form, 'from', dateRange.from);
        addHidden(form, 'to', dateRange.to);
        addHidden(form, 'format', exportFormat);
        addHidden(form, 'title', exportTitle.trim());
        addHidden(form, 'description', exportDescription.trim());

        addHidden(form, 'include_kpi', exportSections.kpi ? '1' : '0');
        addHidden(form, 'include_completed', exportSections.completed ? '1' : '0');
        addHidden(form, 'include_new_entries', exportSections.newEntries ? '1' : '0');
        addHidden(form, 'include_area_status', exportSections.areaStatus ? '1' : '0');
        addHidden(form, 'include_table', exportSections.table ? '1' : '0');

        // These match the table filters only.
        addHidden(form, 'search', search);
        addHidden(form, 'type', type);
        addHidden(form, 'source', source);
        addHidden(form, 'concern', concern);
        addHidden(form, 'timeline_range', timelineRange);
        addHidden(form, 'status', statusFilter);

        document.body.appendChild(form);
        form.submit();
        form.remove();

        // Fallback: if the iframe never fires load (some downloads), stop the spinner after a bit.
        window.setTimeout(() => setExporting(false), 1500);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex items-center justify-end gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                id="dashboard-dates"
                                className="h-10 w-20px max-w-xs justify-between rounded-xl border-border/70 bg-background/80 px-4 font-medium shadow-sm hover:bg-muted/20"
                            >
                                {range?.from && range?.to
                                    ? formatDateRange(range.from, range.to, {
                                          includeTime: false,
                                      })
                                    : 'Pick a date'}
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto overflow-hidden rounded-2xl border-border/70 bg-background p-0 shadow-xl"
                            align="end"
                        >
                            <Calendar
                                mode="range"
                                selected={range}
                                onSelect={(nextRange) => setRange(nextRange)}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl border-border/70 bg-background/80 shadow-sm hover:bg-muted/20"
                        onClick={() => {
                            setExportTitle(`Dashboard Export (${dateRange.from} - ${dateRange.to})`);
                            setExportDescription('');
                            setExportFormat('csv');
                            setExportSections({
                                kpi: true,
                                completed: true,
                                newEntries: true,
                                areaStatus: true,
                                table: true,
                            });
                            setExportOpen(true);
                        }}
                        title="Export"
                    >
                        <Share className="h-4 w-4" />
                    </Button>
                </div>
                <div className="grid auto-rows-min gap-3 md:grid-cols-5">
                    {statusCards.map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border border-sidebar-border/70 bg-gradient-to-br from-background to-muted/20 p-4 dark:border-sidebar-border"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                    {card.title}
                                </p>
                                <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusChipClass(
                                        card.status,
                                    )}`}
                                >
                                    {card.value}
                                </span>
                            </div>
                            <p className="mt-3 text-2xl font-bold">{card.value}</p>
                            <p className={`mt-1 text-xs font-semibold ${statusTextClass(card.status)}`}>
                                {((card.value / totalForPercent) * 100).toFixed(1)}%
                            </p>
                        </div>
                    ))}
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-xl border border-sidebar-border/70 bg-gradient-to-br from-background to-muted/20 p-5 dark:border-sidebar-border">
                        <div className="space-y-1">
                            <p className="text-xl font-semibold">Completed Status</p>
                            <p className="text-sm text-muted-foreground">
                                Success inquiry outcome
                            </p>
                        </div>
                        <div className="relative mt-4 flex justify-center">
                            <svg viewBox="0 0 280 220" className="h-64 w-full max-w-[300px]">
                                <path
                                    d={describeGaugeArc(140, 160, 86, 180, 0)}
                                    fill="none"
                                    stroke="#0f1715"
                                    strokeWidth="24"
                                    strokeLinecap="round"
                                />
                                {(() => {
                                    let currentAngle = 180;

                                    return inquiryOutcomeSegments.map((segment) => {
                                        const segmentAngle = (segment.value / completedTotal) * 180;
                                        const path = describeGaugeArc(
                                            140,
                                            160,
                                            86,
                                            currentAngle,
                                            currentAngle - segmentAngle,
                                        );
                                        currentAngle -= segmentAngle;

                                        return (
                                            <path
                                                key={segment.label}
                                                d={path}
                                                fill="none"
                                                stroke={segment.color}
                                                strokeWidth="24"
                                                strokeLinecap="round"
                                            />
                                        );
                                    });
                                })()}
                                <text
                                    x="140"
                                    y="136"
                                    textAnchor="middle"
                                    className="fill-foreground text-[28px] font-bold"
                                >
                                    {successPercent}%
                                </text>
                                <text
                                    x="140"
                                    y="160"
                                    textAnchor="middle"
                                    className="fill-muted-foreground text-sm"
                                >
                                    Success
                                </text>
                            </svg>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm">
                            {[
                                { label: 'Success', value: completedSuccessful, color: GREEN_PALETTE[0] },
                                {
                                    label: 'Unsuccessful',
                                    value: completedUnsuccessful,
                                    color: '#15201d',
                                },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-2 text-muted-foreground">
                                    <span
                                        className="h-3 w-3 rounded-[4px]"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-sidebar-border/70 bg-gradient-to-br from-background to-muted/20 p-5 dark:border-sidebar-border">
                        <div className="space-y-1">
                            <p className="text-xl font-semibold">Leads / Inquiry</p>
                            <p className="text-sm text-muted-foreground">
                                Distribution by status
                            </p>
                        </div>
                        <div className="mt-6 flex justify-center">
                            <svg viewBox="0 0 220 220" className="h-52 w-52">
                                {(() => {
                                    let currentAngle = 0;

                                    return pieSegments.map((segment, index) => {
                                        const segmentAngle =
                                            (segment.value / totalForPercent) * 360;
                                        const isActive = hoveredPieIndex === index;
                                        const path = describeDonutSlice(
                                            110,
                                            110,
                                            isActive ? 80 : 74,
                                            isActive ? 38 : 42,
                                            currentAngle,
                                            currentAngle + segmentAngle,
                                        );
                                        const hoverPath = describeDonutSlice(
                                            110,
                                            110,
                                            82,
                                            38,
                                            currentAngle,
                                            currentAngle + segmentAngle,
                                        );
                                        currentAngle += segmentAngle;

                                        return (
                                            <g key={segment.label}>
                                                <path d={path} fill={segment.color} />
                                                <path
                                                    d={hoverPath}
                                                    fill="transparent"
                                                    onMouseEnter={() => setHoveredPieIndex(index)}
                                                    onMouseLeave={() => setHoveredPieIndex(null)}
                                                />
                                            </g>
                                        );
                                    });
                                })()}
                                <circle cx="110" cy="110" r="42" fill={chartTheme.background} />
                                {hoveredPieIndex !== null && pieTooltipPosition ? (
                                    <g style={{ pointerEvents: 'none' }}>
                                        <rect
                                            x={pieTooltipPosition.x}
                                            y={pieTooltipPosition.y}
                                            width="102"
                                            height="30"
                                            rx="12"
                                            fill={chartTheme.popover}
                                            stroke={chartTheme.border}
                                            pointerEvents="none"
                                        />
                                        <rect
                                            x={pieTooltipPosition.x + 10}
                                            y={pieTooltipPosition.y + 9}
                                            width="12"
                                            height="12"
                                            rx="4"
                                            fill={pieSegments[hoveredPieIndex]?.color ?? '#34d399'}
                                            pointerEvents="none"
                                        />
                                        <text
                                            x={pieTooltipPosition.x + 30}
                                            y={pieTooltipPosition.y + 18}
                                            dominantBaseline="middle"
                                            fill={chartTheme.mutedForeground}
                                            className="text-[9px]"
                                            pointerEvents="none"
                                        >
                                            {pieSegments[hoveredPieIndex]?.label}
                                        </text>
                                        <text
                                            x={pieTooltipPosition.x + 90}
                                            y={pieTooltipPosition.y + 18}
                                            textAnchor="end"
                                            dominantBaseline="middle"
                                            fill={chartTheme.foreground}
                                            className="text-[9px] font-semibold"
                                            pointerEvents="none"
                                        >
                                            {pieSegments[hoveredPieIndex]?.value ?? 0}
                                        </text>
                                    </g>
                                ) : null}
                            </svg>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            {statusDistribution.map((item) => (
                                <div key={item.label} className="flex items-center gap-2">
                                    <span
                                        className="h-3 w-3 rounded-[4px]"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-sidebar-border/70 bg-gradient-to-br from-background to-muted/20 p-5 dark:border-sidebar-border">
                        <div className="space-y-1">
                            <p className="text-xl font-semibold">New Inquiry Trend</p>
                            <p className="text-sm text-muted-foreground">
                                New entries from status histories by month
                            </p>
                        </div>
                        <div className="mt-6 flex justify-center">
                            <svg viewBox="0 0 220 220" className="h-52 w-52">
                                {[1, 2, 3, 4].map((step) => {
                                    const points = Array.from(
                                        { length: radarAxisCount },
                                        (_, index) => {
                                            const point = polarToCartesian(
                                                110,
                                                110,
                                                (70 * step) / 4,
                                                (360 / radarAxisCount) * index,
                                            );

                                            return `${point.x},${point.y}`;
                                        },
                                    ).join(' ');

                                    return (
                                        <polygon
                                            key={step}
                                            points={points}
                                            fill="none"
                                            stroke="#1a2421"
                                            strokeWidth="1"
                                            strokeLinejoin="miter"
                                            strokeLinecap="square"
                                        />
                                    );
                                })}
                                {newTrend.labels.map((label, index) => {
                                    const axisPoint = polarToCartesian(
                                        110,
                                        110,
                                        70,
                                        (360 / radarAxisCount) * index,
                                    );
                                    const labelPoint = polarToCartesian(
                                        110,
                                        110,
                                        86,
                                        (360 / radarAxisCount) * index,
                                    );

                                    return (
                                        <g key={label}>
                                            <line
                                                x1="110"
                                                y1="110"
                                                x2={axisPoint.x}
                                                y2={axisPoint.y}
                                                stroke="#13201d"
                                                strokeWidth="1"
                                            />
                                            <text
                                                x={labelPoint.x}
                                                y={labelPoint.y}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                className="fill-muted-foreground text-[10px]"
                                            >
                                                {label}
                                            </text>
                                        </g>
                                    );
                                })}
                                <polygon
                                    points={buildRadarPoints(newTrend.inquirer, trendMax, 70, 110, 110)}
                                    fill="#1f8f79"
                                />
                                <polygon
                                    points={buildRadarPoints(newTrend.leads, trendMax, 70, 110, 110)}
                                    fill="rgba(126, 247, 220, 0.58)"
                                />
                                {hoveredLeadPoint && hoveredInquirerPoint ? (
                                    <g>
                                        <g>
                                            <rect
                                                x={tooltipX}
                                                y={tooltipY}
                                                width="100"
                                                height="56"
                                                rx="8"
                                                fill={chartTheme.popover}
                                                stroke={chartTheme.border}
                                            />
                                            <text
                                                x={tooltipX + 10}
                                                y={tooltipY + 16}
                                                fill={chartTheme.foreground}
                                                className="text-[10px] font-semibold"
                                            >
                                                {newTrend.labels[hoveredTrendIndex ?? 0]}
                                            </text>
                                            <rect
                                                x={tooltipX + 9}
                                                y={tooltipY + 26}
                                                width="6"
                                                height="6"
                                                rx="2"
                                                fill="#7ef7dc"
                                            />
                                            <text
                                                x={tooltipX + 20}
                                                y={tooltipY + 32}
                                                fill={chartTheme.mutedForeground}
                                                className="text-[9px]"
                                            >
                                                Leads
                                            </text>
                                            <text
                                                x={tooltipX + 86}
                                                y={tooltipY + 32}
                                                textAnchor="end"
                                                fill={chartTheme.foreground}
                                                className="text-[9px] font-semibold"
                                            >
                                                {newTrend.leads[hoveredTrendIndex ?? 0]}
                                            </text>
                                            <rect
                                                x={tooltipX + 9}
                                                y={tooltipY + 41}
                                                width="6"
                                                height="6"
                                                rx="2"
                                                fill="#4aa48f"
                                            />
                                            <text
                                                x={tooltipX + 20}
                                                y={tooltipY + 47}
                                                fill={chartTheme.mutedForeground}
                                                className="text-[9px]"
                                            >
                                                Inquirer
                                            </text>
                                            <text
                                                x={tooltipX + 86}
                                                y={tooltipY + 47}
                                                textAnchor="end"
                                                fill={chartTheme.foreground}
                                                className="text-[9px] font-semibold"
                                            >
                                                {newTrend.inquirer[hoveredTrendIndex ?? 0]}
                                            </text>
                                        </g>
                                    </g>
                                ) : null}
                                {newTrend.labels.map((label, index) => {
                                    const hoverAxisPoint = polarToCartesian(
                                        110,
                                        110,
                                        88,
                                        (360 / radarAxisCount) * index,
                                    );

                                    return (
                                        <line
                                            key={`${label}-hover`}
                                            x1="110"
                                            y1="110"
                                            x2={hoverAxisPoint.x}
                                            y2={hoverAxisPoint.y}
                                            stroke="transparent"
                                            strokeWidth="24"
                                            className="cursor-pointer"
                                            style={{ pointerEvents: 'stroke' }}
                                            onMouseEnter={() => setHoveredTrendIndex(index)}
                                            onMouseLeave={() => setHoveredTrendIndex(null)}
                                        />
                                    );
                                })}
                            </svg>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                            {[
                                { label: 'Leads', color: '#7ef7dc' },
                                { label: 'Inquirer', color: '#1f8f79' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-2">
                                    <span
                                        className="h-3 w-3 rounded-[4px]"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span>{item.label}</span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-6 text-center text-sm font-semibold text-[#49e5d4]">
                            Last {newTrend.labels.length} months of New status entries
                        </p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-gradient-to-br from-background to-muted/20 dark:border-sidebar-border">
                    <div className="flex items-center gap-2 border-b border-sidebar-border/70 px-5 py-5 sm:flex-row">
                        <div className="grid flex-1 gap-1">
                            <p className="text-xl font-semibold">Status Updates</p>
                            <p className="text-sm text-muted-foreground">
                                Showing status update totals for the selected range
                            </p>
                        </div>
                        <Select value={timelineRange} onValueChange={setTimelineRange}>
                            <SelectTrigger className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex">
                                <SelectValue placeholder="Last 3 months" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="90d" className="rounded-lg">
                                    Last 3 months
                                </SelectItem>
                                <SelectItem value="30d" className="rounded-lg">
                                    Last 30 days
                                </SelectItem>
                                <SelectItem value="7d" className="rounded-lg">
                                    Last 7 days
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="px-2 pt-4 sm:px-6 sm:pt-6">
                        <div className="w-full overflow-x-auto">
                            <svg
                                viewBox={`0 0 ${timelineChartWidth} ${timelineChartHeight}`}
                                className="h-[260px] min-w-[920px] w-full"
                            >
                                {[0, 1, 2, 3].map((step) => {
                                    const y =
                                        timelinePaddingTop + (timelinePlotHeight / 4) * step;

                                    return (
                                        <line
                                            key={step}
                                            x1={timelinePaddingLeft}
                                            y1={y}
                                            x2={timelineChartWidth - timelinePaddingRight}
                                            y2={y}
                                            stroke="#1a2421"
                                            strokeWidth="1"
                                        />
                                    );
                                })}
                                {timelineSeries.map((series) => (
                                    <path
                                        key={series.key}
                                        d={buildTimelinePath(series.key)}
                                        fill="none"
                                        stroke={series.color}
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                ))}
                                {hoveredTimelinePoint && hoveredTimelineIndex !== null ? (
                                    <g style={{ pointerEvents: 'none' }}>
                                        <rect
                                            x={timelineTooltipX}
                                            y="74"
                                            width="148"
                                            height="110"
                                            rx="12"
                                            fill={chartTheme.popover}
                                            stroke={chartTheme.border}
                                        />
                                        <text
                                            x={timelineTooltipX + 16}
                                            y="95"
                                            fill={chartTheme.foreground}
                                            className="text-[15px] font-semibold"
                                        >
                                            {timelineTooltipDate(hoveredTimelinePoint.date)}
                                        </text>
                                        {timelineSeries.map((series, index) => (
                                            <g key={series.key}>
                                                <rect
                                                    x={timelineTooltipX + 16}
                                                    y={106 + index * 16}
                                                    width="9"
                                                    height="9"
                                                    rx="3"
                                                    fill={series.color}
                                                />
                                                <text
                                                    x={timelineTooltipX + 34}
                                                    y={114 + index * 16}
                                                    fill={chartTheme.mutedForeground}
                                                    className="text-[11px]"
                                                >
                                                    {series.label}
                                                </text>
                                                <text
                                                    x={timelineTooltipX + 132}
                                                    y={114 + index * 16}
                                                    textAnchor="end"
                                                    fill={chartTheme.foreground}
                                                    className="text-[11px] font-semibold"
                                                >
                                                    {hoveredTimelinePoint[series.key]}
                                                </text>
                                            </g>
                                        ))}
                                    </g>
                                ) : null}
                                {filteredTimeline.map((point, index) => (
                                    <g key={point.date}>
                                        {filteredTimeline.length <= 12 || index % Math.ceil(filteredTimeline.length / 10) === 0 || index === filteredTimeline.length - 1 ? (
                                            <text
                                                x={timelineX(index)}
                                                y={timelineChartHeight - 10}
                                                textAnchor="middle"
                                                className="fill-muted-foreground text-[11px]"
                                            >
                                                {timelineTooltipDate(point.date)}
                                            </text>
                                        ) : null}
                                        <rect
                                            x={timelineX(index) - Math.max(6, timelinePlotWidth / Math.max(filteredTimeline.length * 3, 30))}
                                            y={timelinePaddingTop}
                                            width={Math.max(12, timelinePlotWidth / Math.max(filteredTimeline.length * 1.5, 20))}
                                            height={timelinePlotHeight}
                                            fill="transparent"
                                            onMouseEnter={() => setHoveredTimelineIndex(index)}
                                            onMouseLeave={() => setHoveredTimelineIndex(null)}
                                        />
                                    </g>
                                ))}
                            </svg>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-6 pb-5 pt-2 text-sm text-muted-foreground">
                            {timelineSeries.map((series) => (
                                <div key={series.key} className="flex items-center gap-2">
                                    <span
                                        className="h-3 w-3 rounded-[4px]"
                                        style={{ backgroundColor: series.color }}
                                    />
                                    <span>{series.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <p className="text-sm text-muted-foreground">
                            {filteredRows.length} total
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
                        <Input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Search inquiry..."
                            className="w-full md:w-80"
                        />
                        <Select
                            value={statusFilter}
                            onValueChange={(value) => {
                                setStatusFilter(value);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">Status</SelectItem>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Contacted">Contacted</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="In Progress-Active">In Progress-Active</SelectItem>
                                <SelectItem value="In Progress-On Hold">In Progress-On Hold</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Completed-Successful">Completed-Successful</SelectItem>
                                <SelectItem value="Completed-Unsuccessful">Completed-Unsuccessful</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={type}
                            onValueChange={(value) => {
                                setType(value);
                                setCurrentPage(1);
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
                                setCurrentPage(1);
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
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full md:w-36">
                                <SelectValue placeholder="Concern" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">Concern</SelectItem>
                                <SelectItem value="proposal">Project Proposal</SelectItem>
                                <SelectItem value="maintenance">MaintenanceSupport</SelectItem>
                                <SelectItem value="security">Security Consultation</SelectItem>
                                <SelectItem value="general">General Inquiry</SelectItem>
                                <SelectItem value="led wall">Led Wall</SelectItem>
                                <SelectItem value="template inquiry">Template Inquiry</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="w-full md:w-9"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('All');
                                setType('All');
                                setSource('All');
                                setConcern('All');
                                setRowsPerPage('5');
                                setSelectedIds([]);
                                setCurrentPage(1);
                            }}
                            title="Refresh filters"
                        >
                            <RotateCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left">
                            <thead className="bg-muted/30 text-sm">
                                <tr>
                                    <th className="w-10 px-4 py-3 font-semibold">
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
                                    </th>
                                    <th className="px-4 py-3 font-semibold">Inquiry ID</th>
                                    <th className="px-4 py-3 font-semibold">Full Name</th>
                                    <th className="px-4 py-3 font-semibold">Type</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">Source</th>
                                    <th className="px-4 py-3 font-semibold">Concern</th>
                                    <th className="px-4 py-3 font-semibold">Date</th>
                                    <th className="px-4 py-3 font-semibold">More</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-4 py-6 text-center text-sm text-muted-foreground"
                                        >
                                            No inquiries found.
                                        </td>
                                    </tr>
                                ) : (
                                    visibleRows.map((row) => (
                                        <tr
                                            key={row.id}
                                            className="border-t border-sidebar-border/50 text-sm"
                                        >
                                            <td className="px-4 py-3">
                                                <Checkbox
                                                    checked={selectedIds.includes(row.id)}
                                                    onCheckedChange={(checked) =>
                                                        toggleRowSelection(
                                                            row.id,
                                                            checked === true,
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="px-4 py-3 font-medium text-[#23d6c8]">
                                                {row.inquiry_id || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.full_name || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.type || 'Inquirer'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusChipClass(
                                                        row.status,
                                                    )}`}
                                                >
                                                    {row.status || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {displaySource(row.type, row.source)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {row.concern || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {formatDate(row.updated_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44">
                                                        <DropdownMenuSub>
                                                            <DropdownMenuSubTrigger>
                                                                Move
                                                            </DropdownMenuSubTrigger>
                                                            <DropdownMenuSubContent className="w-44">
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
                                                                    <DropdownMenuSubContent className="w-44">
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
                                                                    <DropdownMenuSubContent className="w-44">
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
                                                            </DropdownMenuSubContent>
                                                        </DropdownMenuSub>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/leads/inquiries/${row.id}`}>
                                                                View Details
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {filteredRows.length > 0 ? (
                    <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-center">
                        <div className="flex items-center justify-center gap-2 text-sm">
                            <span className="text-foreground">Rows per page</span>
                            <Select
                                value={rowsPerPage}
                                onValueChange={(value) => {
                                    setRowsPerPage(value);
                                    setCurrentPage(1);
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
                        <Button
                            type="button"
                            variant="ghost"
                            className="h-9 px-3"
                            onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
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
                                setCurrentPage(Math.min(totalPages, safePage + 1))
                            }
                            disabled={safePage === totalPages}
                        >
                            Next
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                ) : null}

                {selectedVisibleIds.length > 0 ? (
                    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 alert-slide-up-enter">
                        <Alert className="w-full max-w-xl border-amber-300/60 bg-background/95 shadow-lg backdrop-blur">
                            <Trash2 className="text-amber-600" />
                            <AlertTitle>
                                Delete {selectedVisibleIds.length} inquirer
                                {selectedVisibleIds.length === 1 ? '' : 's'}
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
                        <Label htmlFor="dashboard-move-message">Message</Label>
                        <textarea
                            id="dashboard-move-message"
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

            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogDescription className="text-base font-semibold text-foreground">
                            Export Dashboard
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="dashboard-export-title">Title</Label>
                            <Input
                                id="dashboard-export-title"
                                value={exportTitle}
                                onChange={(e) => setExportTitle(e.target.value)}
                                placeholder="Enter title"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dashboard-export-description">Description</Label>
                            <textarea
                                id="dashboard-export-description"
                                value={exportDescription}
                                onChange={(e) => setExportDescription(e.target.value)}
                                placeholder="Enter description"
                                rows={3}
                                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Format</Label>
                                <Select
                                    value={exportFormat}
                                    onValueChange={(value) =>
                                        setExportFormat(value === 'xlsx' ? 'xlsx' : 'csv')
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="csv">CSV</SelectItem>
                                        <SelectItem value="xlsx">XLSX</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Includes</Label>
                                <div className="space-y-2 rounded-lg border border-border/70 p-3">
                                    {[
                                        { key: 'kpi', label: 'KPI Card' },
                                        { key: 'completed', label: 'Completed Status Card' },
                                        { key: 'newEntries', label: 'New Entries Card' },
                                        { key: 'areaStatus', label: 'Area Status Card' },
                                        { key: 'table', label: 'Table' },
                                    ].map((item) => (
                                        <div
                                            key={item.key}
                                            className="flex items-center justify-between gap-3"
                                        >
                                            <span className="text-sm font-medium">
                                                {item.label}
                                            </span>
                                            <Checkbox
                                                checked={
                                                    exportSections[
                                                        item.key as keyof typeof exportSections
                                                    ]
                                                }
                                                onCheckedChange={(checked) =>
                                                    setExportSections((prev) => ({
                                                        ...prev,
                                                        [item.key]: checked === true,
                                                    }))
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setExportOpen(false)}
                            disabled={exporting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={startDashboardExport}
                            className="bg-[#23d6c8] text-black hover:bg-[#1fc4b7]"
                            disabled={exporting}
                        >
                            {exporting ? 'Exporting...' : 'Export'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
