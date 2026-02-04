<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;

class SignalingController extends Controller
{
    public function sendOffer(Request $request, $chatId)
    {
        $validated = $request->validate([
            'offer' => 'required|array',
            'offer.type' => 'required|string',
            'offer.sdp' => 'required|string',
        ]);

        $user = $request->user();
        $chat = $this->getChat($user, $chatId);

        $partner = $chat->getOtherUser($user->id);

        broadcast(new \App\Events\WebRtcSignal($chat, $partner->id, [
            'type' => 'offer',
            'offer' => $validated['offer'],
            'from' => $user->anonymous_id,
        ]))->toOthers();

        return response()->json(['status' => 'sent']);
    }

    public function sendAnswer(Request $request, $chatId)
    {
        $validated = $request->validate([
            'answer' => 'required|array',
            'answer.type' => 'required|string',
            'answer.sdp' => 'required|string',
        ]);

        $user = $request->user();
        $chat = $this->getChat($user, $chatId);

        $partner = $chat->getOtherUser($user->id);

        broadcast(new \App\Events\WebRtcSignal($chat, $partner->id, [
            'type' => 'answer',
            'answer' => $validated['answer'],
            'from' => $user->anonymous_id,
        ]))->toOthers();

        return response()->json(['status' => 'sent']);
    }

    public function sendIceCandidate(Request $request, $chatId)
    {
        $validated = $request->validate([
            'candidate' => 'required|array',
        ]);

        $user = $request->user();
        $chat = $this->getChat($user, $chatId);

        $partner = $chat->getOtherUser($user->id);

        broadcast(new \App\Events\WebRtcSignal($chat, $partner->id, [
            'type' => 'ice-candidate',
            'candidate' => $validated['candidate'],
            'from' => $user->anonymous_id,
        ]))->toOthers();

        return response()->json(['status' => 'sent']);
    }

    protected function getChat($user, $chatId)
    {
        return Chat::where('chat_id', $chatId)
            ->where(function($q) use ($user) {
                $q->where('user1_id', $user->id)->orWhere('user2_id', $user->id);
            })
            ->where('status', 'active')
            ->firstOrFail();
    }
}