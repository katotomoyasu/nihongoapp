<script setup lang="ts">
import { APP_VERSION } from './version'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink to="/" class="brand">日本語教師試験 対策問題</RouterLink>
      <div class="header-right">
        <nav class="nav">
          <RouterLink to="/dashboard">成績</RouterLink>
          <RouterLink to="/import">問題を取り込む</RouterLink>
          <RouterLink to="/settings">設定</RouterLink>
        </nav>
        <span class="version">v{{ APP_VERSION }}</span>
      </div>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e2e2;
}
.brand {
  font-weight: 700;
  text-decoration: none;
  color: inherit;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.nav {
  display: flex;
  gap: 1rem;
}
.nav a {
  text-decoration: none;
  color: inherit;
}
.version {
  font-size: 0.75rem;
  color: #999;
}
.app-main {
  flex: 1;
  padding: 1rem;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}
</style>
