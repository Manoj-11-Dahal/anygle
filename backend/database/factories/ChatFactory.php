<?php

namespace Database\Factories;

use App\Models\Chat;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ChatFactory extends Factory
{
    protected $model = Chat::class;

    public function definition(): array
    {
        return [
            'chat_id' => Str::random(32),
            'user1_id' => User::factory(),
            'user2_id' => User::factory(),
            'mode' => fake()->randomElement(['video', 'voice', 'text']),
            'queue_type' => fake()->randomElement(['moderated', 'unmoderated']),
            'status' => 'active',
            'started_at' => now(),
        ];
    }
}
