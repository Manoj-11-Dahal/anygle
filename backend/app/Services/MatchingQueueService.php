<?php

namespace App\Services;

use App\Models\User;
use App\Models\Chat;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class MatchingQueueService
{
    const QUEUE_PREFIX = 'anygle:queue:';
    const USER_PREFIX = 'anygle:user:';
    const MATCH_TIMEOUT = 30;

    public function addToQueue($userId, $preferences)
    {
        $user = User::find($userId);
        if (!$user) return false;

        $queueKey = $this->getQueueKey($preferences);
        $userData = [
            'user_id' => $userId,
            'age_category' => $preferences['ageCategory'],
            'mode' => $preferences['mode'],
            'queue_type' => $preferences['queueType'] ?? 'moderated',
            'interests' => $preferences['interests'] ?? [],
            'joined_at' => now()->timestamp,
        ];

        Redis::hset(self::QUEUE_PREFIX . 'users', $userId, json_encode($userData));
        Redis::zadd($queueKey, now()->timestamp, $userId);
        Redis::expire($queueKey, 3600);

        $user->update(['status' => 'matching']);

        return $this->tryMatch($userId, $preferences);
    }

    public function removeFromQueue($userId)
    {
        $user = User::find($userId);
        if (!$user) return;

        $queueTypes = ['moderated', 'unmoderated'];
        $modes = ['video', 'voice', 'text'];
        $categories = ['teen', 'adult'];

        foreach ($queueTypes as $queueType) {
            foreach ($modes as $mode) {
                foreach ($categories as $category) {
                    $queueKey = self::QUEUE_PREFIX . "{$queueType}:{$mode}:{$category}";
                    Redis::zrem($queueKey, $userId);
                }
            }
        }

        Redis::hdel(self::QUEUE_PREFIX . 'users', $userId);
        $user->update(['status' => 'online']);
    }

    public function tryMatch($userId, $preferences)
    {
        $queueKey = $this->getQueueKey($preferences);
        $potentialMatches = Redis::zrange($queueKey, 0, 50);

        $userData = json_decode(Redis::hget(self::QUEUE_PREFIX . 'users', $userId), true);
        
        foreach ($potentialMatches as $matchId) {
            if ($matchId == $userId) continue;

            $matchData = json_decode(Redis::hget(self::QUEUE_PREFIX . 'users', $matchId), true);
            if (!$matchData) continue;

            if ($this->isCompatible($userData, $matchData)) {
                return $this->createMatch($userId, $matchId, $preferences);
            }
        }

        return null;
    }

    protected function isCompatible($user1, $user2)
    {
        if ($user1['age_category'] !== $user2['age_category']) {
            return false;
        }

        if ($user1['mode'] !== $user2['mode']) {
            return false;
        }

        if ($user1['queue_type'] !== $user2['queue_type']) {
            return false;
        }

        if (!empty($user1['interests']) && !empty($user2['interests'])) {
            $common = array_intersect($user1['interests'], $user2['interests']);
            if (empty($common)) {
                return false;
            }
        }

        return true;
    }

    protected function createMatch($user1Id, $user2Id, $preferences)
    {
        $this->removeFromQueue($user1Id);
        $this->removeFromQueue($user2Id);

        $chatId = Str::random(32);
        
        $chat = Chat::create([
            'chat_id' => $chatId,
            'user1_id' => $user1Id,
            'user2_id' => $user2Id,
            'mode' => $preferences['mode'],
            'queue_type' => $preferences['queueType'] ?? 'moderated',
            'status' => 'active',
            'started_at' => now(),
        ]);

        User::whereIn('id', [$user1Id, $user2Id])->update(['status' => 'chatting']);

        Redis::hset(self::USER_PREFIX . $user1Id, 'current_chat', $chatId);
        Redis::hset(self::USER_PREFIX . $user2Id, 'current_chat', $chatId);
        Redis::expire(self::USER_PREFIX . $user1Id, 7200);
        Redis::expire(self::USER_PREFIX . $user2Id, 7200);

        broadcast(new \App\Events\MatchFound($chat, $user1Id));
        broadcast(new \App\Events\MatchFound($chat, $user2Id));

        return $chat;
    }

    public function getCurrentChat($userId)
    {
        $chatId = Redis::hget(self::USER_PREFIX . $userId, 'current_chat');
        if (!$chatId) return null;

        return Chat::where('chat_id', $chatId)->where('status', 'active')->first();
    }

    protected function getQueueKey($preferences)
    {
        $queueType = $preferences['queueType'] ?? 'moderated';
        $mode = $preferences['mode'] ?? 'text';
        $category = $preferences['ageCategory'] ?? 'adult';
        
        return self::QUEUE_PREFIX . "{$queueType}:{$mode}:{$category}";
    }

    public function getQueueStats()
    {
        $queueTypes = ['moderated', 'unmoderated'];
        $modes = ['video', 'voice', 'text'];
        $categories = ['teen', 'adult'];
        
        $stats = [
            'total' => 0,
            'moderated' => 0,
            'unmoderated' => 0,
            'video' => 0,
            'voice' => 0,
            'text' => 0,
        ];

        foreach ($queueTypes as $queueType) {
            foreach ($modes as $mode) {
                foreach ($categories as $category) {
                    $queueKey = self::QUEUE_PREFIX . "{$queueType}:{$mode}:{$category}";
                    $count = Redis::zcard($queueKey);
                    $stats['total'] += $count;
                    $stats[$queueType] += $count;
                    $stats[$mode] += $count;
                }
            }
        }

        return $stats;
    }

    public function cleanupStaleUsers()
    {
        $users = Redis::hgetall(self::QUEUE_PREFIX . 'users');
        $now = now()->timestamp;
        $timeout = 300; // 5 minutes

        foreach ($users as $userId => $userData) {
            $data = json_decode($userData, true);
            if (($now - $data['joined_at']) > $timeout) {
                $this->removeFromQueue($userId);
            }
        }
    }
}