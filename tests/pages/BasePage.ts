import { Page, Locator } from '@playwright/test'

export class BasePage {
  readonly page: Page
  protected baseURL?: string
  protected readonly healthTopicsMenuLink: Locator
  protected readonly menuContainer: Locator

  constructor(page: Page, baseURL?: string) {
    this.page = page
    this.baseURL = baseURL
    this.healthTopicsMenuLink = page.getByRole('link', {
      name: 'Health Topics',
    })
    this.menuContainer = page.locator('#navigationToScrape')
  }

  async navigateToHealthTopicsByMenuLetter(letter: string) {
    // First click on "Health Topics" menu to reveal alphabet filters
    await this.healthTopicsMenuLink.click()

    // Now click on the alphabet filter button
    await this.menuContainer
      .getByRole('link', { name: letter, exact: true })
      .click()

    // Wait for URL to change
    await this.page.waitForURL(`**/#${letter}`)
  }

  async goto(url: string) {
    await this.page.goto(url)
  }

  async navigateBack() {
    await this.page.goBack()
  }
}
