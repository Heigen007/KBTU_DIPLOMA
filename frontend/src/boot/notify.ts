import { Notify } from 'quasar'

export default () => {
  // Настройка глобальных опций для уведомлений
  Notify.setDefaults({
    position: 'top-right',
    timeout: 4000,
    textColor: 'white',
    actions: [{ icon: 'close', color: 'white' }]
  })
}