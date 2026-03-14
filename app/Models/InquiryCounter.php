<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class InquiryCounter extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'inquirycounters';

    protected $primaryKey = '_id';

    public $incrementing = false;

    protected $keyType = 'string';
}
