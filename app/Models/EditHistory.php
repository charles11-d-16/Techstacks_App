<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class EditHistory extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'edit_histories';

    protected $fillable = [
        'inquiry_id',
        'moved_by_name',
        'moved_by_email',
        'edited_at',
    ];
}
