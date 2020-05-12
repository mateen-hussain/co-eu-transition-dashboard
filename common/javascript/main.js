import govukFrontend from 'govuk-frontend/govuk/all';

import missedMilestonesChart from './missed-milestones';
import upcomingMilestoneChart from './upcoming-milestones';
import removeAccordionCross from './remove-accordion-cross';
import disableButton from './disable-button';
import groupDisplay from './group-display';
import fieldOrder from './field-order';
import seeMore from './see-more';

window.TRANSITIONDELIVERYDASHBOARD = {
  missedMilestonesChart,
  upcomingMilestoneChart,
  removeAccordionCross,
  disableButton,
  groupDisplay,
  fieldOrder,
  seeMore
};

document.addEventListener('DOMContentLoaded', function() {
  govukFrontend.initAll();
});

// The expanded state of individual instances of the accordion component persists across page loads using sessionStorage.
// These will be removed from the session storage so the accordions will collapse rather than stay open.
sessionStorage.clear();
