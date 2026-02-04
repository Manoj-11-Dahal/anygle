<?php

namespace App\Events;

use App\Models\Chat;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MatchFound implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $chat;
    public $userId;

    public function __construct(Chat $chat, $userId)
    {
        $this->chat = $chat;
        $this->userId = $userId;
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->userId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'match.found';
    }

    public function broadcastWith(): array
    {
        $user = $this->chat->user1_id === $this->userId ? $this->chat->user2 : $this->chat->user1;
        $currentUser = $this->chat->user1_id === $this->userId ? $this->chat->user1 : $this->chat->user2;

        return [
            'chat_id' => $this->chat->chat_id,
            'partner' => [
                'id' => $user->anonymous_id,
                'interests' => array_intersect($currentUser->interests ?? [], $user->interests ?? []),
            ],
            'mode' => $this->chat->mode,
            'queue_type' => $this->chat->queue_type,
            'started_at' => $this->chat->started_at->toISOString(),
        ];
    }
}