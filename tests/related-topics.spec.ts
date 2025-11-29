import { test, expect, Locator } from '@playwright/test'
import { HealthTopicPage } from '../pageObjects/HealthTopicPage'

test.describe('Scenario 018: Validate WHO Related Topics / Cross-Linking Functionality', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['local-network-access'])
  })

  test.only('Cross-linking between related topics is consistent and error-free', async ({
    page,
    baseURL,
  }) => {
    const healthTopicPage = new HealthTopicPage(page, baseURL!)

    await test.step('Precondition: A topic page is open', async () => {
      await healthTopicPage.goto('air-pollution')
    })

    await test.step('Verify a list of related topics is displayed', async () => {
      await healthTopicPage.verifyRelatedTopicsDisplayed()
    })

    await test.step('Click one of the related topic links', async () => {
      await healthTopicPage.clickRelatedTopicByIndex(0)
    })

    await test.step('Verify the newly opened page belongs to WHO and loads without issues', async () => {
      await page.waitForLoadState()
      await healthTopicPage.verifyIsOnCorrectBaseURL()
    })

    await test.step('Verify that new topic shows its own related topics', async () => {
      await healthTopicPage.verifyRelatedTopicsDisplayed()
    })

    await test.step('Navigate back and check that your original page still loads correctly', async () => {
      await healthTopicPage.navigateBack()
      await page.waitForLoadState()
      await healthTopicPage.verifyIsOnCorrectBaseURL()
    })
  })
})
