import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Quiz from '../views/Quiz.vue'
import Result from '../views/Result.vue'
import Dashboard from '../views/Dashboard.vue'
import Settings from '../views/Settings.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/quiz', name: 'quiz', component: Quiz },
    { path: '/result', name: 'result', component: Result },
    { path: '/dashboard', name: 'dashboard', component: Dashboard },
    // exceljsを内包するため、訪問時にのみ読み込むよう分割する（仕様書5.6.3節）
    { path: '/import', name: 'import', component: () => import('../views/Import.vue') },
    { path: '/settings', name: 'settings', component: Settings },
  ],
})
