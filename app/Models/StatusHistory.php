<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class StatusHistory extends Model
{
    protected $connection = 'mongodb';

    protected $table = 'statushistories';

    protected $fillable = [
        'inquiry_id',
        'status',
        'notes',
        'change_at',
        'moved_by_name',
        'moved_by_email',
    ];
}
