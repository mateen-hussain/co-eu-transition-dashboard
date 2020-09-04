import govukFrontend from 'govuk-frontend/govuk/all';

import missedMilestonesChart from './missed-milestones';
import removeAccordionCross from './remove-accordion-cross';
import disableButton from './disable-button';
import groupDisplay from './group-display';
import fieldOrder from './field-order';
import seeMore from './see-more';
import CustomAccordion from './custom-accordion';

window.TRANSITIONDELIVERYDASHBOARD = {
  missedMilestonesChart,
  removeAccordionCross,
  disableButton,
  groupDisplay,
  fieldOrder,
  seeMore
};

document.addEventListener('DOMContentLoaded', function() {
  govukFrontend.initAll();

  var $accordions = document.querySelectorAll('[data-module="govuk-custom-accordion"]')

  if ($accordions) {
    $accordions.forEach($accordion => new CustomAccordion($accordion).init())
  }
});

// The expanded state of individual instances of the accordion component persists across page loads using sessionStorage.
// These will be removed from the session storage so the accordions will collapse rather than stay open.
sessionStorage.clear();
