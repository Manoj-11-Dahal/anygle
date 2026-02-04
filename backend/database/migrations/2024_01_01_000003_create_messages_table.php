<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained()->onDelete('cascade');
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->text('content');
            $table->enum('type', ['text', 'image', 'system'])->default('text');
            $table->enum('moderation_status', ['pending', 'approved', 'flagged', 'blocked'])->default('pending');
            $table->decimal('toxicity_score', 3, 2)->default(0.00);
            $table->json('flags')->nullable();
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamps();
            
            $table->index('chat_id');
            $table->index('moderation_status');
            $table->index('sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};