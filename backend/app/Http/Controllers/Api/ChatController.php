<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Message;
use App\Services\MatchingQueueService;
use App\Services\ModerationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;

class ChatController extends Controller
{
    protected $matchingService;
    protected $moderationService;

    public function __construct(MatchingQueueService $matchingService, ModerationService $moderationService)
    {
        $this->matchingService = $matchingService;
        $this->moderationService = $moderationService;
    }

    public function startMatching(Request $request)
    {
        $validated = $request->validate([
            'mode' => 'required|in:video,voice,text',
            'queue_type' => 'required|in:moderated,unmoderated',
            'interests' => 'nullable|array|max:5',
        ]);

        $user = $request->user();

        // Check if already in chat
        $currentChat = $this->matchingService->getCurrentChat($user->id);
        if ($currentChat) {
            return response()->json([
                'status' => 'matched',
                'chat' => [
                    'chat_id' => $currentChat->chat_id,
                    'partner' => [
                        'id' => $currentChat->getOtherUser($user->id)->anonymous_id,
                    ],
                    'mode' => $currentChat->mode,
                ],
            ]);
        }

        // Check if already in queue
        $queueData = $this->matchingService->tryMatch($user->id, [
            'ageCategory' => $user->age_category,
            'mode' => $validated['mode'],
            'queueType' => $validated['queue_type'],
            'interests' => $validated['interests'] ?? $user->interests ?? [],
        ]);

        if ($queueData) {
            $chat = $queueData;
            $partner = $chat->getOtherUser($user->id);

            return response()->json([
                'status' => 'matched',
                'chat' => [
                    'chat_id' => $chat->chat_id,
                    'partner' => [
                        'id' => $partner->anonymous_id,
                        'interests' => array_intersect($user->interests ?? [], $partner->interests ?? []),
                    ],
                    'mode' => $chat->mode,
                    'queue_type' => $chat->queue_type,
                    'started_at' => $chat->started_at,
                ],
            ]);
        }

        // Add to queue
        $this->matchingService->addToQueue($user->id, [
            'ageCategory' => $user->age_category,
            'mode' => $validated['mode'],
            'queueType' => $validated['queue_type'],
            'interests' => $validated['interests'] ?? $user->interests ?? [],
        ]);

        return response()->json([
            'status' => 'searching',
            'message' => 'Looking for a match...',
        ]);
    }

    public function checkMatch(Request $request)
    {
        $user = $request->user();
        
        $chat = $this->matchingService->getCurrentChat($user->id);
        
        if ($chat) {
            $partner = $chat->getOtherUser($user->id);
            
            return response()->json([
                'status' => 'matched',
                'chat' => [
                    'chat_id' => $chat->chat_id,
                    'partner' => [
                        'id' => $partner->anonymous_id,
                        'interests' => array_intersect($user->interests ?? [], $partner->interests ?? []),
                    ],
                    'mode' => $chat->mode,
                    'queue_type' => $chat->queue_type,
                    'started_at' => $chat->started_at,
                ],
            ]);
        }

        return response()->json([
            'status' => 'searching',
        ]);
    }

    public function cancelMatching(Request $request)
    {
        $user = $request->user();
        $this->matchingService->removeFromQueue($user->id);

        return response()->json([
            'status' => 'cancelled',
        ]);
    }

    public function sendMessage(Request $request, $chatId)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:1000',
        ]);

        $user = $request->user();
        
        $chat = Chat::where('chat_id', $chatId)
            ->where(function($q) use ($user) {
                $q->where('user1_id', $user->id)->orWhere('user2_id', $user->id);
            })
            ->where('status', 'active')
            ->firstOrFail();

        $message = Message::create([
            'chat_id' => $chat->id,
            'sender_id' => $user->id,
            'content' => $validated['content'],
            'type' => 'text',
            'sent_at' => now(),
        ]);

        // Run moderation
        $analysis = $this->moderationService->moderateMessage($message);

        if ($analysis['status'] === 'blocked') {
            $message->update(['content' => '[Message removed by moderation]']);
        }

        $partner = $chat->getOtherUser($user->id);

        broadcast(new \App\Events\NewMessage($message, $partner->id))->toOthers();

        return response()->json([
            'message' => [
                'id' => $message->id,
                'content' => $message->content,
                'sender' => 'You',
                'type' => $message->type,
                'timestamp' => $message->sent_at,
            ],
            'moderation' => [
                'status' => $analysis['status'],
                'warning' => $analysis['status'] === 'flagged' ? $this->moderationService->getSafetyMessage($analysis['flags']) : null,
            ],
        ]);
    }

    public function getMessages(Request $request, $chatId)
    {
        $user = $request->user();
        
        $chat = Chat::where('chat_id', $chatId)
            ->where(function($q) use ($user) {
                $q->where('user1_id', $user->id)->orWhere('user2_id', $user->id);
            })
            ->firstOrFail();

        $messages = $chat->messages()
            ->whereIn('moderation_status', ['approved', 'pending'])
            ->orderBy('sent_at', 'asc')
            ->get()
            ->map(function($msg) use ($user) {
                return [
                    'id' => $msg->id,
                    'content' => $msg->content,
                    'sender' => $msg->sender_id === $user->id ? 'You' : 'Stranger',
                    'type' => $msg->type,
                    'timestamp' => $msg->sent_at,
                ];
            });

        return response()->json(['messages' => $messages]);
    }

    public function skipChat(Request $request, $chatId)
    {
        $user = $request->user();
        
        $chat = Chat::where('chat_id', $chatId)
            ->where(function($q) use ($user) {
                $q->where('user1_id', $user->id)->orWhere('user2_id', $user->id);
            })
            ->where('status', 'active')
            ->firstOrFail();

        $chat->endChat($user->anonymous_id, 'skipped');

        return response()->json([
            'status' => 'ended',
            'message' => 'You skipped the chat',
        ]);
    }

    public function report(Request $request, $chatId)
    {
        $validated = $request->validate([
            'reason' => 'required|in:harassment,sexual_content,minor_safety,hate_speech,violence,spam,other',
            'details' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        
        $chat = Chat::where('chat_id', $chatId)
            ->where(function($q) use ($user) {
                $q->where('user1_id', $user->id)->orWhere('user2_id', $user->id);
            })
            ->firstOrFail();

        $reportedUser = $chat->getOtherUser($user->id);

        $report = \App\Models\Report::create([
            'chat_id' => $chat->id,
            'reporter_id' => $user->id,
            'reported_id' => $reportedUser->id,
            'reason' => $validated['reason'],
            'details' => $validated['details'],
            'status' => 'pending',
        ]);

        $chat->update(['status' => 'reported']);

        return response()->json([
            'status' => 'reported',
            'message' => 'Thank you for your report. We will review it shortly.',
        ]);
    }
}