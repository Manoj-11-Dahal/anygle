<?php

namespace App\Services;

use App\Models\Message;
use App\Models\Chat;
use Illuminate\Support\Facades\Log;

class ModerationService
{
    protected $toxicPatterns = [
        'hate_speech' => [
            '/\b(nigger|nigga|chink|fag|faggot|kike|wetback)\b/i',
            '/\b(white power|heil hitler|race war)\b/i',
        ],
        'sexual_content' => [
            '/\b(nude|naked|sex|sexy|horny|cum|dick|cock|pussy|tits|boobs)\b/i',
            '/(send nudes?|show me|trade pics|cam show)/i',
            '/\b(masturbate|masturbating|jerk off|touch yourself)\b/i',
        ],
        'harassment' => [
            '/\b(kill yourself|kys|die|hope you die)\b/i',
            '/\b(ugly|fat|stupid|retard|loser)\b/i',
        ],
        'minor_safety' => [
            '/\b(13|14|15|16|17)\s*(year old|yo|years?)/i',
            '/(asr|age sex location)/i',
            '/\b(cyber|meet up|come over)\b/i',
        ],
        'personal_info' => [
            '/\b\d{3}-\d{2}-\d{4}\b/', // SSN
            '/\b\d{10,11}\b/', // Phone numbers
            '/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', // Emails
        ],
    ];

    protected $toxicityWeights = [
        'hate_speech' => 0.95,
        'sexual_content' => 0.70,
        'harassment' => 0.80,
        'minor_safety' => 0.90,
        'personal_info' => 0.60,
    ];

    public function analyzeMessage($content)
    {
        $flags = [];
        $maxScore = 0.0;

        foreach ($this->toxicPatterns as $category => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $content)) {
                    $flags[] = $category;
                    $maxScore = max($maxScore, $this->toxicityWeights[$category]);
                }
            }
        }

        $flags = array_unique($flags);
        
        $status = 'approved';
        if ($maxScore >= 0.90) {
            $status = 'blocked';
        } elseif ($maxScore >= 0.70) {
            $status = 'flagged';
        } elseif ($maxScore > 0) {
            $status = 'pending';
        }

        return [
            'status' => $status,
            'score' => round($maxScore, 2),
            'flags' => $flags,
        ];
    }

    public function moderateMessage(Message $message)
    {
        $analysis = $this->analyzeMessage($message->content);
        
        $message->update([
            'moderation_status' => $analysis['status'],
            'toxicity_score' => $analysis['score'],
            'flags' => $analysis['flags'],
        ]);

        if ($analysis['status'] === 'blocked') {
            Log::warning('Message blocked by moderation', [
                'message_id' => $message->id,
                'flags' => $analysis['flags'],
                'score' => $analysis['score'],
            ]);

            if (in_array('minor_safety', $analysis['flags'])) {
                $this->escalateToAdmin($message);
            }
        }

        return $analysis;
    }

    public function shouldBlockChat(Chat $chat)
    {
        $flaggedMessages = $chat->messages()
            ->whereIn('moderation_status', ['flagged', 'blocked'])
            ->count();

        $totalMessages = $chat->messages()->count();

        if ($totalMessages < 5) return false;

        $flagRatio = $flaggedMessages / $totalMessages;
        
        return $flagRatio > 0.5 || $flaggedMessages >= 5;
    }

    public function getSafetyMessage($flags)
    {
        if (in_array('minor_safety', $flags)) {
            return "This conversation has been flagged for safety concerns. Please keep conversations appropriate.";
        }
        
        if (in_array('hate_speech', $flags)) {
            return "Let's keep things respectful. Harassment won't be tolerated.";
        }

        if (in_array('sexual_content', $flags)) {
            return "Please keep the conversation appropriate for all users.";
        }

        return "Please be respectful and follow our community guidelines.";
    }

    protected function escalateToAdmin(Message $message)
    {
        Log::alert('CRITICAL: Minor safety violation detected', [
            'message_id' => $message->id,
            'chat_id' => $message->chat_id,
            'content' => substr($message->content, 0, 100),
        ]);

        // Could send email/SMS to admin here
        // Could auto-end chat
        // Could auto-ban user
    }

    public function filterContent($content)
    {
        $filtered = $content;
        
        $filteredWords = [
            '/\b(nigger|nigga)\b/i' => '[filtered]',
            '/\b(fag|faggot)\b/i' => '[filtered]',
            '/\b(retard)\b/i' => '[filtered]',
        ];

        foreach ($filteredWords as $pattern => $replacement) {
            $filtered = preg_replace($pattern, $replacement, $filtered);
        }

        return $filtered;
    }
}