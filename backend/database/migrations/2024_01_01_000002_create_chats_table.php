<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('chats', function (Blueprint $table) {
            $table->id();
            $table->string('chat_id', 64)->unique();
            $table->foreignId('user1_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('user2_id')->constrained('users')->onDelete('cascade');
            $table->enum('mode', ['video', 'voice', 'text'])->default('text');
            $table->enum('queue_type', ['moderated', 'unmoderated'])->default('moderated');
            $table->enum('status', ['active', 'ended', 'reported'])->default('active');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->integer('duration_seconds')->default(0);
            $table->string('ended_by')->nullable();
            $table->text('end_reason')->nullable();
            $table->timestamps();
            
            $table->index('status');
            $table->index('chat_id');
            $table->index(['user1_id', 'user2_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chats');
    }
};