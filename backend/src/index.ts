import { logger } from './common/logger'
import { AppConfig } from './AppConfig'
import { createApp } from './app'

const app = createApp()

app.listen(AppConfig.PORT, () => {
    logger.info(`Server running on port ${AppConfig.PORT}`)
})