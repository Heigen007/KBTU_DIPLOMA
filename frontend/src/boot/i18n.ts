import { createI18n } from 'vue-i18n'
import messages from 'src/i18n'

const locale = localStorage.getItem('userLanguage') || 'ru-RU'

const i18n = createI18n({
    legacy: false,
    locale,
    globalInjection: true,
    messages,
    missing: () => { return '?' }
})

const t = i18n.global.t
export { t }

export default i18n;