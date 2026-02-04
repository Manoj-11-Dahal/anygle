<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_id',
        'sender_id',
        'content',
        'type',
        'moderation_status',
        'toxicity_score',
        'flags',
        'sent_at',
    ];

    protected $casts = [
        'flags' => 'array',
        'sent_at' => 'datetime',
    ];

    public function chat()
    {
        return $this->belongsTo(Chat::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function scopePending($query)
    {
        return $query->where('moderation_status', 'pending');
    }

    public function scopeFlagged($query)
    {
        return $query->where('moderation_status', 'flagged');
    }

    public function isFlagged()
    {
        return $this->moderation_status === 'flagged' || $this->moderation_status === 'blocked';
    }
}