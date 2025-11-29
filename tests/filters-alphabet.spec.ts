import { test, expect } from '@playwright/test'
import { HealthTopicsPage } from '../pageObjects/HealthTopicsPage'
import { HomePage } from '../pageObjects/HomePage'

test.describe('Scenario 002: Validate Alphabetical Filter (A-Z Topics List)', () => {
  const lettersToTest = ['A', 'B', 'Z']

  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['local-network-access'])
  })

  for (const letter of lettersToTest) {
    test(`User can navigate from home page to filtered health topics by clicking on alphabetical letter ${letter}`, async ({
      page,
      baseURL,
    }) => {
      const homePage = new HomePage(page, baseURL!)
      const healthTopicsPage = new HealthTopicsPage(page, baseURL!)

      await test.step('Go to home page', async () => {
        await homePage.goto()
      })

      await test.step(`Click on the alphabetical filter letter ${letter}`, async () => {
        await homePage.navigateToHealthTopicsByMenuLetter(letter)
      })

      await test.step(`Verify the page scrolls or reloads showing topics starting with the letter ${letter}`, async () => {
        healthTopicsPage.verifyIsOnFilteredPage(letter)
      })

      await test.step(`Validate that the topics shown correspond to the selected letter ${letter}`, async () => {
        await healthTopicsPage.verifySomeTopicsStartWith(letter)
      })

      await test.step(`Verify no irrelevant topics appear in filtered results for letter ${letter}`, async () => {
        await healthTopicsPage.verifyNoIrrelevantTopics(letter)
      })
    })
  }

  test.fail(
    `User can filter health topics by alphabetical letters after navigating to all topics`,
    async ({ page, baseURL }) => {
      const doWorkaround = false // set to true to apply workaround for product bug and see how the test is intended to work
      const healthTopicsPage = new HealthTopicsPage(page, baseURL)

      await test.step('Go to health topics page', async () => {
        await healthTopicsPage.goto()
      })

      for (const letter of lettersToTest) {
        await test.step(`Click on the alphabetical filter letter ${letter}`, async () => {
          await healthTopicsPage.navigateToHealthTopicsByMenuLetter(letter)
        })

        await test.step(`Verify the page scrolls or reloads showing topics starting with the letter ${letter}`, async () => {
          healthTopicsPage.verifyIsOnFilteredPage(letter)
        })

        if (doWorkaround) {
          await test.step(`Product bug workaround: Reload page for letter ${letter}`, async () => {
            await page.goto('/health-topics')
            await page.goto(`/health-topics/#${letter}`)
          })
        }

        await test.step(`Validate that the topics shown correspond to the selected letter ${letter}`, async () => {
          await healthTopicsPage.verifySomeTopicsStartWith(letter)
        })

        await test.step(`Verify no irrelevant topics appear in filtered results for letter ${letter}`, async () => {
          await healthTopicsPage.verifyNoIrrelevantTopics(letter)
        })
      }

      for (const letter of lettersToTest.reverse().slice(1)) {
        await test.step(`Navigate back`, async () => {
          await healthTopicsPage.navigateBack()
        })

        if (doWorkaround) {
          await test.step(`Product bug workaround: Reload page for letter ${letter}`, async () => {
            await page.goto('/health-topics')
            await page.goto(`/health-topics/#${letter}`)
          })
        }

        await test.step(`Verify the page scrolls or reloads showing topics starting with the letter ${letter}`, async () => {
          healthTopicsPage.verifyIsOnFilteredPage(letter)
        })

        await test.step(`Validate that the topics shown correspond to the selected letter ${letter}`, async () => {
          await healthTopicsPage.verifySomeTopicsStartWith(letter)
        })

        await test.step(`Verify no irrelevant topics appear in filtered results for letter ${letter}`, async () => {
          await healthTopicsPage.verifyNoIrrelevantTopics(letter)
        })
      }

      await test.step(`Navigate back`, async () => {
        await healthTopicsPage.navigateBack()
      })

      await test.step(`Verify we're back on the main page without hash`, async () => {
        healthTopicsPage.verifyIsOnAllTopicsPage()
      })
    },
  )
})
