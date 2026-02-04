<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'anonymous_id' => Str::random(16),
            'age_category' => fake()->randomElement(['teen', 'adult']),
            'age' => fake()->numberBetween(13, 50),
            'interests' => fake()->randomElements(['gaming', 'music', 'movies', 'tech'], 2),
            'status' => 'online',
            'last_active' => now(),
            'ip_address' => fake()->ipv4(),
            'country_code' => fake()->countryCode(),
        ];
    }
}
