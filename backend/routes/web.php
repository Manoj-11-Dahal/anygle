<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return ['message' => 'Anygle API Server'];
});

Route::get('/health', function () {
    return [
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
        'version' => '1.0.0',
    ];
});
