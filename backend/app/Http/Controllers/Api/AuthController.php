<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'age_category' => 'required|in:teen,adult',
            'age' => 'required|integer|min:13|max:100',
            'interests' => 'nullable|array|max:5',
            'interests.*' => 'string|max:50',
        ]);

        if ($validated['age_category'] === 'teen' && $validated['age'] >= 18) {
            return response()->json(['error' => 'Age mismatch with category'], 400);
        }

        if ($validated['age_category'] === 'adult' && $validated['age'] < 18) {
            return response()->json(['error' => 'Age mismatch with category'], 400);
        }

        $anonymousId = Str::random(16);

        $user = User::create([
            'anonymous_id' => $anonymousId,
            'age_category' => $validated['age_category'],
            'age' => $validated['age'],
            'interests' => $validated['interests'] ?? [],
            'status' => 'online',
            'last_active' => now(),
            'ip_address' => $request->ip(),
            'country_code' => $this->getCountryCode($request->ip()),
        ]);

        $token = $user->createToken('anygle-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'anonymous_id' => $user->anonymous_id,
                'age_category' => $user->age_category,
                'interests' => $user->interests,
                'status' => $user->status,
            ],
            'token' => $token,
        ]);
    }

    public function heartbeat(Request $request)
    {
        $user = $request->user();
        $user->update(['last_active' => now()]);

        $currentChat = $user->current_chat;

        return response()->json([
            'status' => $user->status,
            'current_chat' => $currentChat ? [
                'chat_id' => $currentChat->chat_id,
                'status' => $currentChat->status,
                'mode' => $currentChat->mode,
            ] : null,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->update(['status' => 'offline']);
        $user->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    protected function getCountryCode($ip)
    {
        // Simplified - use a real GeoIP service in production
        return 'US';
    }
}