<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'age_category' => 'adult',
            'age' => 25,
            'interests' => ['gaming', 'music'],
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'anonymous_id', 'age_category', 'interests'],
                'token',
            ]);
    }

    public function test_age_mismatch_detection(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'age_category' => 'teen',
            'age' => 25,
            'interests' => [],
        ]);

        $response->assertStatus(400)
            ->assertJson(['error' => 'Age mismatch with category']);
    }
}
