import { BasePage } from './BasePage'

export class HomePage extends BasePage {
  async goto() {
    await super.goto('/')
  }
}