import { expect, Locator, Page } from '@playwright/test'
import { BasePage } from './BasePage'

export class HealthTopicPage extends BasePage {
  private readonly urlPath = 'health-topics'
  private readonly relatedTopicsSection: Locator
  private readonly relatedTopics: Locator

  constructor(page: Page, baseURL: string) {
    super(page, baseURL)
    const relatedTopicsHeadingText = 'Related health topics'
    this.relatedTopicsSection = page
      // the section is currently a div with class 'row' that contains a heading or paragraph with specific text
      .locator('.row')
      // unfortunately, there is also a parent .row that contains the same heading, so we need to filter it out
      // the parent row contains the whole body content, so we can exclude it by some seemingly unique child
      .filter({
        hasNot: page.locator('*[data-placeholder-label="Body content"]'),
      })
      .filter({
        has: page
          // on different topics pages, this heading may be either a paragraph or a heading element
          .getByRole('paragraph').or(page.getByRole('heading'))
          .filter({ hasText: relatedTopicsHeadingText }),
      })
    this.relatedTopics = this.relatedTopicsSection.getByRole('link')
  }

  async goto(topic: string) {
    await super.goto(`${this.urlPath}/${topic}`)
  }

  async verifyRelatedTopicsDisplayed() {
    await expect(
      this.relatedTopicsSection,
      'Related topics section should be visible',
    ).toBeVisible()
    await expect
      .poll(async () => await this.relatedTopics.count(), {
        message: 'There should be at least one related topic displayed',
      })
      .toBeGreaterThan(0)
  }

  async clickRelatedTopicByIndex(index: number) {
    const topicCount = await this.relatedTopics.count()
    expect(
      index,
      `Index ${index} is out of bounds. There are only ${topicCount} related topics.`,
    ).toBeLessThan(topicCount)
    await this.relatedTopics.nth(index).click()
  }
}
