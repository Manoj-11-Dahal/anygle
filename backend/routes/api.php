<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\SignalingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::get('/dashboard/public', [DashboardController::class, 'publicStats']);

// Auth routes
Route::post('/auth/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/auth/heartbeat', [AuthController::class, 'heartbeat']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Chat
    Route::post('/chat/match', [ChatController::class, 'startMatching']);
    Route::get('/chat/check', [ChatController::class, 'checkMatch']);
    Route::post('/chat/cancel', [ChatController::class, 'cancelMatching']);
    Route::get('/chat/{chatId}/messages', [ChatController::class, 'getMessages']);
    Route::post('/chat/{chatId}/message', [ChatController::class, 'sendMessage']);
    Route::post('/chat/{chatId}/skip', [ChatController::class, 'skipChat']);
    Route::post('/chat/{chatId}/report', [ChatController::class, 'report']);

    // WebRTC Signaling
    Route::post('/chat/{chatId}/offer', [SignalingController::class, 'sendOffer']);
    Route::post('/chat/{chatId}/answer', [SignalingController::class, 'sendAnswer']);
    Route::post('/chat/{chatId}/ice', [SignalingController::class, 'sendIceCandidate']);
});

// Admin routes (would need admin middleware)
Route::middleware(['auth:sanctum'])->prefix('admin')->group(function () {
    Route::get('/stats', [DashboardController::class, 'adminStats']);
    Route::get('/moderation/queue', [DashboardController::class, 'moderationQueue']);
    Route::post('/moderation/{messageId}', [DashboardController::class, 'updateModeration']);
});