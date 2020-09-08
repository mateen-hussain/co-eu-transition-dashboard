import govukFrontend from 'govuk-frontend/govuk/all';

import missedMilestonesChart from './missed-milestones';
import removeAccordionCross from './remove-accordion-cross';
import disableButton from './disable-button';
import groupDisplay from './group-display';
import fieldOrder from './field-order';
import seeMore from './see-more';
import ReadinessAccordion from './readiness-accordion';

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

  var $readinessAccordions = document.querySelectorAll('[data-module="readiness-accordion"]')

  if ($readinessAccordions) {
    $readinessAccordions.forEach($accordion => new ReadinessAccordion($accordion).init())
  }
});


// Countdown Timer
const second = 1000,
  minute = second * 60,
  hour = minute * 60,
  day = hour * 24;

let countDown = new Date('Jan 01, 2021 00:00:00').getTime(),
  x = setInterval(function() {    
    let now = new Date().getTime(),
      distance = countDown - now;
    document.getElementById('countdown').innerHTML = `${Math.floor(distance / (day))} days`
    if (distance < 0) {
      clearInterval(x);
      document.getElementById('countdown').innerHTML = '0 days'
    }
  }, 0)


// The expanded state of individual instances of the accordion component persists across page loads using sessionStorage.
// These will be removed from the session storage so the accordions will collapse rather than stay open.
// We want to keep session storage on the readiness theme pages to prevent accordions closing on a page refresh 
if (!window.location.pathname.includes('/transition-readiness-detail/')) {
  sessionStorage.clear();
}
