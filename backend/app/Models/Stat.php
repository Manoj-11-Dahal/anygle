<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Stat extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'total_users',
        'active_users',
        'total_chats',
        'total_messages',
        'reports_received',
        'reports_actioned',
        'avg_chat_duration',
        'mode_breakdown',
        'age_category_breakdown',
        'top_interests',
    ];

    protected $casts = [
        'date' => 'date',
        'mode_breakdown' => 'array',
        'age_category_breakdown' => 'array',
        'top_interests' => 'array',
    ];

    public static function today()
    {
        return self::firstOrCreate(
            ['date' => now()->toDateString()],
            [
                'total_users' => 0,
                'active_users' => 0,
                'total_chats' => 0,
                'total_messages' => 0,
                'reports_received' => 0,
                'reports_actioned' => 0,
                'avg_chat_duration' => 0,
                'mode_breakdown' => ['video' => 0, 'voice' => 0, 'text' => 0],
                'age_category_breakdown' => ['teen' => 0, 'adult' => 0],
                'top_interests' => [],
            ]
        );
    }

    public static function incrementStat($field, $value = 1)
    {
        $stat = self::today();
        $stat->increment($field, $value);
        return $stat;
    }

    public static function updateModeBreakdown($mode)
    {
        $stat = self::today();
        $breakdown = $stat->mode_breakdown ?? ['video' => 0, 'voice' => 0, 'text' => 0];
        $breakdown[$mode] = ($breakdown[$mode] ?? 0) + 1;
        $stat->update(['mode_breakdown' => $breakdown]);
        return $stat;
    }
}