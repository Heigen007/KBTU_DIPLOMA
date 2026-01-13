<template>
  <q-layout view="hHh lpR fFf" class="app-shell">
    <q-header class="app-header">
      <q-toolbar class="toolbar compact-gap">
        <q-btn
          flat
          dense
          round
          icon="menu"
          class="mobile-menu-btn q-mr-sm"
          @click="drawer = !drawer"
        />
        
        <q-icon name="analytics" size="22px" class="title-icon desktop-only" />
        <div class="brand">{{ t('nav.brand') }}</div>
        
        <q-space />
        
        <!-- Десктоп навигация -->
        <div class="desktop-nav">
          <q-btn flat dense icon="test" :label="t('test.test')" to="/" class="nav-btn" />
        </div>

        <!-- Переключатель языка -->
        <q-btn flat dense round icon="language" class="q-ml-sm">
          <q-menu>
            <q-list style="min-width: 150px">
              <q-item 
                v-for="option in localeOptions" 
                :key="option.value"
                clickable 
                v-close-popup
                @click="changeLocale(option.value)"
                :active="locale === option.value"
              >
                <q-item-section>{{ option.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Мобильное меню (drawer) -->
    <q-drawer
      v-model="drawer"
      :width="280"
      :breakpoint="1024"
      bordered
      class="mobile-drawer"
    >
      <q-scroll-area class="fit">
        <div class="drawer-header">
          <q-icon name="analytics" size="32px" color="primary" />
          <div class="drawer-title">{{ t('nav.brand') }}</div>
        </div>

        <q-list padding>
          <q-item clickable v-ripple to="/" exact @click="drawer = false">
            <q-item-section avatar>
              <!-- <q-icon name="dashboard" /> -->
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ t('test.test') }}</q-item-label>
              <q-item-label caption>{{ t('test.test') }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-separator class="q-my-md" />

          <q-item>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ t('settings.language') }}</q-item-label>
              <q-select
                dense
                outlined
                v-model="locale"
                :options="localeOptions"
                emit-value
                map-options
                class="q-mt-sm"
                @update:model-value="changeLocale"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { t } from 'src/boot/i18n'
import i18n from 'src/boot/i18n'

const drawer = ref(false)
const locale = ref(i18n.global.locale.value)

type LocaleType = 'ru-RU' | 'en-EN' | 'kk-KZ'

const localeOptions = computed(() => [
  { label: 'Русский', value: 'ru-RU' as LocaleType },
  { label: 'Қазақша', value: 'kk-KZ' as LocaleType },
  { label: 'English', value: 'en-EN' as LocaleType }
])

const changeLocale = (lang: LocaleType) => {
  i18n.global.locale.value = lang
  locale.value = lang
  localStorage.setItem('userLanguage', lang)
}
</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap');

.app-header {
  background: #fff;
  color: #222;
  border-bottom: 1px solid #e6e6e6;
  box-shadow: none;
}

.toolbar {
  min-height: 56px;
  padding: 0 24px;
  font-family: 'Inter', sans-serif;
}

.brand {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: .4px;
  color: #2d7ff9;
}

.title-icon {
  color: #2d7ff9;
  margin-right: 8px;
}

.mobile-menu-btn {
  display: none;
}

.desktop-nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  margin-left: 8px;
  font-weight: 500;
  color: #222;
  text-transform: none;
  font-size: 15px;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  background: var(--color-surface-alt);
}

.nav-btn .q-icon {
  margin-right: 6px;
}

.q-header--elevated { 
  box-shadow: none; 
}

/* Мобильный drawer */
.mobile-drawer {
  background: var(--color-surface);
}

.drawer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  border-bottom: 1px solid var(--color-border);
}

.drawer-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
}

.q-item {
  border-radius: var(--radius-m);
  margin: 4px 8px;
  transition: all 0.2s ease;
}

.q-item:hover {
  background: var(--color-surface-alt);
}

.q-item.q-router-link--active {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.q-item.q-router-link--active .q-icon {
  color: var(--color-accent);
}

/* Адаптивность */
@media (max-width: 1024px) {
  .mobile-menu-btn {
    display: inline-flex;
  }
  
  .desktop-nav {
    display: none;
  }
  
  .desktop-only {
    display: none;
  }
  
  .toolbar {
    padding: 0 16px;
  }
  
  .brand {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .toolbar {
    min-height: 48px;
    padding: 0 12px;
  }
  
  .brand {
    font-size: 15px;
  }
}
</style>