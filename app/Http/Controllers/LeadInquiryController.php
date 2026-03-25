<?php

namespace App\Http\Controllers;

use App\Models\DeleteHistory;
use App\Models\EditHistory;
use App\Models\Inquiry;
use App\Models\InquiryCounter;
use App\Models\LeadStatusHistory;
use App\Models\StatusHistory;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Response as ResponseFacade;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use MongoDB\BSON\Regex;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Operation\FindOneAndUpdate;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use DateTimeInterface;

class LeadInquiryController extends Controller
{
    private const MOVE_STATUSES = [
        'New',
        'Contacted',
        'In Progress-Active',
        'In Progress-On Hold',
        'Completed-Successful',
        'Completed-Unsuccessful',
        'Cancelled',
    ];

    private const STATUS_GROUPS = [
        'new-inquiry' => ['New'],
        'contacted' => ['Contacted'],
        'in-progress' => ['In Progress', 'In Progress-Active', 'In Progress-On Hold'],
        'completed' => ['Completed-Successful', 'Completed-Unsuccessful'],
        'cancelled' => ['Cancelled'],
    ];

    public function __invoke(Request $request, string $statusKey): Response
    {
        abort_unless(isset(self::STATUS_GROUPS[$statusKey]), 404);

        $statuses = self::STATUS_GROUPS[$statusKey];
        $search = trim($request->string('search')->toString());
        $type = $request->string('type')->toString();
        $source = $request->string('source')->toString();
        $concern = $request->string('concern')->toString();
        $perPage = (int) $request->integer('per_page', 5);
        $perPage = max(5, min($perPage, 100));
        $requestedPerPage = $perPage;

        $query = Inquiry::query()
            ->whereIn('status', $statuses);

        if ($search !== '') {
            $regex = new Regex(preg_quote($search), 'i');
            $query->where(function ($q) use ($regex) {
                $q->orWhere('inquiry_id', 'regex', $regex)
                    ->orWhere('full_name', 'regex', $regex)
                    ->orWhere('email', 'regex', $regex)
                    ->orWhere('phone', 'regex', $regex)
                    ->orWhere('company', 'regex', $regex)
                    ->orWhere('message', 'regex', $regex)
                    ->orWhere('discovery_platform', 'regex', $regex)
                    ->orWhere('concern_type', 'regex', $regex);
            });
        }

        if ($source !== '' && $source !== 'All') {
            if (mb_strtolower($source) === 'website') {
                $query->where(function ($q) {
                    $q->whereNull('types')
                        ->orWhere('types', '')
                        ->orWhere('types', 'regex', new Regex('^Inquirer$', 'i'));
                });
            } else {
                $query->where('discovery_platform', 'regex', new Regex('^'.preg_quote($source).'$','i'));
            }
        }

        if ($type !== '' && $type !== 'All') {
            if (mb_strtolower($type) === 'inquirer') {
                $query->where(function ($q) {
                    $q->whereNull('types')
                        ->orWhere('types', '')
                        ->orWhere('types', 'regex', new Regex('^Inquirer$', 'i'));
                });
            } else {
                $query->where('types', 'regex', new Regex('^'.preg_quote($type).'$','i'));
            }
        }

        if ($concern !== '' && $concern !== 'All') {
            $query->where('concern_type', 'regex', new Regex('^'.preg_quote($concern).'$','i'));
        }

        if ($perPage === 100) {
            $totalRows = (int) $query->count();
            $perPage = max(1, $totalRows);
        }

        /** @var LengthAwarePaginator $paginator */
        $paginator = $query
            ->orderByDesc('status_date')
            ->orderByDesc('inquiry_date')
            ->paginate($perPage)
            ->withQueryString();

        $rows = collect($paginator->items())
            ->map(fn (Inquiry $inquiry): array => [
                'id' => (string) $inquiry->getKey(),
                'inquiry_id' => (string) ($inquiry->inquiry_id ?? ''),
                'full_name' => (string) ($inquiry->full_name ?? ''),
                'email' => (string) ($inquiry->email ?? ''),
                'message' => $this->normalizeMessage($inquiry->message ?? null),
                'phone' => (string) ($inquiry->phone ?? ''),
                'company' => (string) ($inquiry->company ?? ''),
                'discovery_platform' => (string) ($inquiry->discovery_platform ?? ''),
                'concern_type' => (string) ($inquiry->concern_type ?? ''),
                'type' => (string) ($inquiry->types ?? 'Inquirer'),
                'status' => (string) ($inquiry->status ?? ''),
                'inquiry_date' => $this->formatDate($inquiry->inquiry_date ?? null),
                'status_date' => $this->formatDate($inquiry->status_date ?? null),
            ])
            ->values();

        return Inertia::render('leads/inquiries', [
            'statusKey' => $statusKey,
            'statusLabel' => $this->statusLabel($statusKey),
            'rows' => $rows,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'filters' => [
                'search' => $search,
                'type' => $type !== '' ? $type : 'All',
                'source' => $source !== '' ? $source : 'All',
                'concern' => $concern !== '' ? $concern : 'All',
                'per_page' => $requestedPerPage,
            ],
        ]);
    }

    public function show(string $inquiryId): Response
    {
        $inquiry = Inquiry::query()->findOrFail($inquiryId);

        return Inertia::render('leads/show', [
            'inquiry' => $this->mapInquiryDetail($inquiry),
            'historyGroups' => $this->historyGroupsForInquiry($inquiry),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('leads/add');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'address' => ['required', 'string', 'max:500'],
            'discovery_platform' => ['required', 'string', Rule::in(['facebook', 'instagram', 'linkedIn', 'referral', 'Other'])],
            'concern_type' => ['required', 'string', Rule::in(['proposal', 'maintenance', 'security', 'general', 'led wall', 'template inquiry'])],
            'message' => ['nullable', 'string', 'max:5000'],
        ]);

        $inquiry = new Inquiry();
        $inquiry->inquiry_id = $this->generateInquiryCode();
        $inquiry->full_name = $validated['full_name'];
        $inquiry->company = $validated['company'] ?? '';
        $inquiry->email = $validated['email'];
        $inquiry->phone = $validated['phone'];
        $inquiry->address = $validated['address'];
        $inquiry->discovery_platform = $validated['discovery_platform'];
        $inquiry->concern_type = $validated['concern_type'];
        $inquiry->message = trim((string) ($validated['message'] ?? ''));
        $inquiry->types = 'Leads';
        $inquiry->status = 'New';
        $inquiry->inquiry_date = Carbon::now();
        $inquiry->status_date = Carbon::now();
        $inquiry->save();
        $this->createInitialStatusHistory($request, $inquiry, Carbon::now());

        $request->session()->flash(
            'success',
            sprintf('Successfully Added %s Leads', (string) $inquiry->inquiry_id),
        );

        return Inertia::location(
            route('leads.inquiries.status', ['statusKey' => 'new-inquiry']),
        );
    }

    public function import(Request $request)
    {
        $validated = $request->validate([
            'import_file' => ['required', 'file', 'mimes:csv,txt,xlsx,xls', 'max:5120'],
        ]);

        $path = $validated['import_file']->getRealPath();
        if (! is_string($path) || $path === '') {
            throw ValidationException::withMessages([
                'import_file' => 'Unable to read the uploaded file.',
            ]);
        }

        $rows = $this->parseImportFile($validated['import_file']->getClientOriginalName(), $path);
        if (count($rows) === 0) {
            throw ValidationException::withMessages([
                'import_file' => 'The file has no data rows to import.',
            ]);
        }

        $prepared = [];
        $rowErrors = [];

        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $fullName = trim((string) ($row['full_name'] ?? ''));
            $email = trim((string) ($row['email'] ?? ''));
            $phone = trim((string) ($row['phone'] ?? ''));
            $address = trim((string) ($row['address'] ?? ''));
            $company = trim((string) ($row['company'] ?? ''));
            $message = trim((string) ($row['message'] ?? ''));
            $source = $this->normalizeSource((string) ($row['source'] ?? ''));
            $concern = $this->normalizeConcern((string) ($row['concern'] ?? ''));

            if ($fullName === '' || $email === '' || $phone === '' || $address === '' || ! $source || ! $concern) {
                $rowErrors[] = "Row {$rowNumber} is missing required fields (full name, email, phone, address, source, concern).";
                continue;
            }

            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $rowErrors[] = "Row {$rowNumber} has invalid email.";
                continue;
            }

            $prepared[] = [
                'full_name' => $fullName,
                'email' => $email,
                'phone' => $phone,
                'address' => $address,
                'company' => $company,
                'message' => $message,
                'discovery_platform' => $source,
                'concern_type' => $concern,
            ];
        }

        if (count($rowErrors) > 0) {
            throw ValidationException::withMessages([
                'import_file' => implode(' ', array_slice($rowErrors, 0, 5)),
            ]);
        }

        $codes = $this->generateInquiryCodes(count($prepared));
        $now = Carbon::now();

        foreach ($prepared as $idx => $item) {
            $inquiry = new Inquiry();
            $inquiry->inquiry_id = $codes[$idx];
            $inquiry->full_name = $item['full_name'];
            $inquiry->email = $item['email'];
            $inquiry->phone = $item['phone'];
            $inquiry->address = $item['address'];
            $inquiry->company = $item['company'];
            $inquiry->message = $item['message'];
            $inquiry->types = 'Leads';
            $inquiry->discovery_platform = $item['discovery_platform'];
            $inquiry->concern_type = $item['concern_type'];
            $inquiry->status = 'New';
            $inquiry->inquiry_date = $now;
            $inquiry->status_date = $now;
            $inquiry->save();
            $this->createInitialStatusHistory($request, $inquiry, $now);
        }

        $request->session()->flash(
            'success',
            sprintf('Successfully Import %d Leads', count($prepared)),
        );

        return Inertia::location(
            route('leads.inquiries.status', ['statusKey' => 'new-inquiry']),
        );
    }

    public function downloadImportTemplate()
    {
        if (! class_exists(Spreadsheet::class) || ! class_exists(Xlsx::class)) {
            $csv = implode(',', [
                'Full Name',
                'Email Address',
                'Phone',
                'Company',
                'address',
                'Dicovered Via',
                'Inquiry',
                'Message',
            ])."\n".implode(',', [
                'Jane Doe',
                'jane@example.com',
                '09123456789',
                'Tech Co',
                'Makati City',
                'referral',
                'maintenance',
                'Need maintenance support',
            ])."\n";

            return ResponseFacade::make($csv, 200, [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="lead-import-template.csv"',
            ]);
        }

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Import Template');

        $headers = [
            'A1' => 'Full Name',
            'B1' => 'Email Address',
            'C1' => 'Phone',
            'D1' => 'Company',
            'E1' => 'address',
            'F1' => 'Dicovered Via',
            'G1' => 'Inquiry',
            'H1' => 'Message',
        ];

        foreach ($headers as $cell => $label) {
            $sheet->setCellValue($cell, $label);
        }

        $sheet->setCellValue('A2', 'Jane Doe');
        $sheet->setCellValue('B2', 'jane@example.com');
        $sheet->setCellValue('C2', '09123456789');
        $sheet->setCellValue('D2', 'Tech Co');
        $sheet->setCellValue('E2', 'Makati City');
        $sheet->setCellValue('F2', 'referral');
        $sheet->setCellValue('G2', 'maintenance');
        $sheet->setCellValue('H2', 'Need maintenance support');

        $sheet->getStyle('A1:H1')->getFont()->setBold(true);
        foreach (range('A', 'H') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $this->applyDropdownValidation($sheet, 'F2:F1000', [
            'facebook',
            'instagram',
            'linkedIn',
            'referral',
            'Other',
        ]);
        $this->applyDropdownValidation($sheet, 'G2:G1000', [
            'proposal',
            'maintenance',
            'security',
            'general',
            'led wall',
            'template inquiry',
        ]);

        $tempPath = tempnam(sys_get_temp_dir(), 'lead-import-');
        if ($tempPath === false) {
            abort(500, 'Unable to generate template.');
        }

        $xlsxPath = $tempPath.'.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save($xlsxPath);
        @unlink($tempPath);

        return ResponseFacade::download($xlsxPath, 'lead-import-template.xlsx')->deleteFileAfterSend(true);
    }

    public function edit(string $inquiryId): Response
    {
        $inquiry = Inquiry::query()->findOrFail($inquiryId);

        return Inertia::render('leads/edit', [
            'inquiry' => $this->mapInquiryDetail($inquiry),
        ]);
    }

    public function move(Request $request, string $inquiryId)
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(self::MOVE_STATUSES)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $inquiry = Inquiry::query()->findOrFail($inquiryId);
        $inquiry->status = $validated['status'];
        $inquiry->status_date = Carbon::now();
        $inquiry->save();

        $user = $request->user();
        $movedByName = trim(
            implode(' ', array_filter([
                (string) ($user->firstname ?? ''),
                (string) ($user->lastname ?? ''),
            ])),
        );

        LeadStatusHistory::query()->create([
            'inquiry_id' => (string) ($inquiry->inquiry_id ?? ''),
            'status' => $validated['status'],
            'notes' => trim((string) ($validated['notes'] ?? '')),
            'change_at' => Carbon::now(),
            'moved_by_name' => $movedByName !== '' ? $movedByName : (string) ($user->name ?? ''),
            'moved_by_email' => (string) ($user->email ?? ''),
        ]);

        return back();
    }

    public function update(Request $request, string $inquiryId)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'discovery_platform' => ['nullable', 'string', 'max:100'],
            'concern_type' => ['nullable', 'string', 'max:100'],
            'message' => ['nullable', 'string', 'max:5000'],
        ]);

        $inquiry = Inquiry::query()->findOrFail($inquiryId);

        $inquiry->full_name = $validated['full_name'];
        $inquiry->company = $validated['company'] ?? '';
        $inquiry->email = $validated['email'] ?? '';
        $inquiry->phone = $validated['phone'] ?? '';
        $inquiry->address = $validated['address'] ?? '';
        $inquiry->discovery_platform = $validated['discovery_platform'] ?? '';
        $inquiry->concern_type = $validated['concern_type'] ?? '';
        $inquiry->message = $validated['message'] ?? '';
        $inquiry->save();

        $user = $request->user();
        $movedByName = trim(
            implode(' ', array_filter([
                (string) ($user->firstname ?? ''),
                (string) ($user->lastname ?? ''),
            ])),
        );

        EditHistory::query()->create([
            'inquiry_id' => (string) ($inquiry->inquiry_id ?? ''),
            'moved_by_name' => $movedByName !== '' ? $movedByName : (string) ($user->name ?? ''),
            'moved_by_email' => (string) ($user->email ?? ''),
            'edited_at' => Carbon::now(),
        ]);

        return redirect()
            ->route('leads.inquiries.show', ['inquiryId' => $inquiryId])
            ->with('success', sprintf('Successfully Edit %s Inquirer', (string) ($inquiry->inquiry_id ?: 'ID')));
    }

    public function destroy(Request $request, string $inquiryId)
    {
        $inquiry = Inquiry::query()->findOrFail($inquiryId);
        $statusKey = $this->statusKeyFromStatus((string) ($inquiry->status ?? ''));
        $inquiryCode = (string) ($inquiry->inquiry_id ?? '');
        $this->deleteInquiryWithHistory($request, $inquiry);

        return redirect()
            ->route('leads.inquiries.status', ['statusKey' => $statusKey])
            ->with('success', sprintf('Successfully Deleted %s Inquirer', $inquiryCode !== '' ? $inquiryCode : 'ID'));
    }

    public function destroyMany(Request $request)
    {
        $validated = $request->validate([
            'inquiry_ids' => ['required', 'array', 'min:1'],
            'inquiry_ids.*' => ['required', 'string'],
        ]);

        $ids = collect($validated['inquiry_ids'])
            ->filter(fn ($id) => is_string($id) && trim($id) !== '')
            ->unique()
            ->values();

        $deleted = 0;

        foreach ($ids as $id) {
            $inquiry = Inquiry::query()->find((string) $id);

            if (! $inquiry instanceof Inquiry) {
                continue;
            }

            $this->deleteInquiryWithHistory($request, $inquiry);
            $deleted++;
        }

        return back()->with(
            'success',
            sprintf('Successfully deleted %d inquirer%s.', $deleted, $deleted === 1 ? '' : 's'),
        );
    }

    private function statusLabel(string $statusKey): string
    {
        return match ($statusKey) {
            'new-inquiry' => 'New Inquiry',
            'contacted' => 'Contacted',
            'in-progress' => 'In Progress',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            default => 'Leads',
        };
    }

    private function formatDate(mixed $value): ?string
    {
        if ($value instanceof UTCDateTime) {
            return Carbon::instance($value->toDateTime())->toIso8601String();
        }

        if ($value instanceof DateTimeInterface) {
            return $value->toIso8601String();
        }

        if (is_string($value) && $value !== '') {
            return $value;
        }

        return null;
    }

    private function normalizeMessage(mixed $value): string
    {
        if (! is_string($value)) {
            return '';
        }

        $message = trim($value);

        if ($message === '') {
            return '';
        }

        $normalized = mb_strtolower($message);
        $normalized = preg_replace('/\s+/', ' ', $normalized) ?? $normalized;

        if ($normalized === 'empty - please fill in later' || $normalized === 'empty please fill in later') {
            return '';
        }

        if (str_contains($normalized, 'please fill in later') && str_contains($normalized, 'empty')) {
            return '';
        }

        return $message;
    }

    private function mapInquiryDetail(Inquiry $inquiry): array
    {
        return [
            'id' => (string) $inquiry->getKey(),
            'full_name' => (string) ($inquiry->full_name ?? ''),
            'email' => (string) ($inquiry->email ?? ''),
            'discovery_platform' => (string) ($inquiry->discovery_platform ?? ''),
            'concern_type' => (string) ($inquiry->concern_type ?? ''),
            'message' => $this->normalizeMessage($inquiry->message ?? null),
            'status' => (string) ($inquiry->status ?? ''),
            'inquiry_date' => $this->formatDate($inquiry->inquiry_date ?? null),
            'status_date' => $this->formatDate($inquiry->status_date ?? null),
            'inquiry_id' => (string) ($inquiry->inquiry_id ?? ''),
            '__v' => is_numeric($inquiry->__v ?? null) ? (int) $inquiry->__v : 0,
            'type' => (string) ($inquiry->types ?? 'Inquirer'),
            'company' => (string) ($inquiry->company ?? ''),
            'phone' => (string) ($inquiry->phone ?? ''),
            'address' => (string) ($inquiry->address ?? ''),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function historyGroupsForInquiry(Inquiry $inquiry): array
    {
        $inquiryCode = (string) ($inquiry->inquiry_id ?? '');

        if ($inquiryCode === '') {
            return [];
        }

        $statusHistoryRows = StatusHistory::query()
            ->where('inquiry_id', $inquiryCode)
            ->get();

        $leadStatusHistoryRows = LeadStatusHistory::query()
            ->where('inquiry_id', $inquiryCode)
            ->get();

        $historyRows = $statusHistoryRows
            ->concat($leadStatusHistoryRows)
            ->values();

        $emails = $historyRows
            ->map(fn (object $history): string => trim((string) ($history->moved_by_email ?? '')))
            ->filter(fn (string $email): bool => $email !== '')
            ->unique()
            ->values();

        $usersByEmail = User::query()
            ->whereIn('email', $emails->all())
            ->get()
            ->keyBy(fn (User $user) => mb_strtolower((string) ($user->email ?? '')));

        return $historyRows
            ->map(function (object $history) use ($usersByEmail): ?array {
                $changedAt = $this->toCarbonValue($history->change_at ?? null)
                    ?? $this->toCarbonValue($history->created_at ?? null)
                    ?? $this->toCarbonValue($history->updated_at ?? null);

                if (! $changedAt instanceof Carbon) {
                    return null;
                }

                $email = trim((string) ($history->moved_by_email ?? ''));
                /** @var User|null $user */
                $user = $email !== ''
                    ? $usersByEmail->get(mb_strtolower($email))
                    : null;

                $avatar = (string) ($user?->avatar ?? '');
                $avatarUrl = $avatar !== ''
                    ? (str_starts_with($avatar, 'http://') || str_starts_with($avatar, 'https://')
                        ? $avatar
                        : Storage::disk('public')->url($avatar))
                    : null;

                return [
                    'status' => (string) ($history->status ?? ''),
                    'notes' => trim((string) ($history->notes ?? '')),
                    'changed_at' => $changedAt->toIso8601String(),
                    'changed_at_label' => $changedAt->format('M j, Y g:i A'),
                    'date_key' => $changedAt->format('Y-m-d'),
                    'date_label' => $changedAt->format('F j, Y'),
                    'moved_by_name' => (string) ($history->moved_by_name ?? 'Unknown staff'),
                    'moved_by_email' => $email,
                    'moved_by_role' => $this->normalizeRoleLabel((string) ($user?->role ?? '')),
                    'moved_by_avatar' => $avatarUrl,
                ];
            })
            ->filter()
            ->sortByDesc('changed_at')
            ->groupBy('date_key')
            ->map(function ($items) {
                $rows = collect($items)
                    ->sortByDesc('changed_at')
                    ->values();

                $first = $rows->first();

                return [
                    'date_key' => (string) ($first['date_key'] ?? ''),
                    'date_label' => (string) ($first['date_label'] ?? ''),
                    'items' => $rows->all(),
                ];
            })
            ->values()
            ->all();
    }

    private function normalizeRoleLabel(string $role): string
    {
        $normalized = trim(mb_strtolower($role));

        return match ($normalized) {
            'superadmin', 'super_admin' => 'Superadmin',
            'admin' => 'Admin',
            default => 'Staff',
        };
    }

    private function toCarbonValue(mixed $value): ?Carbon
    {
        if ($value instanceof UTCDateTime) {
            return Carbon::instance($value->toDateTime());
        }

        if ($value instanceof DateTimeInterface) {
            return Carbon::instance(Carbon::parse($value));
        }

        if (is_string($value) && trim($value) !== '') {
            return Carbon::parse($value);
        }

        return null;
    }

    private function statusKeyFromStatus(string $status): string
    {
        $normalized = trim(mb_strtolower($status));

        return match ($normalized) {
            'new' => 'new-inquiry',
            'contacted' => 'contacted',
            'in progress',
            'in progress-active',
            'in progress-on hold' => 'in-progress',
            'completed-successful', 'completed-unsuccessful' => 'completed',
            'cancelled' => 'cancelled',
            default => 'new-inquiry',
        };
    }

    private function deleteInquiryWithHistory(Request $request, Inquiry $inquiry): void
    {
        $inquiryCode = (string) ($inquiry->inquiry_id ?? '');
        $actor = $request->user();
        $actorName = trim(implode(' ', array_filter([
            (string) ($actor->firstname ?? ''),
            (string) ($actor->lastname ?? ''),
        ])));

        DeleteHistory::query()->create([
            'entity_type' => $this->deleteEntityTypeForInquiry($inquiry),
            'target_id' => (string) $inquiry->getKey(),
            'target_code' => $inquiryCode,
            'target_name' => (string) ($inquiry->full_name ?? ''),
            'target_email' => (string) ($inquiry->email ?? ''),
            'deleted_by_name' => $actorName !== '' ? $actorName : (string) ($actor->name ?? ''),
            'deleted_by_email' => (string) ($actor->email ?? ''),
            'deleted_at' => Carbon::now(),
        ]);

        if ($inquiryCode !== '') {
            StatusHistory::query()
                ->where('inquiry_id', $inquiryCode)
                ->delete();
            LeadStatusHistory::query()
                ->where('inquiry_id', $inquiryCode)
                ->delete();
        }

        $inquiry->delete();
    }

    private function deleteEntityTypeForInquiry(Inquiry $inquiry): string
    {
        $type = trim((string) ($inquiry->types ?? ''));

        if (mb_strtolower($type) === 'leads') {
            return 'Leads';
        }

        return 'Inquirer';
    }

    private function generateInquiryCode(): string
    {
        return $this->generateInquiryCodes(1)[0];
    }

    /**
     * @return array<int, string>
     */
    private function generateInquiryCodes(int $count): array
    {
        $count = max(1, $count);

        $counter = InquiryCounter::raw(function ($collection) use ($count) {
            return $collection->findOneAndUpdate(
                ['_id' => 'inquiry_id'],
                [
                    '$inc' => ['seq' => $count],
                    '$setOnInsert' => ['__v' => 0],
                ],
                [
                    'upsert' => true,
                    'returnDocument' => FindOneAndUpdate::RETURN_DOCUMENT_AFTER,
                ],
            );
        });

        $end = (int) ($counter['seq'] ?? $count);
        $start = $end - $count + 1;

        return collect(range($start, $end))
            ->map(fn (int $seq) => 'CLNT_'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT))
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function parseImportFile(string $originalName, string $path): array
    {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        if (
            in_array($extension, ['xlsx', 'xls'], true)
            && class_exists(IOFactory::class)
        ) {
            return $this->parseImportSpreadsheet($path);
        }

        return $this->parseImportCsv($path);
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function parseImportCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return [];
        }

        $headerRow = fgetcsv($handle);
        if (! is_array($headerRow)) {
            fclose($handle);
            return [];
        }

        $headers = array_map(fn ($h) => $this->normalizeHeader((string) $h), $headerRow);
        $rows = [];

        while (($line = fgetcsv($handle)) !== false) {
            if (! is_array($line)) {
                continue;
            }

            $assoc = [];
            foreach ($headers as $i => $key) {
                $assoc[$key] = trim((string) ($line[$i] ?? ''));
            }

            if (implode('', $assoc) === '') {
                continue;
            }

            $rows[] = [
                'full_name' => $this->pickImportValue($assoc, ['full_name', 'fullname', 'name']),
                'email' => $this->pickImportValue($assoc, ['email_address', 'email']),
                'phone' => $this->pickImportValue($assoc, ['phone', 'phone_number']),
                'company' => $this->pickImportValue($assoc, ['company']),
                'address' => $this->pickImportValue($assoc, ['address']),
                'source' => $this->pickImportValue($assoc, ['dicovered_via', 'discovered_via', 'source', 'discovery_platform']),
                'concern' => $this->pickImportValue($assoc, ['inquiry', 'concern', 'concern_type']),
                'message' => $this->pickImportValue($assoc, ['message', 'notes']),
            ];
        }

        fclose($handle);

        return $rows;
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function parseImportSpreadsheet(string $path): array
    {
        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestDataRow();
        $highestColumn = $sheet->getHighestDataColumn();
        $headerRow = $sheet->rangeToArray("A1:{$highestColumn}1", null, true, true, false)[0] ?? [];

        if (! is_array($headerRow) || count($headerRow) === 0) {
            return [];
        }

        $headers = array_map(fn ($h) => $this->normalizeHeader((string) $h), $headerRow);
        $rows = [];

        for ($rowIndex = 2; $rowIndex <= $highestRow; $rowIndex++) {
            $line = $sheet->rangeToArray("A{$rowIndex}:{$highestColumn}{$rowIndex}", null, true, true, false)[0] ?? [];
            if (! is_array($line)) {
                continue;
            }

            $assoc = [];
            foreach ($headers as $i => $key) {
                $assoc[$key] = trim((string) ($line[$i] ?? ''));
            }

            if (implode('', $assoc) === '') {
                continue;
            }

            $rows[] = [
                'full_name' => $this->pickImportValue($assoc, ['full_name', 'fullname', 'name']),
                'email' => $this->pickImportValue($assoc, ['email_address', 'email']),
                'phone' => $this->pickImportValue($assoc, ['phone', 'phone_number']),
                'company' => $this->pickImportValue($assoc, ['company']),
                'address' => $this->pickImportValue($assoc, ['address']),
                'source' => $this->pickImportValue($assoc, ['dicovered_via', 'discovered_via', 'source', 'discovery_platform']),
                'concern' => $this->pickImportValue($assoc, ['inquiry', 'concern', 'concern_type']),
                'message' => $this->pickImportValue($assoc, ['message', 'notes']),
            ];
        }

        return $rows;
    }

    private function normalizeHeader(string $header): string
    {
        $header = preg_replace('/^\xEF\xBB\xBF/', '', $header) ?? $header;
        $header = trim(mb_strtolower($header));
        $header = preg_replace('/[^a-z0-9]+/', '_', $header) ?? $header;

        return trim($header, '_');
    }

    /**
     * @param array<string, string> $assoc
     * @param array<int, string> $keys
     */
    private function pickImportValue(array $assoc, array $keys): string
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $assoc)) {
                return trim((string) $assoc[$key]);
            }
        }

        return '';
    }

    private function normalizeSource(string $source): ?string
    {
        $value = trim(mb_strtolower($source));
        if ($value === '') {
            return null;
        }

        return match (true) {
            str_contains($value, 'facebook') => 'facebook',
            str_contains($value, 'instagram'), str_contains($value, 'intagram') => 'instagram',
            str_contains($value, 'linkedin'), str_contains($value, 'linkedin'), str_contains($value, 'link') => 'linkedIn',
            str_contains($value, 'ref') => 'referral',
            str_contains($value, 'other') => 'Other',
            default => null,
        };
    }

    private function normalizeConcern(string $concern): ?string
    {
        $value = trim(mb_strtolower($concern));
        if ($value === '') {
            return null;
        }

        return match (true) {
            str_contains($value, 'proposal') => 'proposal',
            str_contains($value, 'maint') => 'maintenance',
            str_contains($value, 'security') => 'security',
            str_contains($value, 'general') => 'general',
            str_contains($value, 'led') => 'led wall',
            str_contains($value, 'template') => 'template inquiry',
            default => null,
        };
    }

    /**
     * @param array<int, string> $values
     */
    private function applyDropdownValidation($sheet, string $range, array $values): void
    {
        $formula = '"'.implode(',', $values).'"';
        [$startCell, $endCell] = explode(':', $range);
        $startRow = (int) preg_replace('/\D+/', '', $startCell);
        $endRow = (int) preg_replace('/\D+/', '', $endCell);
        $column = preg_replace('/\d+/', '', $startCell) ?? '';

        for ($row = $startRow; $row <= $endRow; $row++) {
            $cell = $column.$row;
            $validation = $sheet->getCell($cell)->getDataValidation();
            $validation->setType(DataValidation::TYPE_LIST);
            $validation->setErrorStyle(DataValidation::STYLE_STOP);
            $validation->setAllowBlank(false);
            $validation->setShowDropDown(true);
            $validation->setShowInputMessage(true);
            $validation->setShowErrorMessage(true);
            $validation->setErrorTitle('Invalid option');
            $validation->setError('Select a value from the dropdown list.');
            $validation->setFormula1($formula);
        }
    }

    private function createInitialStatusHistory(Request $request, Inquiry $inquiry, Carbon $changedAt): void
    {
        $user = $request->user();
        $movedByName = trim(
            implode(' ', array_filter([
                (string) ($user->firstname ?? ''),
                (string) ($user->lastname ?? ''),
            ])),
        );

        $payload = [
            'inquiry_id' => (string) ($inquiry->inquiry_id ?? ''),
            'status' => 'New',
            'notes' => '',
            'change_at' => $changedAt,
            'moved_by_name' => $movedByName !== '' ? $movedByName : (string) ($user->name ?? ''),
            'moved_by_email' => (string) ($user->email ?? ''),
        ];

        if (mb_strtolower((string) ($inquiry->types ?? '')) === 'leads') {
            LeadStatusHistory::query()->create($payload);
            return;
        }

        StatusHistory::query()->create($payload);
    }
}
