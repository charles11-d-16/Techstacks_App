<?php

namespace App\Http\Controllers;

use App\Models\DeleteHistory;
use App\Models\EditHistory;
use App\Models\Inquiry;
use App\Models\LoginHistory;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\CarbonInterface;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AuditTrailController extends Controller
{
    public function logins(): Response
    {
        $usersByEmail = User::query()
            ->get()
            ->keyBy(fn (User $user): string => strtolower((string) ($user->email ?? '')));

        $logins = LoginHistory::query()
            ->orderByDesc('created_at')
            ->get()
            ->map(function (LoginHistory $history) use ($usersByEmail): array {
                $email = (string) ($history->email ?? '');
                $matchedUser = $usersByEmail->get(strtolower($email));
                $avatar = (string) ($matchedUser?->avatar ?? '');
                $avatarUrl = null;

                if ($avatar !== '') {
                    $avatarUrl = str_starts_with($avatar, 'http://') || str_starts_with($avatar, 'https://')
                        ? $avatar
                        : Storage::disk('public')->url($avatar);
                }

                return [
                    'id' => (string) $history->getKey(),
                    'user_id' => (string) ($history->userId ?? ''),
                    'name' => (string) ($history->name ?? ''),
                    'email' => $email,
                    'role' => (string) ($matchedUser?->role ?? ''),
                    'avatar_url' => $avatarUrl,
                    'created_at' => $this->normalizeDateValue($history->created_at),
                ];
            })
            ->values();

        return Inertia::render('audit/logins', [
            'logins' => $logins,
        ]);
    }

    public function changes(): Response
    {
        $usersByEmail = User::query()
            ->get()
            ->keyBy(fn (User $user): string => strtolower((string) ($user->email ?? '')));
        $inquiriesByCode = Inquiry::query()
            ->get()
            ->keyBy(fn (Inquiry $inquiry): string => (string) ($inquiry->inquiry_id ?? ''));

        $changes = EditHistory::query()
            ->orderByDesc('edited_at')
            ->get()
            ->map(function (EditHistory $history) use ($usersByEmail, $inquiriesByCode): array {
                $email = (string) ($history->moved_by_email ?? '');
                $matchedUser = $usersByEmail->get(strtolower($email));
                $avatar = (string) ($matchedUser?->avatar ?? '');
                $avatarUrl = null;

                if ($avatar !== '') {
                    $avatarUrl = str_starts_with($avatar, 'http://') || str_starts_with($avatar, 'https://')
                        ? $avatar
                        : Storage::disk('public')->url($avatar);
                }

                $inquiryCode = (string) ($history->inquiry_id ?? '');
                $matchedInquiry = $inquiriesByCode->get($inquiryCode);

                return [
                    'id' => (string) $history->getKey(),
                    'name' => (string) ($history->moved_by_name ?? ''),
                    'email' => $email,
                    'role' => (string) ($matchedUser?->role ?? ''),
                    'avatar_url' => $avatarUrl,
                    'inquiry_id' => $inquiryCode,
                    'full_name' => (string) ($matchedInquiry?->full_name ?? ''),
                    'inquiry_type' => (string) ($matchedInquiry?->types ?? 'Inquirer'),
                    'edited_at' => $this->normalizeDateValue($history->edited_at),
                ];
            })
            ->values();

        return Inertia::render('audit/changes', [
            'changes' => $changes,
        ]);
    }

    public function deletions(): Response
    {
        $usersByEmail = User::query()
            ->get()
            ->keyBy(fn (User $user): string => strtolower((string) ($user->email ?? '')));

        $deletions = DeleteHistory::query()
            ->orderByDesc('deleted_at')
            ->get()
            ->map(function (DeleteHistory $history) use ($usersByEmail): array {
                $email = (string) ($history->deleted_by_email ?? '');
                $matchedUser = $usersByEmail->get(strtolower($email));
                $avatar = (string) ($matchedUser?->avatar ?? '');
                $avatarUrl = null;

                if ($avatar !== '') {
                    $avatarUrl = str_starts_with($avatar, 'http://') || str_starts_with($avatar, 'https://')
                        ? $avatar
                        : Storage::disk('public')->url($avatar);
                }

                return [
                    'id' => (string) $history->getKey(),
                    'name' => (string) ($history->deleted_by_name ?? ''),
                    'email' => $email,
                    'role' => (string) ($matchedUser?->role ?? ''),
                    'avatar_url' => $avatarUrl,
                    'entity_type' => (string) ($history->entity_type ?? ''),
                    'target_code' => (string) ($history->target_code ?? ''),
                    'target_name' => (string) ($history->target_name ?? ''),
                    'deleted_at' => $this->normalizeDateValue($history->deleted_at),
                ];
            })
            ->values();

        return Inertia::render('audit/deletions', [
            'deletions' => $deletions,
        ]);
    }

    private function normalizeDateValue(mixed $value): ?string
    {
        if ($value instanceof CarbonInterface) {
            return $value->toIso8601String();
        }

        if (is_object($value) && method_exists($value, 'toDateTime')) {
            return Carbon::instance($value->toDateTime())->toIso8601String();
        }

        if (is_string($value) && $value !== '') {
            try {
                return Carbon::parse($value)->toIso8601String();
            } catch (\Throwable) {
                return null;
            }
        }

        return null;
    }
}
