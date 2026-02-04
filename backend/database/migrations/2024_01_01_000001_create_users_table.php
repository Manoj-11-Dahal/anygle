<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('anonymous_id', 32)->unique();
            $table->enum('age_category', ['teen', 'adult'])->default('adult');
            $table->tinyInteger('age')->nullable();
            $table->json('interests')->nullable();
            $table->enum('status', ['online', 'offline', 'chatting', 'matching'])->default('offline');
            $table->timestamp('last_active')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('country_code', 2)->nullable();
            $table->timestamps();
            
            $table->index('status');
            $table->index('age_category');
            $table->index('last_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};