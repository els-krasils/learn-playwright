import { Page, Locator, expect } from '@playwright/test'
import { BasePage } from './BasePage'

export class HealthTopicsPage extends BasePage {
  private readonly urlPath = 'health-topics'
  private readonly listItems: Locator
  private readonly topicTypeSelectButton: Locator

  constructor(page: Page, baseURL?: string) {
    super(page, baseURL)
    // note: this selector finds topics including those hidden by the filter
    this.listItems = page
      .locator('#listView-healthtopics')
      .locator('.link-container')
    this.topicTypeSelectButton = page.getByRole('button', { name: 'select' })
  }

  async goto() {
    await super.goto(this.urlPath)
  }

  // note: this method makes a snapshot of currently visible topics in a safe way
  // visibility may change even while result is being collected, use expect.poll to assert a result
  async getFilteredTopics(): Promise<string[]> {
    const listItems = await this.listItems.all()
    const topics: string[] = []

    for (const item of listItems) {
      if ((await item.isVisible()) === false) {
        continue
      }
      const ariaLabel = await item.getAttribute('aria-label')
      if (ariaLabel) {
        topics.push(ariaLabel)
      }
    }

    return topics
  }

  async verifySomeTopicsStartWith(letter: string) {
    await expect
      .poll(
        async () => {
          const topicsNow = await this.getFilteredTopics()
          const relevantTopics = topicsNow.filter(
            topic => topic.charAt(0).toUpperCase() === letter.toUpperCase(),
          )
          return relevantTopics
        },
        {
          message: `No topics found starting with letter ${letter}`,
        },
      )
      .not.toHaveLength(0)
  }

  async verifyNoIrrelevantTopics(letter: string) {
    await expect
      .poll(
        async () => {
          const topicsNow = await this.getFilteredTopics()
          const irrelevantTopics = topicsNow.filter(
            topic => topic.charAt(0).toUpperCase() !== letter.toUpperCase(),
          )
          return irrelevantTopics
        },
        {
          message: `Irrelevant topics found for letter ${letter}`,
        },
      )
      .toHaveLength(0)
  }

  verifyIsOnFilteredPage(letter: string) {
    const url = this.page.url()
    expect(url).toBe(`${this.baseURL}/${this.urlPath}/#${letter}`)
  }

  verifyIsOnAllTopicsPage() {
    const url = this.page.url()
    expect(url).toBe(`${this.baseURL}/${this.urlPath}`)
  }

  async initializeKeyboardNavigation() {
    await super.initializeKeyboardNavigation({
      exceptions: [this.topicTypeSelectButton],
    })
  }
}
