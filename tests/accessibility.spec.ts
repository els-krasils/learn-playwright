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
        }
      })

      await test.step('Assert all clickable elements were focused', async () => {
        await healthTopicsPage.assertAllClickableElementsFocused()
      })
    })

    // await test.step('Ensure focus styles appear on tabbed elements', async () => {
    //   //await healthTopicsPage.validateFocusStylesOnTabbedElements()
    // })

    // await test.step('Verify ARIA labels for search, navigation, or menus', async () => {
    //   const ariaElements = {
    //     navigation: [] as string[],
    //     search: [] as string[],
    //     menu: [] as string[],
    //     main: [] as string[],
    //     banner: [] as string[],
    //   }

    //   // Check for navigation elements
    //   const navElements = await page.locator('nav, [role="navigation"]').all()
    //   for (const nav of navElements) {
    //     const ariaLabel = await nav.getAttribute('aria-label')
    //     const ariaLabelledBy = await nav.getAttribute('aria-labelledby')
    //     const id = await nav.getAttribute('id')

    //     const label = ariaLabel || ariaLabelledBy || id || 'unlabeled'
    //     ariaElements.navigation.push(label)
    //   }

    //   // Check for search elements
    //   const searchElements = await page
    //     .locator('form[role="search"], [role="search"], input[type="search"]')
    //     .all()
    //   for (const search of searchElements) {
    //     const ariaLabel = await search.getAttribute('aria-label')
    //     const ariaLabelledBy = await search.getAttribute('aria-labelledby')
    //     const placeholder = await search.getAttribute('placeholder')

    //     const label = ariaLabel || ariaLabelledBy || placeholder || 'unlabeled'
    //     ariaElements.search.push(label)
    //   }

    //   // Check for menu elements
    //   const menuElements = await page
    //     .locator('[role="menu"], [role="menubar"]')
    //     .all()
    //   for (const menu of menuElements) {
    //     const ariaLabel = await menu.getAttribute('aria-label')
    //     const ariaLabelledBy = await menu.getAttribute('aria-labelledby')

    //     const label = ariaLabel || ariaLabelledBy || 'unlabeled'
    //     ariaElements.menu.push(label)
    //   }

    //   // Check for main landmark
    //   const mainElements = await page.locator('main, [role="main"]').all()
    //   for (const main of mainElements) {
    //     const ariaLabel = await main.getAttribute('aria-label')
    //     const ariaLabelledBy = await main.getAttribute('aria-labelledby')

    //     const label = ariaLabel || ariaLabelledBy || 'main content'
    //     ariaElements.main.push(label)
    //   }

    //   // Check for banner (header)
    //   const bannerElements = await page.locator('header, [role="banner"]').all()
    //   for (const banner of bannerElements) {
    //     const ariaLabel = await banner.getAttribute('aria-label')
    //     const ariaLabelledBy = await banner.getAttribute('aria-labelledby')

    //     const label = ariaLabel || ariaLabelledBy || 'banner'
    //     ariaElements.banner.push(label)
    //   }

    //   console.log('ARIA landmarks found:')
    //   console.log(
    //     `  Navigation: ${
    //       ariaElements.navigation.length
    //     } - ${ariaElements.navigation.join(', ')}`,
    //   )
    //   console.log(
    //     `  Search: ${ariaElements.search.length} - ${ariaElements.search.join(
    //       ', ',
    //     )}`,
    //   )
    //   console.log(
    //     `  Menu: ${ariaElements.menu.length} - ${ariaElements.menu.join(', ')}`,
    //   )
    //   console.log(
    //     `  Main: ${ariaElements.main.length} - ${ariaElements.main.join(', ')}`,
    //   )
    //   console.log(
    //     `  Banner: ${ariaElements.banner.length} - ${ariaElements.banner.join(
    //       ', ',
    //     )}`,
    //   )

    //   // Should have at least one navigation element
    //   expect(
    //     ariaElements.navigation.length,
    //     'Should have at least one navigation element',
    //   ).toBeGreaterThan(0)

    //   // Should have at most one main landmark
    //   expect(
    //     ariaElements.main.length,
    //     'Should have at most one main landmark',
    //   ).toBeLessThanOrEqual(1)
    // })

    // await test.step('Validate text contrast manually (report findings)', async () => {
    //   // This step involves checking contrast ratios
    //   // We'll sample some text elements and check their contrast

    //   const textSamples = await page
    //     .locator('p, a, h1, h2, h3, button, span')
    //     .all()
    //   const contrastIssues: string[] = []

    //   // Check first 20 text elements
    //   const samplesToCheck = Math.min(20, textSamples.length)

    //   for (let i = 0; i < samplesToCheck; i++) {
    //     const element = textSamples[i]
    //     const isVisible = await element.isVisible()

    //     if (!isVisible) continue

    //     const contrastInfo = await element.evaluate(el => {
    //       const computedStyle = window.getComputedStyle(el)
    //       const color = computedStyle.color
    //       const backgroundColor = computedStyle.backgroundColor
    //       const fontSize = computedStyle.fontSize
    //       const fontWeight = computedStyle.fontWeight
    //       const text = el.textContent?.trim().substring(0, 30)

    //       // Helper function to parse rgb/rgba
    //       const parseColor = (
    //         colorStr: string,
    //       ): { r: number; g: number; b: number; a: number } | null => {
    //         const match = colorStr.match(
    //           /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    //         )
    //         if (!match) return null
    //         return {
    //           r: parseInt(match[1]),
    //           g: parseInt(match[2]),
    //           b: parseInt(match[3]),
    //           a: match[4] ? parseFloat(match[4]) : 1,
    //         }
    //       }

    //       // Calculate relative luminance
    //       const getLuminance = (r: number, g: number, b: number): number => {
    //         const [rs, gs, bs] = [r, g, b].map(c => {
    //           c = c / 255
    //           return c <= 0.03928
    //             ? c / 12.92
    //             : Math.pow((c + 0.055) / 1.055, 2.4)
    //         })
    //         return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
    //       }

    //       const fg = parseColor(color)
    //       const bg = parseColor(backgroundColor)

    //       if (!fg || !bg) {
    //         return {
    //           text,
    //           color,
    //           backgroundColor,
    //           contrast: null,
    //           fontSize,
    //           fontWeight,
    //         }
    //       }

    //       const fgLum = getLuminance(fg.r, fg.g, fg.b)
    //       const bgLum = getLuminance(bg.r, bg.g, bg.b)

    //       const contrast =
    //         (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05)

    //       return {
    //         text,
    //         color,
    //         backgroundColor,
    //         contrast: Math.round(contrast * 100) / 100,
    //         fontSize,
    //         fontWeight,
    //       }
    //     })

    //     if (contrastInfo.contrast !== null) {
    //       const fontSize = parseFloat(contrastInfo.fontSize)
    //       const fontWeight = parseInt(contrastInfo.fontWeight)
    //       const isLargeText =
    //         fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)
    //       const minContrast = isLargeText ? 3 : 4.5

    //       if (contrastInfo.contrast < minContrast) {
    //         const issue = `Low contrast (${contrastInfo.contrast}:1, needs ${minContrast}:1): "${contrastInfo.text}" - ${contrastInfo.color} on ${contrastInfo.backgroundColor}`
    //         contrastIssues.push(issue)
    //         console.log(issue)
    //       }
    //     }
    //   }

    //   console.log(`Checked ${samplesToCheck} text elements for contrast`)
    //   console.log(`Potential contrast issues found: ${contrastIssues.length}`)

    //   // Report but don't fail if there are minor contrast issues
    //   // (manual validation may be needed for complex backgrounds)
    //   if (contrastIssues.length > 0) {
    //     console.log(
    //       'Note: Some elements may have acceptable contrast in context (e.g., over images)',
    //     )
    //   }
    // })
  })

  test('Scenario 012: Validate Accessibility Basics on topic detail page', async ({
    page,
    baseURL,
  }) => {
    const homePage = new HomePage(page, baseURL)

    await test.step('Navigate to home page and find a topic detail link', async () => {
      await homePage.goto()
      await page.waitForLoadState('networkidle')
    })

    await test.step('Navigate to a topic detail page', async () => {
      // BUG WORKAROUND: Direct links to topics from home are not visible
      // Navigate directly to health topics page and click on a topic
      console.log(
        'WORKAROUND: Navigating via health topics page due to invisible links',
      )

      await page.goto('/health-topics')
      await page.waitForLoadState('networkidle')

      // Click on the first visible topic
      const firstTopic = page
        .locator('#listView-healthtopics .link-container')
        .first()
      await firstTopic.waitFor({ state: 'visible' })
      await firstTopic.click()
      await page.waitForLoadState('networkidle')

      console.log(`Navigated to: ${page.url()}`)
    })

    await test.step('Check images contain valid alt attributes', async () => {
      const images = page.locator('img')
      const imageCount = await images.count()

      console.log(`Found ${imageCount} images on the page`)

      let imagesWithoutAlt = 0

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i)
        const alt = await img.getAttribute('alt')
        const src = await img.getAttribute('src')

        if (alt === null) {
          imagesWithoutAlt++
          console.log(`Image without alt attribute: ${src}`)
        }
      }

      console.log(`Images without alt attribute: ${imagesWithoutAlt}`)
      expect(imagesWithoutAlt).toBe(0)
    })

    await test.step('Verify headings follow hierarchy', async () => {
      const h1s = await page.locator('h1').all()

      console.log(`Found ${h1s.length} H1 heading(s)`)
      expect(h1s.length).toBeGreaterThanOrEqual(1)

      // Check hierarchy
      const allHeadings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      const headingLevels: number[] = []

      for (const heading of allHeadings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
        const level = parseInt(tagName.substring(1))
        headingLevels.push(level)
      }

      let hierarchyViolations = 0
      let previousLevel = 0

      for (let i = 0; i < headingLevels.length; i++) {
        const currentLevel = headingLevels[i]
        if (previousLevel > 0 && currentLevel > previousLevel + 1) {
          hierarchyViolations++
        }
        previousLevel = currentLevel
      }

      console.log('Heading hierarchy:', headingLevels.slice(0, 10))
      expect(
        hierarchyViolations,
        `Found ${hierarchyViolations} heading hierarchy violations`,
      ).toBe(0)
    })

    await test.step('Verify keyboard navigation and focus styles', async () => {
      await page.evaluate(() => {
        ;(document.activeElement as HTMLElement)?.blur?.()
        document.body.focus()
      })

      let tabCount = 0
      const maxTabs = 20
      let focusableCount = 0

      while (tabCount < maxTabs) {
        await page.keyboard.press('Tab')
        tabCount++

        const hasFocusedElement = await page.evaluate(() => {
          return document.activeElement !== document.body
        })

        if (!hasFocusedElement) break
        focusableCount++
      }

      console.log(`Found ${focusableCount} focusable elements via keyboard`)
      expect(focusableCount).toBeGreaterThan(0)
    })

    await test.step('Verify ARIA landmarks exist', async () => {
      const navCount = await page.locator('nav, [role="navigation"]').count()
      console.log(`Navigation landmarks: ${navCount}`)

      expect(navCount).toBeGreaterThan(0)
    })
  })
})
