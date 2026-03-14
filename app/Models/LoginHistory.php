<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class LoginHistory extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'login_histories';

    protected $fillable = [
        'userId',
        'email',
        'name',
    ];
}
