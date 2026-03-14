<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class DeleteHistory extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'delete_histories';

    protected $fillable = [
        'entity_type',
        'target_id',
        'target_code',
        'target_name',
        'target_email',
        'deleted_by_name',
        'deleted_by_email',
        'deleted_at',
    ];
}
