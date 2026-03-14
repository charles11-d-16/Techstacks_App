<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Inquiry extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'inquiries';
}

