<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'anonymous_id',
        'age_category',
        'age',
        'interests',
        'status',
        'last_active',
        'ip_address',
        'country_code',
    ];

    protected $casts = [
        'interests' => 'array',
        'last_active' => 'datetime',
    ];

    protected $hidden = [
        'ip_address',
    ];

    public function chatsAsUser1()
    {
        return $this->hasMany(Chat::class, 'user1_id');
    }

    public function chatsAsUser2()
    {
        return $this->hasMany(Chat::class, 'user2_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function reportsMade()
    {
        return $this->hasMany(Report::class, 'reporter_id');
    }

    public function reportsReceived()
    {
        return $this->hasMany(Report::class, 'reported_id');
    }

    public function isOnline()
    {
        return $this->status !== 'offline' && $this->last_active && $this->last_active->gt(now()->subMinutes(5));
    }

    public function getCurrentChatAttribute()
    {
        return Chat::where(function($q) {
            $q->where('user1_id', $this->id)->orWhere('user2_id', $this->id);
        })->where('status', 'active')->first();
    }
}