<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'firstname' => ['required', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'phone_user' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:255'],
            'avatar' => ['nullable', 'image', 'max:2048'],
            'email' => $this->emailRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        $avatarPath = null;
        if (($input['avatar'] ?? null) instanceof UploadedFile) {
            $avatarPath = $input['avatar']->store('avatars', 'public');
        }

        return User::create([
            'name' => trim($input['firstname'].' '.$input['lastname']),
            'firstname' => $input['firstname'],
            'lastname' => $input['lastname'],
            'email' => $input['email'],
            'phone_user' => $input['phone_user'],
            'address' => $input['address'],
            'avatar' => $avatarPath,
            'role' => 'Admin',
            'status' => 'Inactive',
            'password' => $input['password'],
        ]);
    }
}
