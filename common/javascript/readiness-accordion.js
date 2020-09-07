
/*
  Accordion

  This allows a collection of sections to be collapsed by default,
  showing only their headers. Sections can be exanded or collapsed
  individually by clicking their headers.

  The state of each section is saved to the DOM via the `aria-expanded`
  attribute, which also provides accessibility.

*/

import { nodeListForEach } from 'govuk-frontend/govuk/common'
import 'govuk-frontend/govuk/vendor/polyfills/Function/prototype/bind'
import 'govuk-frontend/govuk/vendor/polyfills/Element/prototype/classList'

function ReadinessAccordion ($module) {
  this.$module = $module
  this.moduleId = $module.getAttribute('id')
  this.$sections = $module.querySelectorAll(`.govuk-accordion__section-${this.moduleId }`)
  this.$openAllButton = ''

  this.controlsClass = 'govuk-accordion__controls'
  this.openAllClass = 'govuk-accordion__open-all'
  this.iconClass = 'govuk-accordion__icon'

  this.sectionHeaderClass = 'govuk-accordion__section-header'
  this.sectionHeaderFocusedClass = 'govuk-accordion__section-header--focused'
  this.sectionHeadingClass = 'govuk-accordion__section-heading'
  this.sectionSummaryClass = 'govuk-accordion__section-summary'
  this.sectionButtonClass = 'govuk-accordion__section-button'
  this.sectionExpandedClass = 'govuk-accordion__section--expanded'
}

// Initialize component
ReadinessAccordion.prototype.init = function () {
  // Check for module
  if (!this.$module) {
    return
  }

  this.initSectionHeaders()
}

// Initialise section headers
ReadinessAccordion.prototype.initSectionHeaders = function () {
  // Loop through section headers
  nodeListForEach(this.$sections, function ($section, i) {
    // Set header attributes
    var header = $section.querySelector('.' + this.sectionHeaderClass)
    this.initHeaderAttributes(header, i)

    this.setExpanded(this.isExpanded($section), $section)

    // Handle events
    header.addEventListener('click', this.onSectionToggle.bind(this, $section))

  }.bind(this))
}

// Set individual header attributes
ReadinessAccordion.prototype.initHeaderAttributes = function ($headerWrapper, index) {
  var $module = this
  var $span = $headerWrapper.querySelector('.' + this.sectionButtonClass)
  var $heading = $headerWrapper.querySelector('.' + this.sectionHeadingClass)
  var $summary = $headerWrapper.querySelector('.' + this.sectionSummaryClass)

  // Copy existing span element to an actual button element, for improved accessibility.
  var $button = document.createElement('button')
  $button.setAttribute('type', 'button')
  $button.setAttribute('id', this.moduleId + '-heading-' + (index + 1))
  $button.setAttribute('aria-controls', this.moduleId + '-content-' + (index + 1))

  // Copy all attributes (https://developer.mozilla.org/en-US/docs/Web/API/Element/attributes) from $span to $button
  for (var i = 0; i < $span.attributes.length; i++) {
    var attr = $span.attributes.item(i)
    $button.setAttribute(attr.nodeName, attr.nodeValue)
  }

  $button.addEventListener('focusin', function () {
    if (!$headerWrapper.classList.contains($module.sectionHeaderFocusedClass)) {
      $headerWrapper.className += ' ' + $module.sectionHeaderFocusedClass
    }
  })

  $button.addEventListener('blur', function () {
    $headerWrapper.classList.remove($module.sectionHeaderFocusedClass)
  })

  if (typeof ($summary) !== 'undefined' && $summary !== null) {
    $button.setAttribute('aria-describedby', this.moduleId + '-summary-' + (index + 1))
  }

  // $span could contain HTML elements (see https://www.w3.org/TR/2011/WD-html5-20110525/content-models.html#phrasing-content)
  $button.innerHTML = $span.innerHTML

  $heading.removeChild($span)
  $heading.appendChild($button)

  // Add "+/-" icon
  var icon = document.createElement('span')
  icon.className = this.iconClass
  icon.setAttribute('aria-hidden', 'true')

  $button.appendChild(icon)
}

// When section toggled, set and store state
ReadinessAccordion.prototype.onSectionToggle = function ($section) {
  var expanded = this.isExpanded($section)
  this.setExpanded(!expanded, $section)
}

// Set section attributes when opened/closed
ReadinessAccordion.prototype.setExpanded = function (expanded, $section) {
  var $button = $section.querySelector('.' + this.sectionButtonClass)
  $button.setAttribute('aria-expanded', expanded)

  if (expanded) {
    $section.classList.add(this.sectionExpandedClass)
  } else {
    $section.classList.remove(this.sectionExpandedClass)
  }
}

// Get state of section
ReadinessAccordion.prototype.isExpanded = function ($section) {
  return $section.classList.contains(this.sectionExpandedClass)
}


export default ReadinessAccordion
