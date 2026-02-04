<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_start_matching(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/chat/match', [
                'mode' => 'text',
                'queue_type' => 'moderated',
                'interests' => [],
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['status']);
    }

    public function test_unauthenticated_user_cannot_start_matching(): void
    {
        $response = $this->postJson('/api/chat/match', [
            'mode' => 'text',
            'queue_type' => 'moderated',
        ]);

        $response->assertStatus(401);
    }
}
