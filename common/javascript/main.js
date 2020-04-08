import govukFrontend from 'govuk-frontend/govuk/all';

import missedMilestonesChart from './missed-milestones';
import upcomingMilestoneChart from './upcoming-milestones';

window.TRANSITIONDELIVERYDASHBOARD = {
  missedMilestonesChart,
  upcomingMilestoneChart
};

document.addEventListener('DOMContentLoaded', function() {
  govukFrontend.initAll();
});

// The expanded state of individual instances of the accordion component persists across page loads using sessionStorage.
// These will be removed from the session storage so the accordions will collapse rather than stay open.
sessionStorage.clear();

// Removes the plus icon from the accordion if the table is empty 
const accordionTable = document.getElementById('accordion-table');
const milestoneTable = document.getElementsByClassName('table-content');

let count = 0;

for (var i = 0; i < milestoneTable.length; i++) {
  if (milestoneTable[i].rows.length == 0) {
    const accordionHeader = milestoneTable[i].parentElement.parentElement.querySelector('.govuk-accordion__section-heading');
    accordionHeader.classList.add('remove-icon')
    count++;
  }
}
if (count == milestoneTable.length) {
  accordionTable.classList.add('remove-open-all')
}





