import { test, expect, Locator } from '@playwright/test'
import { HealthTopicsPage } from '../pageObjects/HealthTopicsPage'
import { BasePage } from '../pageObjects/BasePage'
import { HealthTopicPage } from '../pageObjects/HealthTopicPage'

// Scenario 012: Validate Accessibility Basics
// Purpose: Ensure WHO pages follow accessibility best practices.
// Precondition: On Health Topics or topic detail page.
// Steps:
// 1.	Check images contain valid alt attributes.
// 2.	Verify headings follow hierarchy (H1 > H2 > H3).
// 3.	Use Tab key to navigate through all clickable elements.
// 4.	Ensure focus styles appear on tabbed elements.
// 5.	Verify ARIA labels for search, navigation, or menus.
// 6.	Validate text contrast manually.
// Expected Result: Page meets essential accessibility expectations.

test.describe('Scenario 012: Validate Accessibility Basics', () => {
  const skipBugs = true // set to false to let tests fail on known bugs
  const targetPages: {
    pageName: string
    initializer: (page: any, baseURL: string) => Promise<BasePage>
    knownBugs?: { h1?: boolean; altXPath?: string[]; contrastXPath?: string[] }
  }[] = [
    {
      pageName: 'Health Topics',
      initializer: async (page: any, baseURL: string) => {
        const pageObject = new HealthTopicsPage(page, baseURL)
        await pageObject.goto()
        return pageObject
      },
      knownBugs: { h1: true },
    },
    {
      pageName: 'Health Topic Air pollution',
      initializer: async (page: any, baseURL: string) => {
        const pageObject = new HealthTopicPage(page, baseURL)
        await pageObject.goto('air-pollution')
        return pageObject
      },
      knownBugs: {
        altXPath: [
          '/html/body/div[3]/section/div[2]/div/div/div[1]/div/div[6]/div/div[1]/div/figure/img',
          '/html/body/div[3]/section/div[2]/div/div/div[1]/div/div[6]/div/div[2]/div/figure/img',
        ],
        contrastXPath: [
          '/html/body/div[3]/section/div[2]/div/article/section/div[1]/div[1]/div/div/div/div[1]/ul/li[1]/a',
          '/html/body/div[3]/section/div[2]/div/article/section/div[1]/div[1]/div/div/div/div[1]/ul/li[2]/a',
          '/html/body/div[3]/section/div[2]/div/article/section/div[1]/div[1]/div/div/div/div[1]/ul/li[3]/a',
        ],
      },
    },
  ]

  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['local-network-access'])
  })

  for (const targetPage of targetPages) {
    test(`Scenario 012: Validate Accessibility Basics on ${targetPage.pageName} page`, async ({
      page,
      baseURL,
    }) => {
      const pageObject = await targetPage.initializer(page, baseURL!)

      // this test is based on page scanning approach, lots of array locators without auto-waiting
      // also this site does not have any load spinners
      // thus this is a good example of when we have to use hardcoded timeouts
      await page.waitForTimeout(1000)

      let altExceptions: string[] = []
      if (skipBugs && targetPage.knownBugs?.altXPath !== undefined) {
        altExceptions = targetPage.knownBugs?.altXPath!
      }
      await test.step('Check images contain valid alt attributes', async () => {
        await pageObject.validateAccessibilityImagesAlt(altExceptions)
      })

      if (!(skipBugs && targetPage.knownBugs?.h1 === true)) {
        await test.step('Verify page has a single H1 heading', async () => {
          await pageObject.validateAccessibilityH1Heading()
        })
      }

      await test.step('Verify headings follow hierarchy (H1 > H2 > H3)', async () => {
        await pageObject.validateAccessibilityHeadingHierarchy()
      })

      await test.step('Use Tab key to navigate through all clickable elements', async () => {
        await test.step('Initialize keyboard navigation', async () => {
          await pageObject.initializeKeyboardNavigation()
        })

        await test.step('Tab and assert a focused element', async () => {
          while (true) {
            let result: {
              isDone: boolean
              focusFound: boolean | null
              focusedElement: Locator | null
              xPath: string | null
            } = {
              isDone: false,
              focusFound: false,
              focusedElement: null,
              xPath: null,
            }

            await test.step('Do tab', async () => {
              result = await pageObject.tabToNextElement()
            })

            if (result.isDone) {
              break
            }

            await test.step('Assert tabbed element has focus pseudo class', async () => {
              expect(
                result.focusFound,
                `Tabbed element should have focus pseudo class: ${result.xPath}`,
              ).toBeTruthy()
            })

            await test.step('Verify ARIA labels for search, navigation, or menus', async () => {
              const ariaResult = await pageObject.analyzeAriaLabelsForElement(
                result.focusedElement!,
              )
              if (ariaResult.needsAssertion) {
                expect(
                  ariaResult.hasAccessibleLabel,
                  `Focused element should have accessible label: ${result.xPath}`,
                ).toBeTruthy()
              }
            })

            if (
              !(
                skipBugs &&
                targetPage.knownBugs?.contrastXPath?.includes(result.xPath!)
              )
            ) {
              await test.step('Validate text contrast', async () => {
                const contrastResult =
                  await pageObject.analyzeTextContrastForElement(
                    result.focusedElement!,
                  )
                if (contrastResult.needsAssertion) {
                  expect(
                    contrastResult.contrastRatio!,
                    `Text contrast ratio for element: ${result.xPath}`,
                  ).toBeGreaterThanOrEqual(contrastResult.requiredRatio!)
                }
              })
            }
          }
        })

        await test.step('Assert all clickable elements were focused', async () => {
          await pageObject.assertAllClickableElementsFocused()
        })
      })
    })
  }
})
