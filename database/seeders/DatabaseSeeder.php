<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::updateOrCreate(
            ['email' => 'techstacks_2026@gmail.com'],
            [
                'name' => 'Techstacks Admin',
                'email' => 'techstacks_2026@gmail.com',
                'password' => Hash::make('password1234'),
                'role' => 'Superadmin',
                'status' => 'Active',
            ],
        );
    }
}
