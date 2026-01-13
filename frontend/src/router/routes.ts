
import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      // { path: '', name: 'test', component: () => import('pages/testPage.vue') },
    ]
  },
  {
    path: '/:catchAll(.*)*',
    component: { template: '<div class="q-pa-md">Страница не найдена</div>' }
  }
];

export default routes;