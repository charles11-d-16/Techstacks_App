<?php

namespace App\Http\Controllers;

use App\Models\Inquiry;
use App\Models\LeadStatusHistory;
use App\Models\StatusHistory;
use DateTimeInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use MongoDB\BSON\Regex;
use MongoDB\BSON\UTCDateTime;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        [$from, $to] = $this->resolveDashboardDateRange($request);

        $inquiries = Inquiry::query()
            ->orderByDesc('status_date')
            ->orderByDesc('inquiry_date')
            ->get();

        $rows = $inquiries
            ->filter(function (Inquiry $inquiry) use ($from, $to): bool {
                $date = $this->toCarbon($inquiry->status_date ?? $inquiry->inquiry_date ?? null);

                if (! $date) {
                    return false;
                }

                return $date->greaterThanOrEqualTo($from) && $date->lessThanOrEqualTo($to);
            })
            ->map(fn (Inquiry $inquiry): array => [
                'id' => (string) $inquiry->getKey(),
                'inquiry_id' => (string) ($inquiry->inquiry_id ?? ''),
                'full_name' => (string) ($inquiry->full_name ?? ''),
                'type' => (string) ($inquiry->types ?? 'Inquirer'),
                'status' => (string) ($inquiry->status ?? ''),
                'source' => (string) ($inquiry->discovery_platform ?? ''),
                'concern' => (string) ($inquiry->concern_type ?? ''),
                'updated_at' => $this->formatDate($inquiry->status_date ?? $inquiry->inquiry_date ?? null),
            ])
            ->values();

        return Inertia::render('dashboard', [
            'dateRange' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'cards' => [
                'total' => $rows->count(),
                'new' => $rows->where('status', 'New')->count(),
                'contacted' => $rows->where('status', 'Contacted')->count(),
                'in_progress' => $rows
                    ->whereIn('status', ['In Progress', 'In Progress-Active', 'In Progress-On Hold'])
                    ->count(),
                'completed' => $rows
                    ->whereIn('status', ['Completed-Successful', 'Completed-Unsuccessful'])
                    ->count(),
                'cancelled' => $rows->where('status', 'Cancelled')->count(),
            ],
            'statusRows' => $rows,
            // These charts are intentionally NOT filtered by the dashboard date picker.
            'newTrend' => $this->buildNewTrend(),
            'statusTimeline' => $this->buildStatusTimeline(),
        ]);
    }

    public function export(Request $request)
    {
        [$from, $to] = $this->resolveDashboardDateRange($request);

        $inquiries = Inquiry::query()
            ->orderByDesc('status_date')
            ->orderByDesc('inquiry_date')
            ->get();

        $rows = $inquiries
            ->filter(function (Inquiry $inquiry) use ($from, $to): bool {
                $date = $this->toCarbon($inquiry->status_date ?? $inquiry->inquiry_date ?? null);

                if (! $date) {
                    return false;
                }

                return $date->greaterThanOrEqualTo($from) && $date->lessThanOrEqualTo($to);
            })
            ->map(fn (Inquiry $inquiry): array => [
                'id' => (string) $inquiry->getKey(),
                'inquiry_id' => (string) ($inquiry->inquiry_id ?? ''),
                'full_name' => (string) ($inquiry->full_name ?? ''),
                'type' => (string) ($inquiry->types ?? 'Inquirer'),
                'status' => (string) ($inquiry->status ?? ''),
                'source' => (string) ($inquiry->discovery_platform ?? ''),
                'concern' => (string) ($inquiry->concern_type ?? ''),
                'updated_at' => $this->formatDate($inquiry->status_date ?? $inquiry->inquiry_date ?? null),
            ])
            ->values();

        $cards = [
            'total' => $rows->count(),
            'new' => $rows->where('status', 'New')->count(),
            'contacted' => $rows->where('status', 'Contacted')->count(),
            'in_progress' => $rows
                ->whereIn('status', ['In Progress', 'In Progress-Active', 'In Progress-On Hold'])
                ->count(),
            'completed' => $rows
                ->whereIn('status', ['Completed-Successful', 'Completed-Unsuccessful'])
                ->count(),
            'cancelled' => $rows->where('status', 'Cancelled')->count(),
        ];

        $completedSuccessful = $rows->filter(fn (array $row) => mb_strtolower(trim($row['status'])) === 'completed-successful')->count();
        $completedUnsuccessful = $rows->filter(fn (array $row) => mb_strtolower(trim($row['status'])) === 'completed-unsuccessful')->count();
        $completedTotal = max(1, $completedSuccessful + $completedUnsuccessful);
        $successPercent = round(($completedSuccessful / $completedTotal) * 100, 1);

        // Charts are not filtered by date picker.
        $newTrend = $this->buildNewTrend();
        $statusTimeline = $this->buildStatusTimeline();
        $timelineRange = mb_strtolower(trim((string) $request->query('timeline_range', '90d')));
        $timelineDays = match ($timelineRange) {
            '7d', '7', '7days', 'last7' => 7,
            '30d', '30', '30days', 'last30' => 30,
            default => 90,
        };
        $exportStatusTimeline = array_slice($statusTimeline, -$timelineDays);

        $includeKpi = $request->boolean('include_kpi', true);
        $includeCompleted = $request->boolean('include_completed', true);
        $includeNewEntries = $request->boolean('include_new_entries', true);
        $includeAreaStatus = $request->boolean('include_area_status', true);
        $includeTable = $request->boolean('include_table', true);

        $format = mb_strtolower(trim((string) $request->query('format', 'csv')));
        if ($format === 'xcs') {
            $format = 'xlsx';
        }

        $title = trim((string) $request->query('title', 'Dashboard Export'));
        $description = trim((string) $request->query('description', ''));

        // Table filters (cards/charts are independent of these, same as the UI).
        $search = trim((string) $request->query('search', ''));
        $type = trim((string) $request->query('type', 'All'));
        $source = trim((string) $request->query('source', 'All'));
        $concern = trim((string) $request->query('concern', 'All'));
        $status = trim((string) $request->query('status', 'All'));

        $displaySource = fn (array $row): string => mb_strtolower(trim((string) $row['type'])) === 'inquirer'
            ? 'website'
            : trim((string) $row['source']);

        $tableRows = $rows
            ->filter(function (array $row) use ($search, $type, $source, $concern, $status, $displaySource): bool {
                if ($status !== 'All') {
                    $selected = mb_strtolower(trim($status));
                    $current = mb_strtolower(trim((string) ($row['status'] ?? '')));

                    if ($selected === 'in progress') {
                        if (! in_array($current, ['in progress', 'in progress-active', 'in progress-on hold'], true)) {
                            return false;
                        }
                    } elseif ($selected === 'completed') {
                        if (! in_array($current, ['completed-successful', 'completed-unsuccessful'], true)) {
                            return false;
                        }
                    } elseif ($current !== $selected) {
                        return false;
                    }
                }

                if ($type !== 'All' && mb_strtolower(trim((string) $row['type'])) !== mb_strtolower($type)) {
                    return false;
                }

                if ($source !== 'All' && mb_strtolower($displaySource($row)) !== mb_strtolower($source)) {
                    return false;
                }

                if ($concern !== 'All' && mb_strtolower(trim((string) $row['concern'])) !== mb_strtolower($concern)) {
                    return false;
                }

                if ($search === '') {
                    return true;
                }

                $haystack = mb_strtolower(implode(' ', [
                    (string) $row['inquiry_id'],
                    (string) $row['full_name'],
                    (string) $row['type'],
                    (string) $row['status'],
                    (string) $row['source'],
                    (string) $row['concern'],
                ]));

                return str_contains($haystack, mb_strtolower($search));
            })
            ->values();

        $filenameBase = 'dashboard_export_'.Carbon::now()->format('Ymd_His');

        if ($format === 'xlsx') {
            $spreadsheet = new Spreadsheet();
            $spreadsheet->getProperties()->setTitle($title !== '' ? $title : 'Dashboard Export');

            $summarySheet = $spreadsheet->getActiveSheet();
            $summarySheet->setTitle('Summary');
            $summaryRows = [
                ['Title', $title],
                ['Description', $description],
                ['Date Range', $from->toDateString().' to '.$to->toDateString()],
                ['Generated At', Carbon::now()->toDateTimeString()],
            ];
            $summarySheet->fromArray($summaryRows, null, 'A1');
            $summarySheet->getStyle('A1:A4')->getFont()->setBold(true);
            foreach (range('A', 'B') as $col) {
                $summarySheet->getColumnDimension($col)->setAutoSize(true);
            }

            $addSheet = function (string $title, array $header, array $dataRows) use ($spreadsheet): void {
                $sheet = $spreadsheet->createSheet();
                $sheet->setTitle(mb_substr($title, 0, 31));
                $sheet->fromArray([$header], null, 'A1');
                if (count($dataRows) > 0) {
                    $sheet->fromArray($dataRows, null, 'A2');
                }
                $sheet->getStyle('1:1')->getFont()->setBold(true);
                foreach (range('A', chr(ord('A') + max(0, count($header) - 1))) as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }
            };

            if ($includeKpi) {
                $addSheet('KPI Card', ['Metric', 'Value'], [
                    ['New Inquiry', $cards['new']],
                    ['Contacted', $cards['contacted']],
                    ['In Progress', $cards['in_progress']],
                    ['Cancelled', $cards['cancelled']],
                    ['Completed', $cards['completed']],
                    ['Total', $cards['total']],
                ]);
            }

            if ($includeCompleted) {
                $addSheet('Completed Status', ['Metric', 'Value'], [
                    ['Successful', $completedSuccessful],
                    ['Unsuccessful', $completedUnsuccessful],
                    ['Success %', $successPercent],
                ]);
            }

            if ($includeNewEntries) {
                $trendRows = [];
                foreach ($newTrend['labels'] as $idx => $label) {
                    $trendRows[] = [
                        $label,
                        $newTrend['leads'][$idx] ?? 0,
                        $newTrend['inquirer'][$idx] ?? 0,
                    ];
                }
                $addSheet('New Entries', ['Month', 'Leads', 'Inquirer'], $trendRows);
            }

            if ($includeAreaStatus) {
                $timelineRows = array_map(fn (array $point) => [
                    $point['date'] ?? '',
                    $point['new'] ?? 0,
                    $point['contacted'] ?? 0,
                    $point['in_progress'] ?? 0,
                    $point['completed'] ?? 0,
                    $point['cancelled'] ?? 0,
                ], $exportStatusTimeline);
                $addSheet('Area Status', ['Date', 'New', 'Contacted', 'In Progress', 'Completed', 'Cancelled'], $timelineRows);
            }

            if ($includeTable) {
                $tableData = $tableRows
                    ->map(fn (array $row) => [
                        $row['inquiry_id'],
                        $row['full_name'],
                        $row['type'],
                        $row['status'],
                        $displaySource($row),
                        $row['concern'],
                        (string) ($row['updated_at'] ?? ''),
                    ])
                    ->all();
                $addSheet('Table', ['Inquiry ID', 'Full Name', 'Type', 'Status', 'Source', 'Concern', 'Updated At'], $tableData);
            }

            $writer = new Xlsx($spreadsheet);
            $filename = $filenameBase.'.xlsx';

            return response()->streamDownload(function () use ($writer) {
                $writer->save('php://output');
            }, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
        }

        $filename = $filenameBase.'.csv';

        return response()->streamDownload(function () use (
            $title,
            $description,
            $from,
            $to,
            $includeKpi,
            $includeCompleted,
            $includeNewEntries,
            $includeAreaStatus,
            $includeTable,
            $cards,
            $completedSuccessful,
            $completedUnsuccessful,
            $successPercent,
            $newTrend,
            $exportStatusTimeline,
            $tableRows,
            $displaySource,
        ) {
            $out = fopen('php://output', 'w');

            fputcsv($out, ['Title', $title]);
            fputcsv($out, ['Description', $description]);
            fputcsv($out, ['Date Range', $from->toDateString().' to '.$to->toDateString()]);
            fputcsv($out, []);

            if ($includeKpi) {
                fputcsv($out, ['KPI Card']);
                fputcsv($out, ['Metric', 'Value']);
                fputcsv($out, ['New Inquiry', $cards['new']]);
                fputcsv($out, ['Contacted', $cards['contacted']]);
                fputcsv($out, ['In Progress', $cards['in_progress']]);
                fputcsv($out, ['Cancelled', $cards['cancelled']]);
                fputcsv($out, ['Completed', $cards['completed']]);
                fputcsv($out, ['Total', $cards['total']]);
                fputcsv($out, []);
            }

            if ($includeCompleted) {
                fputcsv($out, ['Completed Status Card']);
                fputcsv($out, ['Metric', 'Value']);
                fputcsv($out, ['Successful', $completedSuccessful]);
                fputcsv($out, ['Unsuccessful', $completedUnsuccessful]);
                fputcsv($out, ['Success %', $successPercent]);
                fputcsv($out, []);
            }

            if ($includeNewEntries) {
                fputcsv($out, ['New Entries Card']);
                fputcsv($out, ['Month', 'Leads', 'Inquirer']);
                foreach ($newTrend['labels'] as $idx => $label) {
                    fputcsv($out, [
                        $label,
                        $newTrend['leads'][$idx] ?? 0,
                        $newTrend['inquirer'][$idx] ?? 0,
                    ]);
                }
                fputcsv($out, []);
            }

            if ($includeAreaStatus) {
                fputcsv($out, ['Area Status Card']);
                fputcsv($out, ['Date', 'New', 'Contacted', 'In Progress', 'Completed', 'Cancelled']);
                foreach ($exportStatusTimeline as $point) {
                    fputcsv($out, [
                        $point['date'] ?? '',
                        $point['new'] ?? 0,
                        $point['contacted'] ?? 0,
                        $point['in_progress'] ?? 0,
                        $point['completed'] ?? 0,
                        $point['cancelled'] ?? 0,
                    ]);
                }
                fputcsv($out, []);
            }

            if ($includeTable) {
                fputcsv($out, ['Table']);
                fputcsv($out, ['Inquiry ID', 'Full Name', 'Type', 'Status', 'Source', 'Concern', 'Updated At']);
                foreach ($tableRows as $row) {
                    fputcsv($out, [
                        $row['inquiry_id'],
                        $row['full_name'],
                        $row['type'],
                        $row['status'],
                        $displaySource($row),
                        $row['concern'],
                        (string) ($row['updated_at'] ?? ''),
                    ]);
                }
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function resolveDashboardDateRange(Request $request): array
    {
        $fromRaw = trim((string) $request->query('from', ''));
        $toRaw = trim((string) $request->query('to', ''));

        $fallbackTo = Carbon::now();
        $fallbackFrom = $fallbackTo->copy()->subDays(7);

        try {
            $from = $fromRaw !== '' ? Carbon::parse($fromRaw) : $fallbackFrom;
        } catch (\Throwable) {
            $from = $fallbackFrom;
        }

        try {
            $to = $toRaw !== '' ? Carbon::parse($toRaw) : $fallbackTo;
        } catch (\Throwable) {
            $to = $fallbackTo;
        }

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        return [
            $from->copy()->startOfDay(),
            $to->copy()->endOfDay(),
        ];
    }

    private function buildNewTrend(?Carbon $from = null, ?Carbon $to = null): array
    {
        $inquiries = Inquiry::query()->get();
        $statusHistories = StatusHistory::query()->get();
        $leadStatusHistories = LeadStatusHistory::query()->get();

        $anchorMonth = $to
            ? $to->copy()->startOfMonth()
            : $this->resolveTrendAnchorMonth(
                $statusHistories->concat($leadStatusHistories),
            );
        $months = collect(range(5, 0, -1))
            ->map(fn (int $offset) => $anchorMonth->copy()->subMonths($offset))
            ->values();

        $monthKeys = $months
            ->map(fn (Carbon $month) => $month->format('Y-m'))
            ->values();

        $series = $monthKeys->mapWithKeys(fn (string $monthKey): array => [
            $monthKey => ['Leads' => 0, 'Inquirer' => 0],
        ]);
        $firstMonthKey = (string) $monthKeys->first();
        $lastMonthKey = (string) $monthKeys->last();
        $inquiryTypes = $inquiries
            ->mapWithKeys(fn (Inquiry $inquiry): array => [
                (string) ($inquiry->inquiry_id ?? '') => (string) ($inquiry->types ?? 'Inquirer'),
            ])
            ->reject(fn (string $type, string $inquiryId) => $inquiryId === '');
        $seenHistoryKeys = [];

        $statusHistories
            ->each(function (StatusHistory $history) use (&$series, $firstMonthKey, $lastMonthKey, $inquiryTypes, &$seenHistoryKeys): void {
                $this->incrementTrendMonthFromHistory(
                    $series,
                    $history,
                    $this->resolveTrendType($history, false, $inquiryTypes),
                    $firstMonthKey,
                    $lastMonthKey,
                    $seenHistoryKeys,
                    null,
                    null,
                );
            });

        $leadStatusHistories
            ->each(function (LeadStatusHistory $history) use (&$series, $firstMonthKey, $lastMonthKey, &$seenHistoryKeys): void {
                $this->incrementTrendMonthFromHistory(
                    $series,
                    $history,
                    'Leads',
                    $firstMonthKey,
                    $lastMonthKey,
                    $seenHistoryKeys,
                    null,
                    null,
                );
            });

        if ($from && $to) {
            // Re-run increment with date bounds applied, but avoid rebuilding the whole series shape.
            $seenHistoryKeys = [];
            $series = $monthKeys->mapWithKeys(fn (string $monthKey): array => [
                $monthKey => ['Leads' => 0, 'Inquirer' => 0],
            ]);

            $statusHistories->each(function (StatusHistory $history) use (&$series, $firstMonthKey, $lastMonthKey, $inquiryTypes, &$seenHistoryKeys, $from, $to): void {
                $this->incrementTrendMonthFromHistory(
                    $series,
                    $history,
                    $this->resolveTrendType($history, false, $inquiryTypes),
                    $firstMonthKey,
                    $lastMonthKey,
                    $seenHistoryKeys,
                    $from,
                    $to,
                );
            });

            $leadStatusHistories->each(function (LeadStatusHistory $history) use (&$series, $firstMonthKey, $lastMonthKey, &$seenHistoryKeys, $from, $to): void {
                $this->incrementTrendMonthFromHistory(
                    $series,
                    $history,
                    'Leads',
                    $firstMonthKey,
                    $lastMonthKey,
                    $seenHistoryKeys,
                    $from,
                    $to,
                );
            });
        }

        return [
            'labels' => $months
                ->map(fn (Carbon $month): string => $month->format('F'))
                ->all(),
            'leads' => $monthKeys
                ->map(fn (string $monthKey): int => $series->get($monthKey)['Leads'])
                ->all(),
            'inquirer' => $monthKeys
                ->map(fn (string $monthKey): int => $series->get($monthKey)['Inquirer'])
                ->all(),
        ];
    }

    private function buildStatusTimeline(?Carbon $from = null, ?Carbon $to = null): array
    {
        $statusHistories = StatusHistory::query()->get();
        $leadStatusHistories = LeadStatusHistory::query()->get();
        $allHistories = $statusHistories->concat($leadStatusHistories);

        if ($from && $to) {
            $endDay = $to->copy()->startOfDay();
            $dayCount = $from->copy()->startOfDay()->diffInDays($endDay) + 1;

            if ($dayCount > 90) {
                $dayCount = 90;
            }

            $days = collect(range($dayCount - 1, 0, -1))
                ->map(fn (int $offset) => $endDay->copy()->subDays($offset))
                ->values();
        } else {
            $anchorDate = $this->resolveTimelineAnchorDate($allHistories);
            $days = collect(range(89, 0, -1))
                ->map(fn (int $offset) => $anchorDate->copy()->subDays($offset))
                ->values();
        }

        $dayKeys = $days->map(fn (Carbon $day) => $day->format('Y-m-d'))->values();
        $series = $dayKeys->mapWithKeys(fn (string $dayKey): array => [
            $dayKey => [
                'new' => 0,
                'contacted' => 0,
                'in_progress' => 0,
                'completed' => 0,
                'cancelled' => 0,
            ],
        ]);
        $firstDayKey = (string) $dayKeys->first();
        $lastDayKey = (string) $dayKeys->last();
        $seenHistoryKeys = [];

        $allHistories->each(function (object $history) use (&$series, $firstDayKey, $lastDayKey, &$seenHistoryKeys): void {
            $this->incrementTimelineDay(
                $series,
                $history,
                $firstDayKey,
                $lastDayKey,
                $seenHistoryKeys,
            );
        });

        return $dayKeys
            ->map(fn (string $dayKey): array => [
                'date' => $dayKey,
                ...$series->get($dayKey),
            ])
            ->all();
    }

    private function resolveTimelineAnchorDate(Collection $histories): Carbon
    {
        $latestDate = $histories
            ->map(fn (object $history): ?Carbon => $this->toCarbon($this->extractHistoryDate($history)))
            ->filter()
            ->max();

        if ($latestDate instanceof Carbon) {
            return $latestDate->copy()->startOfDay();
        }

        if ($latestDate instanceof DateTimeInterface) {
            return Carbon::instance(Carbon::parse($latestDate))->startOfDay();
        }

        if (is_string($latestDate) && $latestDate !== '') {
            return Carbon::parse($latestDate)->startOfDay();
        }

        return Carbon::now()->startOfDay();
    }

    private function resolveTrendAnchorMonth(Collection $histories): Carbon
    {
        $latestDate = $histories
            ->filter(fn (object $history): bool => $this->isNewHistoryStatus($history))
            ->map(fn (object $history): ?Carbon => $this->toCarbon($this->extractHistoryDate($history)))
            ->filter()
            ->max();

        if ($latestDate instanceof Carbon) {
            return $latestDate->copy()->startOfMonth();
        }

        if ($latestDate instanceof DateTimeInterface) {
            return Carbon::instance(Carbon::parse($latestDate))->startOfMonth();
        }

        if (is_string($latestDate) && $latestDate !== '') {
            return Carbon::parse($latestDate)->startOfMonth();
        }

        return Carbon::now()->startOfMonth();
    }

    private function incrementTrendMonthFromHistory(
        Collection $series,
        object $history,
        string $typeKey,
        string $firstMonthKey,
        string $lastMonthKey,
        array &$seenHistoryKeys,
        ?Carbon $from = null,
        ?Carbon $to = null,
    ): void
    {
        if (! $this->isNewHistoryStatus($history)) {
            return;
        }

        $changeAt = $this->toCarbon($this->extractHistoryDate($history));

        if (! $changeAt) {
            return;
        }

        if ($from && $to && ($changeAt->lt($from) || $changeAt->gt($to))) {
            return;
        }

        $monthKey = $changeAt->copy()->startOfMonth()->format('Y-m');

        if ($monthKey < $firstMonthKey || $monthKey > $lastMonthKey || ! $series->has($monthKey)) {
            return;
        }

        $dedupeKey = implode('|', [
            (string) ($history->inquiry_id ?? ''),
            'new',
            $changeAt->toIso8601String(),
            $typeKey,
        ]);

        if (isset($seenHistoryKeys[$dedupeKey])) {
            return;
        }

        $seenHistoryKeys[$dedupeKey] = true;
        $monthData = $series->get($monthKey);
        $monthData[$typeKey]++;
        $series->put($monthKey, $monthData);
    }

    private function incrementTimelineDay(
        Collection $series,
        object $history,
        string $firstDayKey,
        string $lastDayKey,
        array &$seenHistoryKeys,
    ): void
    {
        $statusKey = $this->normalizeTimelineStatus($history);

        if (! $statusKey) {
            return;
        }

        $changeAt = $this->toCarbon($this->extractHistoryDate($history));

        if (! $changeAt) {
            return;
        }

        $dayKey = $changeAt->copy()->startOfDay()->format('Y-m-d');

        if ($dayKey < $firstDayKey || $dayKey > $lastDayKey || ! $series->has($dayKey)) {
            return;
        }

        $dedupeKey = implode('|', [
            (string) ($history->inquiry_id ?? ''),
            $statusKey,
            $changeAt->toIso8601String(),
        ]);

        if (isset($seenHistoryKeys[$dedupeKey])) {
            return;
        }

        $seenHistoryKeys[$dedupeKey] = true;
        $dayData = $series->get($dayKey);
        $dayData[$statusKey]++;
        $series->put($dayKey, $dayData);
    }

    private function resolveTrendType(
        object $history,
        bool $isLeadHistoryCollection,
        Collection $inquiryTypes,
    ): string
    {
        if ($isLeadHistoryCollection) {
            return 'Leads';
        }

        $inquiryId = (string) ($history->inquiry_id ?? '');
        $mappedType = mb_strtolower((string) $inquiryTypes->get($inquiryId, 'Inquirer'));

        return $mappedType === 'leads' ? 'Leads' : 'Inquirer';
    }

    private function isNewHistoryStatus(object $history): bool
    {
        $status = trim((string) (
            $history->status
            ?? $history->new_status
            ?? $history->current_status
            ?? $history->to_status
            ?? ''
        ));

        return mb_strtolower($status) === 'new';
    }

    private function normalizeTimelineStatus(object $history): ?string
    {
        $status = trim((string) (
            $history->status
            ?? $history->new_status
            ?? $history->current_status
            ?? $history->to_status
            ?? ''
        ));
        $normalized = mb_strtolower($status);

        return match ($normalized) {
            'new' => 'new',
            'contacted' => 'contacted',
            'in progress',
            'in progress-active',
            'in progress-on hold' => 'in_progress',
            'completed-successful', 'completed-unsuccessful' => 'completed',
            'cancelled' => 'cancelled',
            default => null,
        };
    }

    private function extractHistoryDate(object $history): mixed
    {
        return $history->change_at
            ?? $history->changed_at
            ?? $history->created_at
            ?? $history->updated_at
            ?? $history->status_date
            ?? $history->inquiry_date
            ?? null;
    }

    private function formatDate(mixed $value): ?string
    {
        return $this->toCarbon($value)?->toIso8601String();
    }

    private function toCarbon(mixed $value): ?Carbon
    {
        if ($value instanceof UTCDateTime) {
            return Carbon::instance($value->toDateTime());
        }

        if ($value instanceof DateTimeInterface) {
            return Carbon::instance(Carbon::parse($value));
        }

        if (is_string($value) && $value !== '') {
            return Carbon::parse($value);
        }

        return null;
    }
}
