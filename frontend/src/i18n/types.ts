import ruRU from './ru-RU'

/**
 * Утилитарный тип для рекурсивного создания типа с string значениями
 * на основе любого объекта с вложенной структурой
 */
export type RecursiveStringify<T> = {
  [K in keyof T]: T[K] extends string 
    ? string
    : T[K] extends object 
    ? RecursiveStringify<T[K]> 
    : string
}

/**
 * Динамический тип на основе русского языкового файла
 * Автоматически извлекает структуру ключей из ru-RU объекта
 */
export type I18nTranslations = RecursiveStringify<typeof ruRU>