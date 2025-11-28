import { Page, Locator, expect } from '@playwright/test'

export class BasePage {
  readonly page: Page
  protected baseURL?: string
  protected readonly healthTopicsMenuLink: Locator
  protected readonly menuContainer: Locator

  // Keyboard navigation state
  protected clickableElementsCount: number = 0
  protected clickableElementsMap: Record<string, boolean> = {}
  protected focusedElements: string[] = []
  protected tabCount: number = 0

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

  async validateAccessibilityImagesAlt() {
    const images = this.page.locator('img')
    const imageCount = await images.count()

    console.log(`Found ${imageCount} images on the page`)

    let imagesWithoutAlt = 0
    let imagesWithEmptyAlt = 0
    let imagesWithValidAlt = 0

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const src = await img.getAttribute('src')

      if (alt === null) {
        imagesWithoutAlt++
        console.log(`Image without alt attribute: ${src}`)
      } else if (alt.trim() === '') {
        imagesWithEmptyAlt++
        console.log(`Image with empty alt: ${src}`)
      } else {
        imagesWithValidAlt++
      }
    }

    console.log(`Images with valid alt: ${imagesWithValidAlt}`)
    console.log(`Images with empty alt (decorative): ${imagesWithEmptyAlt}`)
    console.log(`Images without alt attribute: ${imagesWithoutAlt}`)

    expect(imagesWithoutAlt).toBe(0)
    expect(imagesWithEmptyAlt).toBe(0)
  }

  async validateAccessibilityH1Heading() {
    const h1s = await this.page.locator('h1').all()
    expect(
      h1s.length,
      'Page should have exactly one H1 heading for accessibility',
    ).toBe(1)
  }

  async validateAccessibilityHeadingHierarchy() {
    const allHeadingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    for (let i = 1; i < allHeadingLevels.length - 1; i++) {
      const forbiddenHeadingLevels = allHeadingLevels.slice(0, i)
      const currentLevelLocators = await this.page
        .locator(allHeadingLevels[i])
        .all()
      for (const currentLevelLocator of currentLevelLocators) {
        const forbiddenElements = await currentLevelLocator
          .locator(forbiddenHeadingLevels.join(', '))
          .all()
        expect(
          forbiddenElements.length,
          `Heading hierarchy violation: ${
            allHeadingLevels[i]
          } header "${await currentLevelLocator.textContent()}" should not be followed by higher-level headings`,
        ).toBe(0)
      }
    }
  }

  // taken from https://github.com/firebug/firebug/blob/master/extension/content/firebug/lib/xpath.js
  async _getElementXPath(locator: Locator): Promise<string> {
    return await locator.evaluate(el => {
      var paths: string[] = []
      var element: any = el
      // Use nodeName (instead of localName) so namespace prefix is included (if any).
      for (
        ;
        element && element.nodeType == Node.ELEMENT_NODE;
        element = element.parentNode
      ) {
        var index = 0
        var hasFollowingSiblings = false
        for (
          var sibling = element.previousSibling;
          sibling;
          sibling = sibling.previousSibling
        ) {
          // Ignore document type declaration.
          if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE) continue

          if (sibling.nodeName == element.nodeName) ++index
        }

        for (
          var sibling = element.nextSibling;
          sibling && !hasFollowingSiblings;
          sibling = sibling.nextSibling
        ) {
          if (sibling.nodeName == element.nodeName) hasFollowingSiblings = true
        }

        var tagName =
          (element.prefix ? element.prefix + ':' : '') + element.localName
        var pathIndex =
          index || hasFollowingSiblings ? '[' + (index + 1) + ']' : ''
        paths.splice(0, 0, tagName + pathIndex)
      }

      return '/' + paths.join('/')
    })
  }

  async initializeKeyboardNavigation({
    exceptions = [],
  }: {
    exceptions?: Locator[]
  } = {}) {
    // Reset state
    this.clickableElementsCount = 0
    this.clickableElementsMap = {}
    this.focusedElements = []
    this.tabCount = 0

    // Find all clickable elements on the page (locator advised by Copilot)
    const clickableSelector =
      'a, button, input[type="button"], input[type="submit"], [role="button"], [role="link"], select, [tabindex]:not([tabindex="-1"])'

    // Collect clickable elements from main page
    const clickableElements = await this.page
      .locator(clickableSelector)
      .filter({ visible: true })
      .all()

    // Collect clickable elements from all frames
    const frames = this.page.frames()
    for (const frame of frames) {
      if (frame !== this.page.mainFrame()) {
        const frameClickableElements = await frame
          .locator(clickableSelector)
          .filter({ visible: true })
          .all()
        clickableElements.push(...frameClickableElements)
      }
    }

    // collect elements xpath
    const clickableElementsXPath: string[] = []
    for (const element of clickableElements) {
      const uniqueKey = await this._getElementXPath(element)
      clickableElementsXPath.push(uniqueKey)
    }

    // remove exceptions from the list
    for (const exceptionLocator of exceptions) {
      const exceptionKey = await this._getElementXPath(exceptionLocator)
      const index = clickableElementsXPath.indexOf(exceptionKey)
      if (index !== -1) {
        clickableElementsXPath.splice(index, 1)
      }
    }

    console.log(
      `Found ${clickableElementsXPath.length} clickable elements on the page`,
    )

    this.clickableElementsCount = clickableElementsXPath.length

    // build a map of clickable elements' xpaths for later verification
    for (const xpath of clickableElementsXPath) {
      // check if this xpath is already in the map (should not happen)
      if (this.clickableElementsMap.hasOwnProperty(xpath)) {
        throw new Error(
          `Test implementation error: duplicate clickable element xpath found: ${xpath}`,
        )
      }
      this.clickableElementsMap[xpath] = false
    }

    // Focus on the body to start from the beginning
    await this.page.locator('body').focus()
  }

  async tabToNextElement(): Promise<{
    isDone: boolean
    focusFound: boolean | null
    focusedElement: Locator | null
  }> {
    if (this.tabCount === this.clickableElementsCount * 2) {
      console.log(
        'Reached maximum number of tabs, stopping keyboard navigation.',
      )
      return { isDone: true, focusFound: null, focusedElement: null }
    }
    await this.page.keyboard.press('Tab')
    this.tabCount++

    let focusedElement = this.page.locator('*:focus')
    let elementCount = await focusedElement.count()

    // If no focused element in main frame, check all frames
    if (elementCount === 0) {
      const frames = this.page.frames()
      for (const frame of frames) {
        focusedElement = frame.locator('*:focus')
        elementCount = await focusedElement.count()
        if (elementCount > 0) {
          console.log(`Found focused element in frame: ${frame.url()}`)
          break
        }
      }
    }

    if (elementCount === 0) {
      console.log(
        "No focused element found after Tab press, let's check if all clickable elements were focused.",
      )
      const notFocusedElementsCount = Object.values(
        this.clickableElementsMap,
      ).filter(wasFocused => !wasFocused).length
      if (notFocusedElementsCount === 0) {
        console.log(
          'All clickable elements have been focused. Probably now focus is out of the page. It means we are done.',
        )
        return { isDone: true, focusFound: false, focusedElement: null }
      }
      return { isDone: false, focusFound: false, focusedElement: null }
    }

    const xpath = await this._getElementXPath(focusedElement)

    // Check if we've seen this element before (loop detection)
    if (this.focusedElements.includes(xpath)) {
      console.log('Detected loop in focusable elements, stopping tabbing.')
      return { isDone: true, focusFound: true, focusedElement }
    }

    this.focusedElements.push(xpath)
    this.clickableElementsMap[xpath] = true

    console.log(`Tab ${this.tabCount}: ${xpath.substring(0, 50)}`)

    return { isDone: false, focusFound: true, focusedElement }
  }

  async assertAllClickableElementsFocused() {
    console.log(
      `Tabbed through ${this.focusedElements.length} focusable elements`,
    )

    const notFocusedElements = Object.entries(this.clickableElementsMap).filter(
      ([, wasFocused]) => !wasFocused,
    )

    expect(
      notFocusedElements,
      `There should be no un-focused clickable elements on the page.`,
    ).toHaveLength(0)
  }
}
