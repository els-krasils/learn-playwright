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

  async validateAccessibilityImagesAlt(exceptions: string[] = []) {
    const images = this.page.locator('img').filter({ visible: true })
    const imageCount = await images.count()

    console.log(`Found ${imageCount} images on the page`)

    let imagesWithoutAlt: string[] = []
    let imagesWithEmptyAlt: string[] = []

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const imageXPath = await this._getElementXPath(img)
      if (exceptions.includes(imageXPath)) {
        console.log(
          `Skipping image according to test exceptions: ${imageXPath}`,
        )
        continue
      }

      const alt = await img.getAttribute('alt')

      if (alt === null) {
        imagesWithoutAlt.push(imageXPath)
        console.log(`Image without alt attribute: ${imageXPath}`)
      } else if (alt.trim() === '') {
        imagesWithEmptyAlt.push(imageXPath)
        console.log(`Image with empty alt: ${imageXPath}`)
      }
    }

    expect(imagesWithoutAlt).toHaveLength(0)
    expect(imagesWithEmptyAlt).toHaveLength(0)
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
  private async _getElementXPath(locator: Locator): Promise<string> {
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
    xPath: string | null
  }> {
    if (this.tabCount === this.clickableElementsCount * 2) {
      console.log(
        'Reached maximum number of tabs, stopping keyboard navigation.',
      )
      return {
        isDone: true,
        focusFound: null,
        focusedElement: null,
        xPath: null,
      }
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
        return {
          isDone: true,
          focusFound: false,
          focusedElement: null,
          xPath: null,
        }
      }
      return {
        isDone: false,
        focusFound: false,
        focusedElement: null,
        xPath: null,
      }
    }

    const xPath = await this._getElementXPath(focusedElement)

    // Check if we've seen this element before (loop detection)
    if (this.focusedElements.includes(xPath)) {
      console.log('Detected loop in focusable elements, stopping tabbing.')
      return { isDone: true, focusFound: true, focusedElement, xPath }
    }

    this.focusedElements.push(xPath)
    this.clickableElementsMap[xPath] = true

    console.log(`Tab ${this.tabCount}: ${xPath.substring(0, 100)}`)

    return { isDone: false, focusFound: true, focusedElement, xPath }
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

  async analyzeAriaLabelsForElement(focusedElement: Locator): Promise<{
    needsAssertion: boolean
    elementType: 'search' | 'navigation' | 'menu' | null
    hasAccessibleLabel: boolean | null
  }> {
    // Get element information
    const elementInfo = await focusedElement.evaluate(el => {
      const tagName = el.tagName.toLowerCase()
      const role = el.getAttribute('role')
      const ariaLabel = el.getAttribute('aria-label')
      const ariaLabelledBy = el.getAttribute('aria-labelledby')
      const type = el.getAttribute('type')
      const textContent = el.textContent?.trim() || ''
      const alt = el.getAttribute('alt')
      const title = el.getAttribute('title')

      // Check if element or its parents are search, navigation, or menu related
      let currentElement: Element | null = el
      let isSearchRelated = false
      let isNavigationRelated = false
      let isMenuRelated = false

      while (currentElement) {
        const currentRole = currentElement.getAttribute('role')
        const currentTagName = currentElement.tagName.toLowerCase()

        if (currentRole === 'search' || type === 'search') {
          isSearchRelated = true
          break
        }

        if (
          currentRole === 'navigation' ||
          currentRole === 'link' ||
          currentTagName === 'nav' ||
          currentTagName === 'a'
        ) {
          isNavigationRelated = true
          break
        }

        if (
          currentRole === 'menu' ||
          currentRole === 'menubar' ||
          currentRole === 'menuitem'
        ) {
          isMenuRelated = true
          break
        }

        currentElement = currentElement.parentElement
      }

      return {
        tagName,
        role,
        ariaLabel,
        ariaLabelledBy,
        type,
        textContent,
        alt,
        title,
        isSearchRelated,
        isNavigationRelated,
        isMenuRelated,
      }
    })

    // Only verify ARIA labels for search, navigation, or menu elements
    if (
      !(
        elementInfo.isSearchRelated ||
        elementInfo.isNavigationRelated ||
        elementInfo.isMenuRelated
      )
    ) {
      return {
        needsAssertion: false,
        elementType: null,
        hasAccessibleLabel: null,
      }
    }
    const ariaLabel = elementInfo.ariaLabel?.trim() ?? ''
    const hasAriaLabel = ariaLabel !== ''
    const ariaLabelledBy = elementInfo.ariaLabelledBy?.trim() ?? ''
    const hasAriaLabelledBy = ariaLabelledBy !== ''
    const role = elementInfo.role?.trim() ?? ''
    const hasValidRole = role !== ''
    const textContent = elementInfo.textContent?.trim() ?? ''
    const hasTextContent = textContent !== ''
    const alt = elementInfo.alt?.trim() ?? ''
    const hasAlt = alt !== ''
    const title = elementInfo.title?.trim() ?? ''
    const hasTitle = title !== ''
    const foundLabel =
      ariaLabel ||
      ariaLabelledBy ||
      role ||
      textContent ||
      alt ||
      title ||
      'none'

    // For search, navigation, or menu elements, they should have some form of accessible labeling
    const hasAccessibleLabel =
      hasAriaLabel ||
      hasAriaLabelledBy ||
      hasValidRole ||
      hasTextContent ||
      hasAlt ||
      hasTitle
    const elementType = elementInfo.isSearchRelated
      ? 'search'
      : elementInfo.isNavigationRelated
      ? 'navigation'
      : 'menu'

    if (hasAccessibleLabel) {
      console.log(
        `Accessible label found for ${elementType} element (${elementInfo.tagName}): "${foundLabel}"`,
      )
    } else {
      console.log(
        `Warning: ${elementType} element (${elementInfo.tagName}) lacks accessible label (aria-label, aria-labelledby, role, or title)`,
      )
    }
    return { needsAssertion: true, elementType, hasAccessibleLabel }
  }

  // Helper function to calculate relative luminance
  private _getRelativeLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(val => {
      val = val / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  // Helper function to calculate contrast ratio
  private _getContrastRatio(
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number },
  ): number {
    const l1 = this._getRelativeLuminance(color1.r, color1.g, color1.b)
    const l2 = this._getRelativeLuminance(color2.r, color2.g, color2.b)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)
  }

  // Helper function to parse RGB color
  private _parseRgbColor(rgbString: string): {
    r: number
    g: number
    b: number
    a: number
  } | null {
    const rgbaMatch = rgbString.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    )
    if (rgbaMatch) {
      return {
        r: parseInt(rgbaMatch[1]),
        g: parseInt(rgbaMatch[2]),
        b: parseInt(rgbaMatch[3]),
        a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
      }
    }
    return null
  }

  // Helper function to blend colors with alpha transparency
  private _blendColors(
    foreground: { r: number; g: number; b: number; a: number },
    background: { r: number; g: number; b: number },
  ): { r: number; g: number; b: number } {
    const alpha = foreground.a
    return {
      r: Math.round(foreground.r * alpha + background.r * (1 - alpha)),
      g: Math.round(foreground.g * alpha + background.g * (1 - alpha)),
      b: Math.round(foreground.b * alpha + background.b * (1 - alpha)),
    }
  }

  // this method is generated by Copilot and seams to work well
  // TODO: verify its correctness
  async analyzeTextContrastForElement(
    focusedElement: Locator,
  ): Promise<{
    needsAssertion: boolean
    contrastRatio: number | null
    requiredRatio: number | null
  }> {
    const contrastData = await focusedElement.evaluate(el => {
      const styles = window.getComputedStyle(el)
      const color = styles.color
      const backgroundColor = styles.backgroundColor
      const fontSize = parseFloat(styles.fontSize)
      const fontWeight = styles.fontWeight
      const tagName = el.tagName.toLowerCase()
      const textContent = el.textContent?.trim() || ''
      const hasText = textContent.length > 0

      // Check if element is an icon (common icon patterns)
      const isIcon =
        el.classList.contains('icon') ||
        el.classList.contains('fa') ||
        el.classList.contains('material-icons') ||
        tagName === 'svg' ||
        (tagName === 'i' && textContent.length === 0) ||
        el.getAttribute('role') === 'img'

      // Get parent chain background colors
      const backgroundColors: string[] = []
      let currentElement: Element | null = el
      let depth = 0
      const maxDepth = 20

      while (currentElement && depth < maxDepth) {
        const bg = window.getComputedStyle(currentElement).backgroundColor
        backgroundColors.push(bg)

        // Stop if we found a non-transparent background
        if (
          bg &&
          bg !== 'rgba(0, 0, 0, 0)' &&
          bg !== 'transparent' &&
          !bg.includes('rgba(0, 0, 0, 0)')
        ) {
          break
        }

        currentElement = currentElement.parentElement
        depth++
      }

      return {
        color,
        backgroundColor,
        backgroundColors,
        fontSize,
        fontWeight,
        tagName,
        textContent: textContent.substring(0, 50),
        hasText,
        isIcon,
      }
    })

    // Skip elements without text or visual content
    if (!contrastData.hasText && !contrastData.isIcon) {
      return { needsAssertion: false, contrastRatio: null, requiredRatio: null }
    }

    // Skip if element is invisible
    if (!(await focusedElement.isVisible())) {
      return { needsAssertion: false, contrastRatio: null, requiredRatio: null }
    }

    // Parse colors
    const foregroundColor = this._parseRgbColor(contrastData.color)
    if (!foregroundColor) {
      console.log(
        `Warning: Could not parse foreground color: ${contrastData.color}`,
      )
      return { needsAssertion: false, contrastRatio: null, requiredRatio: null }
    }

    // Find effective background color
    let effectiveBackground: { r: number; g: number; b: number } | null = null

    for (const bgColor of contrastData.backgroundColors) {
      const parsedBg = this._parseRgbColor(bgColor)
      if (parsedBg && parsedBg.a > 0) {
        if (parsedBg.a < 1 && effectiveBackground) {
          // Blend with existing background
          effectiveBackground = this._blendColors(parsedBg, effectiveBackground)
        } else if (parsedBg.a === 1) {
          effectiveBackground = { r: parsedBg.r, g: parsedBg.g, b: parsedBg.b }
          break
        } else {
          effectiveBackground = { r: parsedBg.r, g: parsedBg.g, b: parsedBg.b }
        }
      }
    }

    // Default to white background if no solid background found
    if (!effectiveBackground) {
      console.log(
        `Warning: No solid background color found for ${contrastData.tagName}, defaulting to white`,
      )
      effectiveBackground = { r: 255, g: 255, b: 255 }
    }

    // Blend foreground with background if it has transparency
    let finalForeground: { r: number; g: number; b: number }
    if (foregroundColor.a < 1) {
      finalForeground = this._blendColors(foregroundColor, effectiveBackground)
    } else {
      finalForeground = {
        r: foregroundColor.r,
        g: foregroundColor.g,
        b: foregroundColor.b,
      }
    }

    // Calculate contrast ratio
    const contrastRatio = this._getContrastRatio(
      finalForeground,
      effectiveBackground,
    )

    // Determine required contrast ratio based on WCAG 2.1 guidelines
    const isLargeText =
      contrastData.fontSize >= 18 ||
      (contrastData.fontSize >= 14 &&
        (contrastData.fontWeight === 'bold' ||
          parseInt(contrastData.fontWeight) >= 700))

    const requiredRatio = contrastData.isIcon
      ? 3.0 // WCAG 2.1 AA for graphical objects and UI components
      : isLargeText
      ? 3.0 // WCAG 2.1 AA for large text
      : 4.5 // WCAG 2.1 AA for normal text

    const elementType = contrastData.isIcon
      ? 'icon'
      : isLargeText
      ? 'large text'
      : 'text'

    const passed = contrastRatio >= requiredRatio

    if (!passed) {
      console.log(
        `Contrast FAIL: ${elementType} "${contrastData.textContent}" (${contrastData.tagName})`,
      )
      console.log(
        `  Foreground: rgb(${finalForeground.r}, ${finalForeground.g}, ${finalForeground.b})`,
      )
      console.log(
        `  Background: rgb(${effectiveBackground.r}, ${effectiveBackground.g}, ${effectiveBackground.b})`,
      )
      console.log(
        `  Contrast ratio: ${contrastRatio.toFixed(
          2,
        )}:1 (required: ${requiredRatio.toFixed(1)}:1)`,
      )
    } else {
      console.log(
        `Contrast PASS: ${elementType} "${contrastData.textContent.trim()}" (${
          contrastData.tagName
        }) - ${contrastRatio.toFixed(2)}:1`,
      )
    }

    return { needsAssertion: true, contrastRatio, requiredRatio }
  }
}
