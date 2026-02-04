<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Message;
use App\Models\Report;
use App\Models\Stat;
use App\Models\User;
use App\Services\MatchingQueueService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class DashboardController extends Controller
{
    protected $matchingService;

    public function __construct(MatchingQueueService $matchingService)
    {
        $this->matchingService = $matchingService;
    }

    public function publicStats()
    {
        $queueStats = $this->matchingService->getQueueStats();
        
        $onlineUsers = User::where('status', '!=', 'offline')
            ->where('last_active', '>=', now()->subMinutes(5))
            ->count();

        $activeChats = Chat::where('status', 'active')->count();
        
        $todayStats = Stat::today();

        // Get top interests from active users
        $users = User::where('status', '!=', 'offline')
            ->whereNotNull('interests')
            ->get();

        $interestCounts = [];
        foreach ($users as $user) {
            foreach ($user->interests ?? [] as $interest) {
                $interestCounts[$interest] = ($interestCounts[$interest] ?? 0) + 1;
            }
        }
        arsort($interestCounts);
        $topInterests = array_slice($interestCounts, 0, 8, true);

        // Recent connections (mock data - in production, query actual recent chats)
        $recentConnections = [];
        $regions = ['US', 'EU', 'ASIA', 'SA'];
        $types = ['Video', 'Text', 'Voice'];
        
        for ($i = 0; $i < 5; $i++) {
            $recentConnections[] = [
                'time' => now()->subMinutes($i * 2 + rand(1, 5))->format('H:i'),
                'type' => $types[array_rand($types)],
                'region' => $regions[array_rand($regions)],
            ];
        }

        return response()->json([
            'total_online' => $onlineUsers,
            'in_queue' => $queueStats['total'],
            'active_chats' => $activeChats,
            'queue_breakdown' => [
                'moderated' => $queueStats['moderated'],
                'unmoderated' => $queueStats['unmoderated'],
            ],
            'mode_breakdown' => [
                'video' => $queueStats['video'],
                'voice' => $queueStats['voice'],
                'text' => $queueStats['text'],
            ],
            'today_stats' => [
                'total_chats' => $todayStats->total_chats,
                'total_messages' => $todayStats->total_messages,
                'avg_duration' => $todayStats->avg_chat_duration,
            ],
            'top_interests' => collect($topInterests)->map(function($count, $name) {
                return ['name' => $name, 'count' => $count];
            })->values(),
            'recent_connections' => $recentConnections,
            'updated_at' => now()->toISOString(),
        ]);
    }

    public function adminStats(Request $request)
    {
        // This would be protected by admin middleware
        $today = now()->toDateString();
        
        $stats = [
            'users' => [
                'total' => User::count(),
                'online' => User::where('status', '!=', 'offline')->count(),
                'active_today' => User::whereDate('last_active', $today)->count(),
                'by_category' => [
                    'teen' => User::where('age_category', 'teen')->count(),
                    'adult' => User::where('age_category', 'adult')->count(),
                ],
            ],
            'chats' => [
                'total' => Chat::count(),
                'active' => Chat::where('status', 'active')->count(),
                'today' => Chat::whereDate('created_at', $today)->count(),
                'avg_duration' => Chat::whereNotNull('duration_seconds')->avg('duration_seconds') ?? 0,
            ],
            'messages' => [
                'total' => Message::count(),
                'today' => Message::whereDate('sent_at', $today)->count(),
                'flagged' => Message::whereIn('moderation_status', ['flagged', 'blocked'])->count(),
                'pending_review' => Message::where('moderation_status', 'flagged')->count(),
            ],
            'reports' => [
                'total' => Report::count(),
                'pending' => Report::where('status', 'pending')->count(),
                'today' => Report::whereDate('created_at', $today)->count(),
                'by_reason' => Report::whereDate('created_at', $today)
                    ->selectRaw('reason, count(*) as count')
                    ->groupBy('reason')
                    ->pluck('count', 'reason'),
            ],
            'queue' => $this->matchingService->getQueueStats(),
        ];

        return response()->json($stats);
    }

    public function moderationQueue()
    {
        // This would be protected by admin middleware
        $flaggedMessages = Message::with(['chat', 'sender'])
            ->where('moderation_status', 'flagged')
            ->orderBy('toxicity_score', 'desc')
            ->limit(50)
            ->get()
            ->map(function($msg) {
                return [
                    'id' => $msg->id,
                    'content' => $msg->content,
                    'sender_id' => $msg->sender->anonymous_id,
                    'toxicity_score' => $msg->toxicity_score,
                    'flags' => $msg->flags,
                    'sent_at' => $msg->sent_at,
                    'chat_id' => $msg->chat->chat_id,
                ];
            });

        return response()->json([
            'flagged_messages' => $flaggedMessages,
            'total_pending' => Message::where('moderation_status', 'flagged')->count(),
        ]);
    }

    public function updateModeration(Request $request, $messageId)
    {
        $validated = $request->validate([
            'action' => 'required|in:approve,block,escalate',
        ]);

        $message = Message::findOrFail($messageId);

        switch ($validated['action']) {
            case 'approve':
                $message->update(['moderation_status' => 'approved']);
                break;
            case 'block':
                $message->update([
                    'moderation_status' => 'blocked',
                    'content' => '[Message removed by moderator]',
                ]);
                break;
            case 'escalate':
                // Send to admin review
                break;
        }

        return response()->json(['status' => 'updated']);
    }
}