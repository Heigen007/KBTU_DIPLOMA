import { convertTimestampToStringWithTimezone } from './utils'
import packageJson from '../../package.json'

export class Global {
    public static readonly applicationName = packageJson.name
    public static readonly applicationVersion = packageJson.version
    private static readonly _applicationStartTimestamp = Date.now()
    public static getApplicationStartDate(): string {
        return convertTimestampToStringWithTimezone(Global._applicationStartTimestamp)
    }
}