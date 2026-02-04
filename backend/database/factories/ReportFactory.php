<?php

namespace Database\Factories;

use App\Models\Chat;
use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ReportFactory extends Factory
{
    protected $model = Report::class;

    public function definition(): array
    {
        return [
            'chat_id' => Chat::factory(),
            'reporter_id' => User::factory(),
            'reported_id' => User::factory(),
            'reason' => fake()->randomElement(['harassment', 'sexual_content', 'spam']),
            'details' => fake()->optional()->sentence(),
            'status' => 'pending',
        ];
    }
}
