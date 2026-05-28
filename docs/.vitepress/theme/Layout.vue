<template>
  <DefaultTheme.Layout>
    <template #home-hero-image>
      <HomeTerminal />
    </template>
  </DefaultTheme.Layout>
</template>

<script setup>
import DefaultTheme from 'vitepress/theme'
import HomeTerminal from './HomeTerminal.vue'
</script>
