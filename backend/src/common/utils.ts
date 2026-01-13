/**
 * Converts a timestamp value to a string in the format "dd.mm.yyyy hh24:mi:ss" with the local timezone abbreviation.
 *
 * @param timestampValue - A numeric timestamp in milliseconds (e.g., as returned by `Date.now()`).
 * @returns A string representing the timestamp in the format "dd.mm.yyyy hh24:mi:ss" followed by the short timezone name (e.g., "01.01.2025 14:01:05 GMT+5").
 * @remarks The output uses the local system timezone. Leading zeros are included for day, month, hours, minutes, and seconds.
 */
export function convertTimestampToStringWithTimezone(timestampValue: number): string {
    try {
        const d = new Date(timestampValue)
        const dateOptions: Intl.DateTimeFormatOptions = {year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZoneName:'short'}
        return d.toLocaleString('ru-RU', dateOptions).replace(',', '')
    }
    catch(error: unknown) {
        return 'convertTimestampToStringWithTimezone: Error: ' + (error as Error)?.message
    }
}
