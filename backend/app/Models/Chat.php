<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Chat extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_id',
        'user1_id',
        'user2_id',
        'mode',
        'queue_type',
        'status',
        'started_at',
        'ended_at',
        'duration_seconds',
        'ended_by',
        'end_reason',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function user1()
    {
        return $this->belongsTo(User::class, 'user1_id');
    }

    public function user2()
    {
        return $this->belongsTo(User::class, 'user2_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function reports()
    {
        return $this->hasMany(Report::class);
    }

    public function getOtherUser($userId)
    {
        return $this->user1_id === $userId ? $this->user2 : $this->user1;
    }

    public function endChat($endedBy = null, $reason = null)
    {
        $this->update([
            'status' => 'ended',
            'ended_at' => now(),
            'ended_by' => $endedBy,
            'end_reason' => $reason,
            'duration_seconds' => $this->started_at ? now()->diffInSeconds($this->started_at) : 0,
        ]);

        $this->user1->update(['status' => 'online']);
        $this->user2->update(['status' => 'online']);
    }
}