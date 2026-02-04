<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stats', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->integer('total_users')->default(0);
            $table->integer('active_users')->default(0);
            $table->integer('total_chats')->default(0);
            $table->integer('total_messages')->default(0);
            $table->integer('reports_received')->default(0);
            $table->integer('reports_actioned')->default(0);
            $table->integer('avg_chat_duration')->default(0);
            $table->json('mode_breakdown')->nullable();
            $table->json('age_category_breakdown')->nullable();
            $table->json('top_interests')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stats');
    }
};