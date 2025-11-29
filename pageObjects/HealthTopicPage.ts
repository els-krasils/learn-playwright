import { BasePage } from './BasePage'

export class HealthTopicPage extends BasePage {
  async goto(topic: string) {
    await super.goto(`health-topics/${topic}/`)
  }
}
