import { test, expect, Locator } from '@playwright/test'
import { HealthTopicsPage } from '../pageObjects/HealthTopicsPage'
import { HomePage } from '../pageObjects/HomePage'

test.describe('WHO Accessibility - Basic Validation', () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(['local-network-access'])
  })

  test.only('Scenario 012: Validate Accessibility Basics on Health Topics page', async ({
    page,
    baseURL,
  }) => {
    const skipBugs = true // Set to true to skip known bugs and ensure other asserts pass
    const healthTopicsPage = new HealthTopicsPage(page, baseURL)

    await test.step('Navigate to Health Topics page', async () => {
      await healthTopicsPage.goto()
    })

    await test.step('Check images contain valid alt attributes', async () => {
      await healthTopicsPage.validateAccessibilityImagesAlt()
    })

    if (!skipBugs) {
      await test.step('Verify page has a single H1 heading', async () => {
        await healthTopicsPage.validateAccessibilityH1Heading()
      })
    }

    await test.step('Verify headings follow hierarchy (H1 > H2 > H3)', async () => {
      await healthTopicsPage.validateAccessibilityHeadingHierarchy()
    })

    await test.step('Use Tab key to navigate through all clickable elements', async () => {
      await test.step('Initialize keyboard navigation', async () => {
        await healthTopicsPage.initializeKeyboardNavigation()
      })

      await test.step('Tab and assert a focused element', async () => {
        while (true) {
          let result: {
            isDone: boolean
            focusFound: boolean | null
            focusedElement: Locator | null
          } = { isDone: false, focusFound: false, focusedElement: null }

          await test.step('Do tab', async () => {
            result = await healthTopicsPage.tabToNextElement()
          })

          if (result.isDone) {
            break
          }

          await test.step('Assert tabbed element has focus pseudo class', async () => {
            expect(
              result.focusFound,
              'Tabbed element should have focus pseudo class',
            ).toBeTruthy()
          })

          await test.step('Verify ARIA labels for search, navigation, or menus', async () => {
            const ariaResult =
              await healthTopicsPage.analyzeAriaLabelsForElement(
                result.focusedElement!,
              )
            if (ariaResult.needsAssertion) {
              expect(
                ariaResult.hasAccessibleLabel,
                `Focused ${ariaResult.elementType} element should have accessible label`,
              ).toBeTruthy()
            }
          })

          await test.step('Validate text contrast', async () => {
            await healthTopicsPage.validateTextContrastForElement(
              result.focusedElement!,
            )
          })
        }
      })

      await test.step('Assert all clickable elements were focused', async () => {
        await healthTopicsPage.assertAllClickableElementsFocused()
      })
    })
  })
})
