import axios from 'axios'

type TSystemStatus = 'test' | 'prod'
const systemStatus = import.meta.env.VITE_SYSTEM_STATUS as TSystemStatus || 'test'

const testURL = 'http://127.0.0.1:3000/api'  // Наш локальный бекенд
const prodURL = 'https://production.kz'  // Продакшн URL когда будет

export const currentURL = systemStatus === 'prod' ? prodURL : testURL

const instance = axios.create({
    baseURL: currentURL,
    timeout: 180000
})

// // Подстановка токена
// instance.interceptors.request.use(config => {
//     const token = authService.getAuthorizationHeader()
//     if (token) {
//         config.headers.Authorization = token
//     }
//     return config
// })

// // Обработка 401 и рефреш
// instance.interceptors.response.use(
//     r => r,
//     async error => {
//         const originalRequest = error.config;

//         // Если нет ответа или он не содержит статус — выходим
//         if (!error.response) {
//             return Promise.reject(error);
//         }

//         // 1️⃣ Если ошибка на refresh запросе — не пытаться рефрешить снова
//         if (originalRequest.url?.includes('/auth/refresh')) {
//             return Promise.reject(error);
//         }

//         // 2️⃣ Проверяем 401 и что попытка не повторялась
//         if (error.response.status === 401 && !originalRequest._retry) {
//             originalRequest._retry = true;

//             const refreshed = await authService.refresh();

//             // 3️⃣ Если refresh успешен — повторяем запрос с новым токеном
//             if (refreshed) {
//                 originalRequest.headers.Authorization = authService.getAuthorizationHeader();
//                 return instance(originalRequest);
//             }

//             // 4️⃣ Если refresh не удался — выходим из аккаунта
//             await authService.logout();
//         }

//         return Promise.reject(error);
//     }
// );

export default instance
