<?php

use App\Http\Controllers\AdminListController;
use App\Http\Controllers\AuditTrailController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LeadInquiryController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('dashboard/export', [DashboardController::class, 'export'])->name('dashboard.export');
    Route::get('admin-list', AdminListController::class)->name('admin-list');
    Route::get('audit-trail/login-history', [AuditTrailController::class, 'logins'])
        ->name('audit-trail.logins');
    Route::get('audit-trail/change-history', [AuditTrailController::class, 'changes'])
        ->name('audit-trail.changes');
    Route::get('audit-trail/deletion-history', [AuditTrailController::class, 'deletions'])
        ->name('audit-trail.deletions');
    Route::patch('admin-list/{userId}/status', [AdminListController::class, 'updateStatus'])
        ->name('admin-list.update-status');
    Route::patch('admin-list/{userId}/role', [AdminListController::class, 'updateRole'])
        ->name('admin-list.update-role');
    Route::delete('admin-list/{userId}', [AdminListController::class, 'destroy'])
        ->name('admin-list.destroy');
    Route::get('leads/inquiries/{statusKey}', LeadInquiryController::class)
        ->whereIn('statusKey', ['new-inquiry', 'contacted', 'in-progress', 'completed', 'cancelled'])
        ->name('leads.inquiries.status');
    Route::get('leads/inquiries/add', [LeadInquiryController::class, 'create'])
        ->name('leads.inquiries.create');
    Route::post('leads/inquiries/add', [LeadInquiryController::class, 'store'])
        ->name('leads.inquiries.store');
    Route::get('leads/inquiries/import-template', [LeadInquiryController::class, 'downloadImportTemplate'])
        ->name('leads.inquiries.import-template');
    Route::post('leads/inquiries/import', [LeadInquiryController::class, 'import'])
        ->name('leads.inquiries.import');
    Route::get('leads/inquiries/{inquiryId}', [LeadInquiryController::class, 'show'])
        ->name('leads.inquiries.show');
    Route::get('leads/inquiries/{inquiryId}/edit', [LeadInquiryController::class, 'edit'])
        ->name('leads.inquiries.edit');
    Route::patch('leads/inquiries/{inquiryId}', [LeadInquiryController::class, 'update'])
        ->name('leads.inquiries.update');
    Route::delete('leads/inquiries/bulk-delete', [LeadInquiryController::class, 'destroyMany'])
        ->name('leads.inquiries.destroy-many');
    Route::delete('leads/inquiries/{inquiryId}', [LeadInquiryController::class, 'destroy'])
        ->name('leads.inquiries.destroy');
    Route::patch('leads/inquiries/{inquiryId}/move', [LeadInquiryController::class, 'move'])
        ->name('leads.inquiries.move');
});

require __DIR__.'/settings.php';
