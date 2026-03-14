<?php

namespace App\Http\Controllers;

use App\Models\DeleteHistory;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AdminListController extends Controller
{
    public function __invoke(): Response
    {
        $users = User::query()
            ->orderByDesc('created_at')
            ->get()
            ->map(function (User $user): array {
                $createdAt = $user->created_at instanceof Carbon
                    ? $user->created_at->toIso8601String()
                    : null;

                return [
                    'id' => (string) $user->getAuthIdentifier(),
                    'firstname' => (string) ($user->firstname ?? ''),
                    'lastname' => (string) ($user->lastname ?? ''),
                    'name' => (string) ($user->name ?? ''),
                    'email' => (string) ($user->email ?? ''),
                    'phone_user' => (string) ($user->phone_user ?? ''),
                    'address' => (string) ($user->address ?? ''),
                    'avatar_url' => $user->avatar
                        ? Storage::disk('public')->url((string) $user->avatar)
                        : null,
                    'role' => (string) ($user->role ?? ''),
                    'status' => (string) ($user->status ?? ''),
                    'created_at' => $createdAt,
                ];
            })
            ->values();

        return Inertia::render('admin-list', [
            'users' => $users,
        ]);
    }

    public function updateStatus(Request $request, string $userId): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:Active,Inactive'],
        ]);

        $user = User::query()->findOrFail($userId);
        $user->status = $validated['status'];
        $user->save();

        return back();
    }

    public function updateRole(Request $request, string $userId): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'in:Admin,Superadmin'],
        ]);

        $user = User::query()->findOrFail($userId);
        $user->role = $validated['role'];
        $user->save();

        return back();
    }

    public function destroy(Request $request, string $userId): RedirectResponse
    {
        $user = User::query()->findOrFail($userId);

        $actor = $request->user();
        $actorName = trim(implode(' ', array_filter([
            (string) ($actor->firstname ?? ''),
            (string) ($actor->lastname ?? ''),
        ])));

        $targetName = trim(implode(' ', array_filter([
            (string) ($user->firstname ?? ''),
            (string) ($user->lastname ?? ''),
        ])));

        DeleteHistory::query()->create([
            'entity_type' => 'User',
            'target_id' => (string) $user->getAuthIdentifier(),
            'target_code' => $this->normalizeRoleLabel((string) ($user->role ?? '')),
            'target_name' => $targetName !== '' ? $targetName : (string) ($user->name ?? ''),
            'target_email' => (string) ($user->email ?? ''),
            'deleted_by_name' => $actorName !== '' ? $actorName : (string) ($actor->name ?? ''),
            'deleted_by_email' => (string) ($actor->email ?? ''),
            'deleted_at' => Carbon::now(),
        ]);

        $user->delete();

        return back();
    }

    private function normalizeRoleLabel(string $role): string
    {
        $normalized = trim(mb_strtolower($role));

        return match ($normalized) {
            'superadmin', 'super_admin' => 'Superadmin',
            'admin' => 'Admin',
            default => '',
        };
    }
}
