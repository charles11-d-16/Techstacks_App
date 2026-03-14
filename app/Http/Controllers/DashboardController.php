<?php

namespace App\Http\Controllers;

use App\Models\Inquiry;
use App\Models\LeadStatusHistory;
use App\Models\StatusHistory;
use DateTimeInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use MongoDB\BSON\Regex;
use MongoDB\BSON\UTCDateTime;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $inquiries = Inquiry::query()
            ->orderByDesc('status_date')
            ->orderByDesc('inquiry_date')
            ->get();

        $rows = $inquiries
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
            'newTrend' => $this->buildNewTrend(),
            'statusTimeline' => $this->buildStatusTimeline(),
        ]);
    }

    private function buildNewTrend(): array
    {
        $inquiries = Inquiry::query()->get();
        $statusHistories = StatusHistory::query()->get();
        $leadStatusHistories = LeadStatusHistory::query()->get();
        $anchorMonth = $this->resolveTrendAnchorMonth(
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
                );
            });

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

    private function buildStatusTimeline(): array
    {
        $statusHistories = StatusHistory::query()->get();
        $leadStatusHistories = LeadStatusHistory::query()->get();
        $allHistories = $statusHistories->concat($leadStatusHistories);
        $anchorDate = $this->resolveTimelineAnchorDate($allHistories);
        $days = collect(range(89, 0, -1))
            ->map(fn (int $offset) => $anchorDate->copy()->subDays($offset))
            ->values();
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
    ): void
    {
        if (! $this->isNewHistoryStatus($history)) {
            return;
        }

        $changeAt = $this->toCarbon($this->extractHistoryDate($history));

        if (! $changeAt) {
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
