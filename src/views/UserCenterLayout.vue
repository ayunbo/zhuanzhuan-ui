<script setup>
import { RouterView } from 'vue-router'
import UserCenterSidebar from '@/components/UserCenterSidebar.vue'
</script>

<template>
  <section class="bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
    <div class="mx-auto flex max-w-[1480px] gap-6">
      <UserCenterSidebar />

      <div class="min-w-0 flex-1">
        <RouterView />
      </div>
    </div>
  </section>
</template>
